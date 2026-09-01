import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { consumeAssistantRateLimit, getAssistantClientIdentity, resetAssistantRateLimitsForTests } from "@/features/ai/rate-limit";

describe("Phase 13 public rate limiting", () => {
  beforeEach(() => resetAssistantRateLimitsForTests());

  it("hashes the client identity and limits per IP", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" });
    const identity = getAssistantClientIdentity(headers);
    expect(identity).toMatch(/^[a-f0-9]{24}$/);
    expect(identity).not.toContain("203.0.113.10");
    for (let index = 0; index < 8; index += 1) expect(consumeAssistantRateLimit({ ipHash: identity, now: 10_000 }).allowed).toBe(true);
    expect(consumeAssistantRateLimit({ ipHash: identity, now: 10_000 }).allowed).toBe(false);
  });

  it("limits a session across changing client identities", () => {
    for (let index = 0; index < 10; index += 1) expect(consumeAssistantRateLimit({ ipHash: `ip-${index}`, sessionId: "session_identifier_123", now: 20_000 }).allowed).toBe(true);
    expect(consumeAssistantRateLimit({ ipHash: "ip-final", sessionId: "session_identifier_123", now: 20_000 }).allowed).toBe(false);
  });
});
