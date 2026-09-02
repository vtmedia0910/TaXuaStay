import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { Redis } from "@upstash/redis";
import { UpstashAIConversationStore } from "@/features/ai-conversations/upstash-store";

class MockRedis {
  values = new Map<string, unknown>();
  hashes = new Map<string, Record<string, number>>();
  zsets = new Map<string, Map<string, number>>();
  ttlWrites: Array<{ key: string; seconds: number }> = [];

  async get<T>(key: string) { return (this.values.get(key) ?? null) as T | null; }
  set(key: string, value: unknown, options?: { ex?: number }) { this.values.set(key, structuredClone(value)); if (options?.ex) this.ttlWrites.push({ key, seconds: options.ex }); return this; }
  del(...keys: string[]) { for (const key of keys) { this.values.delete(key); this.hashes.delete(key); } return this; }
  zadd(key: string, input: { score: number; member: string }) { const set = this.zsets.get(key) ?? new Map(); set.set(input.member, input.score); this.zsets.set(key, set); return this; }
  zrem(key: string, ...members: string[]) { const set = this.zsets.get(key); for (const member of members) set?.delete(member); return this; }
  async zrange<T extends unknown[]>(key: string, min: number | string, max: number | string, options?: { rev?: boolean; byScore?: boolean; offset?: number; count?: number }) {
    const entries = [...(this.zsets.get(key)?.entries() ?? [])].sort((a, b) => a[1] - b[1]);
    if (options?.rev) entries.reverse();
    let selected: Array<[string, number]>;
    if (options?.byScore) {
      const low = min === "-inf" ? -Infinity : Number(min);
      const high = max === "+inf" ? Infinity : Number(max);
      selected = entries.filter(([, score]) => score >= low && score <= high).slice(options.offset ?? 0, (options.offset ?? 0) + (options.count ?? entries.length));
    } else selected = entries.slice(Number(min), Number(max) + 1);
    return selected.map(([id]) => id) as T;
  }
  async zcard(key: string) { return this.zsets.get(key)?.size ?? 0; }
  async hgetall<T>(key: string) { return (this.hashes.get(key) ?? null) as T | null; }
  hincrby(key: string, field: string, increment: number) { const hash = this.hashes.get(key) ?? {}; hash[field] = (hash[field] ?? 0) + increment; this.hashes.set(key, hash); return this; }
  expire(key: string, seconds: number) { this.ttlWrites.push({ key, seconds }); return this; }
  multi() { return this; }
  async exec() { return []; }
}

function turn(session: string, date: string, result: "success" | "error" = "success") {
  return {
    sessionHash: session.repeat(64), entryPoint: "assistant_page" as const, customerMessage: "Câu hỏi đã redaction",
    assistantAnswer: "Câu trả lời đã redaction", provider: "gemini", model: "gemini-2.5-flash", runtimeRevision: 2,
    profileRevision: 4, toolNames: ["get_price", "get_price", "bad payload!"], inputTokens: 20, outputTokens: 10,
    estimatedCostUsd: 0.0001, latencyMs: 321, result, errorCode: result === "error" ? "AI_PROVIDER_ERROR" as const : null,
    now: new Date(date),
  };
}

describe("Upstash AI conversation store with mock Redis", () => {
  it("defaults logging off, stores bounded safe metadata, paginates and refreshes TTL", async () => {
    const redis = new MockRedis();
    const store = new UpstashAIConversationStore(redis as unknown as Redis);
    expect(await store.getRetentionConfig()).toMatchObject({ loggingEnabled: false, retentionDays: 30 });
    await store.updateRetentionConfig({ loggingEnabled: true, retentionDays: 7 });
    expect(await store.getRetentionConfig()).toMatchObject({ loggingEnabled: true, retentionDays: 7, updatedBy: "admin" });

    const id = await store.appendTurn(turn("a", "2026-09-02T00:00:00.000Z"), 7);
    await store.appendTurn(turn("a", "2026-09-03T00:00:00.000Z", "error"), 7);
    const conversation = await store.getConversation(id);
    expect(conversation?.meta).toMatchObject({ messageCount: 4, userMessageCount: 2, assistantMessageCount: 2, status: "error", lastErrorCode: "AI_PROVIDER_ERROR" });
    expect(conversation?.messages.at(-1)?.toolNames).toEqual(["get_price"]);
    expect(JSON.stringify(conversation)).not.toContain("sessionHash");
    expect(redis.ttlWrites.filter((item) => item.key.includes(id) && item.seconds === 604_800).length).toBeGreaterThanOrEqual(4);
    await store.appendTurn(turn("f", "2026-09-04T00:00:00.000Z"), 7);
    const firstPage = await store.listConversations({ limit: 1 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).not.toBeNull();
    expect((await store.listConversations({ limit: 1, cursor: firstPage.nextCursor ?? undefined })).items).toHaveLength(1);
    expect((await store.getSummary(new Date("2026-09-03T12:00:00.000Z"))).assistantErrorsToday).toBe(1);
  });

  it("supports bounded idempotent deletion, cutoff cleanup and delete all without key scans", async () => {
    const redis = new MockRedis();
    const store = new UpstashAIConversationStore(redis as unknown as Redis);
    const oldId = await store.appendTurn(turn("b", "2026-08-01T00:00:00.000Z"), 30);
    const newId = await store.appendTurn(turn("c", "2026-09-01T00:00:00.000Z"), 30);
    const cleanup = await store.deleteBefore(new Date("2026-08-15T00:00:00.000Z"));
    expect(cleanup).toMatchObject({ requested: 1, successCount: 1, failedCount: 0 });
    expect(await store.getConversation(oldId)).toBeNull();
    expect(await store.getConversation(newId)).not.toBeNull();
    await expect(store.deleteConversation(oldId)).resolves.toMatchObject({ requested: 1, successCount: 1, failedCount: 0 });
    await expect(store.deleteAll()).resolves.toMatchObject({ requested: 1, successCount: 1, failedCount: 0 });
    expect((await store.listConversations({})).items).toHaveLength(0);
  });

  it("applies a lower retention to existing data and removes over-age records", async () => {
    const redis = new MockRedis();
    const store = new UpstashAIConversationStore(redis as unknown as Redis);
    const oldId = await store.appendTurn(turn("d", "2026-08-01T00:00:00.000Z"), 90);
    const recentId = await store.appendTurn(turn("e", "2026-09-28T00:00:00.000Z"), 90);
    const result = await store.applyRetentionToExisting(7, new Date("2026-10-01T00:00:00.000Z"));
    expect(result.successCount).toBe(1);
    expect(await store.getConversation(oldId)).toBeNull();
    expect((await store.getConversation(recentId))?.meta.retentionExpiresAt).toBe("2026-10-05T00:00:00.000Z");
  });
});
