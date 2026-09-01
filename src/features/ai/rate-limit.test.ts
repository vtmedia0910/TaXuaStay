import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAIProviderConfig } from "@/features/ai/config";
import { budgetState, UpstashAIControlStore } from "@/features/ai/control-store";
import { getAssistantClientIdentity, getAssistantSessionIdentity, hashAssistantIdentity } from "@/features/ai/rate-limit";

function readyConfig() {
  return getAIProviderConfig({
    AI_ENABLED: "true",
    AI_PROVIDER: "openai",
    AI_MODEL: "gpt-5-mini-2025-08-07",
    AI_API_KEY: "test-only",
    AI_IDENTITY_HASH_SALT: "test-salt",
    UPSTASH_REDIS_REST_URL: "https://example.invalid",
    UPSTASH_REDIS_REST_TOKEN: "test-only",
  } as unknown as NodeJS.ProcessEnv);
}

class FakeRedis {
  readonly eval = vi.fn(async () => this.responses.shift() ?? ["ok"]);
  readonly hgetall = vi.fn(async (key: string) => key.includes("provider-health")
    ? { status: "connected", checked_at: "2026-09-02T00:00:00.000Z", latency_ms: "20" }
    : { requests: "2", cost_micros: "1250", success: "1", failure: "1" });
  readonly ping = vi.fn(async () => "PONG");

  constructor(private readonly responses: unknown[] = []) {}
}

describe("Phase 13A distributed rate and budget controls", () => {
  it("derives deterministic HMAC identities without retaining the raw IP or session", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    const identity = getAssistantClientIdentity(headers, "private-salt");
    expect(identity).toMatch(/^[a-f0-9]{32}$/);
    expect(identity).not.toContain("203.0.113.10");
    expect(identity).toBe(hashAssistantIdentity("203.0.113.10", "private-salt"));
    expect(getAssistantSessionIdentity("session_identifier_123", "private-salt")).not.toContain("session_identifier_123");
    expect(hashAssistantIdentity("same", "salt-a")).not.toBe(hashAssistantIdentity("same", "salt-b"));
  });

  it.each(["rate_ip", "rate_session", "rate_global"] as const)("fails closed for %s and returns the shared TTL", async (reason) => {
    const redis = new FakeRedis([[reason, 12_500]]);
    const store = new UpstashAIControlStore(redis as never, readyConfig());
    await expect(store.admit({ ipHash: "ip", sessionHash: "session", now: 10_000 })).resolves.toEqual({
      allowed: false,
      reason,
      retryAfterSeconds: 13,
      reservationMicros: 0,
    });
  });

  it.each(["daily_requests", "budget_daily", "budget_monthly"] as const)("blocks shared ceiling %s before provider use", async (reason) => {
    const redis = new FakeRedis([[reason, 0]]);
    const store = new UpstashAIControlStore(redis as never, readyConfig());
    await expect(store.admit({ ipHash: "ip", now: 10_000 })).resolves.toMatchObject({ allowed: false, reason });
  });

  it("uses one atomic Lua admission across IP, session, global and budget dimensions", async () => {
    const redis = new FakeRedis([["ok", 1, 1, 1, 50_000, 50_000]]);
    const store = new UpstashAIControlStore(redis as never, readyConfig());
    await expect(store.admit({ ipHash: "ip-hash", sessionHash: "session-hash", now: 10_000 })).resolves.toMatchObject({ allowed: true, reservationMicros: 50_000 });
    expect(redis.eval).toHaveBeenCalledTimes(1);
    const [, keys, args] = redis.eval.mock.calls[0] as unknown as [string, string[], string[]];
    expect(keys).toEqual(expect.arrayContaining([
      expect.stringContaining("rate:global"),
      expect.stringContaining("rate:ip:ip-hash"),
      expect.stringContaining("rate:session:session-hash"),
      expect.stringContaining(":day:"),
      expect.stringContaining(":month:"),
    ]));
    expect(Number(args[7])).toBeGreaterThan(1_000);
  });

  it("moves to a new window key after TTL/reset", async () => {
    const redis = new FakeRedis([["ok"], ["ok"]]);
    const store = new UpstashAIControlStore(redis as never, readyConfig());
    await store.admit({ ipHash: "ip", now: 59_000 });
    await store.admit({ ipHash: "ip", now: 61_000 });
    const firstKeys = (redis.eval.mock.calls as unknown[][])[0]?.[1] as string[];
    const secondKeys = (redis.eval.mock.calls as unknown[][])[1]?.[1] as string[];
    expect(firstKeys[0]).not.toBe(secondKeys[0]);
  });

  it("reports only aggregate shared diagnostics", async () => {
    const redis = new FakeRedis();
    const store = new UpstashAIControlStore(redis as never, readyConfig());
    await expect(store.diagnostics(Date.parse("2026-09-02T00:00:00.000Z"))).resolves.toMatchObject({
      healthy: true,
      daily: { requests: 2, successes: 1, failures: 1, costMicros: 1250 },
      providerHealth: { status: "connected", latencyMs: 20 },
    });
  });

  it("classifies budget states deterministically", () => {
    expect(budgetState(1, 100)).toBe("normal");
    expect(budgetState(80, 100)).toBe("warning");
    expect(budgetState(100, 100)).toBe("exhausted");
  });
});
