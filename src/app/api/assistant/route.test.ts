import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  admit: vi.fn(),
  recordBlocked: vi.fn(),
  finalize: vi.fn(),
  diagnostics: vi.fn(),
  recordProviderHealth: vi.fn(),
  runAssistant: vi.fn(),
  getActiveAIRuntime: vi.fn(),
}));

vi.mock("@/features/ai/control-store", () => ({
  createAIControlStore: () => ({
    admit: mocks.admit,
    recordBlocked: mocks.recordBlocked,
    finalize: mocks.finalize,
    diagnostics: mocks.diagnostics,
    recordProviderHealth: mocks.recordProviderHealth,
  }),
}));
vi.mock("@/features/ai/provider", () => ({ createAIProviderAdapter: () => ({ configured: true }) }));
vi.mock("@/features/ai/engine", () => ({ runAssistant: mocks.runAssistant }));
vi.mock("@/features/ai/runtime/data", () => ({ getActiveAIRuntime: mocks.getActiveAIRuntime }));

import { POST } from "@/app/api/assistant/route";
import { AssistantError } from "@/features/ai/errors";
import { getAIProviderConfig } from "@/features/ai/config";

const validBody = { message: "Gợi ý phòng cho hai người", history: [], sessionId: "session_identifier_123" };

function request(body: unknown = validBody, headers?: HeadersInit) {
  return new Request("https://example.test/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10", ...headers },
    body: JSON.stringify(body),
  });
}

describe("Phase 13A public assistant API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_ENABLED", "true");
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("AI_IDENTITY_HASH_SALT", "test-salt");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    mocks.admit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0, reservationMicros: 50_000 });
    mocks.finalize.mockResolvedValue(undefined);
    mocks.recordBlocked.mockResolvedValue(undefined);
    mocks.runAssistant.mockResolvedValue({ answer: "Kết quả an toàn", sources: [], usage: { inputTokens: 10, outputTokens: 5 }, toolCalls: 0 });
    mocks.getActiveAIRuntime.mockResolvedValue({
      runtime: { provider: "openai", model: "gpt-5-mini-2025-08-07", enabled: true, runtimeRevision: 1, profileRevision: 1 },
      config: getAIProviderConfig({ provider: "openai", model: "gpt-5-mini-2025-08-07", enabled: true }),
      compiledPrompt: "safe compiled prompt",
    });
  });

  it("returns 200 with private no-store headers and shared accounting", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    await expect(response.json()).resolves.toMatchObject({ answer: "Kết quả an toàn" });
    expect(mocks.admit).toHaveBeenCalledTimes(1);
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ ok: true, reservationMicros: 50_000 }));
  });

  it.each([
    [{ message: "", history: [] }, 400],
    [{ message: "ok", history: [{ role: "system", content: "inject" }] }, 400],
  ] as const)("rejects malformed public input", async (body, status) => {
    expect((await POST(request(body))).status).toBe(status);
    expect(mocks.runAssistant).not.toHaveBeenCalled();
  });

  it("rejects oversized requests before parsing", async () => {
    const response = await POST(request(validBody, { "content-length": "20000" }));
    expect(response.status).toBe(413);
    expect(mocks.admit).not.toHaveBeenCalled();
  });

  it("returns 429 and Retry-After for a shared rate denial", async () => {
    mocks.admit.mockResolvedValue({ allowed: false, reason: "rate_ip", retryAfterSeconds: 21, reservationMicros: 0 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("21");
    await expect(response.json()).resolves.toMatchObject({ error: { code: "AI_RATE_LIMITED" } });
    expect(mocks.runAssistant).not.toHaveBeenCalled();
  });

  it("blocks exhausted budgets before a billable provider call", async () => {
    mocks.admit.mockResolvedValue({ allowed: false, reason: "budget_daily", retryAfterSeconds: 0, reservationMicros: 0 });
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "AI_BUDGET_EXHAUSTED" } });
    expect(mocks.runAssistant).not.toHaveBeenCalled();
  });

  it.each([["AI_TIMEOUT", 504], ["AI_PROVIDER_UNAVAILABLE", 503]] as const)("sanitizes %s failures", async (code, status) => {
    mocks.runAssistant.mockRejectedValue(new AssistantError(code, status));
    const response = await POST(request());
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
    expect(mocks.finalize).toHaveBeenCalledWith(expect.objectContaining({ ok: false, actualCostMicros: null }));
  });

  it("honors the server-side kill switch before shared admission", async () => {
    vi.stubEnv("AI_KILL_SWITCH", "true");
    mocks.getActiveAIRuntime.mockResolvedValue({
      runtime: { provider: "openai", model: "gpt-5-mini-2025-08-07", enabled: true },
      config: getAIProviderConfig({ provider: "openai", model: "gpt-5-mini-2025-08-07", enabled: true }),
      compiledPrompt: "safe compiled prompt",
    });
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "AI_DISABLED" } });
    expect(mocks.admit).not.toHaveBeenCalled();
    expect(mocks.runAssistant).not.toHaveBeenCalled();
  });
});
