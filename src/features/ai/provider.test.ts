import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAIProviderConfig } from "@/features/ai/config";
import { AssistantError } from "@/features/ai/errors";
import { createAIProviderAdapter, OpenAIResponsesAdapter } from "@/features/ai/provider";
import type { AIProviderRequest } from "@/features/ai/types";

const completeEnv = {
  AI_ENABLED: "true",
  AI_PROVIDER: "openai",
  AI_MODEL: "gpt-5-mini-2025-08-07",
  AI_API_KEY: "test-key-never-log",
  AI_IDENTITY_HASH_SALT: "test-salt",
  UPSTASH_REDIS_REST_URL: "https://example.invalid",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
} as unknown as NodeJS.ProcessEnv;

function request(overrides: Partial<AIProviderRequest> = {}): AIProviderRequest {
  return {
    systemPrompt: "Safe system prompt",
    messages: [{ role: "user", content: "Xin chào" }],
    tools: [],
    toolResults: [],
    maxOutputCharacters: 3200,
    maxOutputTokens: 800,
    safetyIdentifier: "privacy-safe-hash",
    signal: new AbortController().signal,
    ...overrides,
  };
}

function providerResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Phase 13A provider configuration", () => {
  afterEach(() => vi.restoreAllMocks());

  it("covers disabled, unconfigured and incomplete states", () => {
    expect(getAIProviderConfig({} as NodeJS.ProcessEnv).status).toBe("disabled");
    expect(getAIProviderConfig({ AI_ENABLED: "true" } as unknown as NodeJS.ProcessEnv).status).toBe("unconfigured");
    expect(getAIProviderConfig({ AI_ENABLED: "true", AI_PROVIDER: "openai" } as unknown as NodeJS.ProcessEnv).status).toBe("incomplete");
  });

  it("fails closed for unsupported provider and model without fallback", () => {
    expect(getAIProviderConfig({ ...completeEnv, AI_PROVIDER: "other" } as NodeJS.ProcessEnv)).toMatchObject({ status: "unsupported", adapterSupported: false });
    expect(getAIProviderConfig({ ...completeEnv, AI_MODEL: "moving-alias" } as NodeJS.ProcessEnv)).toMatchObject({ status: "unsupported", adapterSupported: false });
    expect(createAIProviderAdapter({ ...completeEnv, AI_PROVIDER: "other" } as NodeJS.ProcessEnv)).toMatchObject({ configured: false, provider: "other" });
  });

  it("is ready only with the exact allow-listed snapshot and shared controls", () => {
    const config = getAIProviderConfig(completeEnv);
    expect(config).toMatchObject({ status: "ready", provider: "openai", model: "gpt-5-mini-2025-08-07", credentialConfigured: true });
    expect(JSON.stringify(config)).not.toContain("test-key-never-log");
  });

  it("keeps Preview disabled unless explicitly allowed and honors the kill switch", () => {
    expect(getAIProviderConfig({ ...completeEnv, VERCEL_ENV: "preview" } as NodeJS.ProcessEnv)).toMatchObject({ status: "disabled", environmentAllowed: false });
    expect(getAIProviderConfig({ ...completeEnv, AI_KILL_SWITCH: "true" } as NodeJS.ProcessEnv)).toMatchObject({ status: "disabled", killSwitch: true });
  });
});

describe("OpenAI Responses adapter", () => {
  it("normalizes a concise response and usage without storing provider state", async () => {
    const fetcher = vi.fn(async () => providerResponse({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "CLARIFY: Xin chào từ Tà Xùa Trip." }] }],
      usage: { input_tokens: 12, output_tokens: 7 },
    }));
    const adapter = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "secret-key", fetcher as typeof fetch);
    await expect(adapter.generate(request())).resolves.toEqual({
      type: "final",
      kind: "clarification",
      text: "Xin chào từ Tà Xùa Trip.",
      usage: { inputTokens: 12, outputTokens: 7 },
    });
    const init = (fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: "gpt-5-mini-2025-08-07", store: false, max_output_tokens: 800, safety_identifier: "privacy-safe-hash" });
    expect(body).not.toHaveProperty("api_key");
  });

  it("normalizes tool calls and reconstructs the bounded multi-tool context", async () => {
    const fetcher = vi.fn(async () => providerResponse({
      status: "completed",
      output: [{ type: "function_call", call_id: "call-1", name: "get_price", arguments: "{\"property_slug\":\"a\"}" }],
      usage: { input_tokens: 20, output_tokens: 4 },
    }));
    const adapter = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "secret-key", fetcher as typeof fetch);
    await expect(adapter.generate(request({
      tools: [{ name: "get_price", description: "Safe", inputSchema: { type: "object" } }],
      toolResults: [{ callId: "old", toolName: "get_room_options", input: { guests: 2 }, result: { status: "known", data: { count: 1 }, source: { label: "Nguồn" } } }],
    }))).resolves.toMatchObject({ type: "tool_calls", calls: [{ id: "call-1", name: "get_price", input: { property_slug: "a" } }] });
    const body = JSON.parse(String(((fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit).body));
    expect(body.input).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "function_call", call_id: "old" }),
      expect.objectContaining({ type: "function_call_output", call_id: "old" }),
    ]));
    expect(body.parallel_tool_calls).toBe(false);
  });

  it.each([[429, "AI_PROVIDER_UNAVAILABLE"], [500, "AI_PROVIDER_ERROR"], [401, "AI_PROVIDER_ERROR"]] as const)("maps HTTP %s to a sanitized error", async (status, code) => {
    const adapter = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "invalid", vi.fn(async () => providerResponse({ private_error: "never expose" }, status)) as typeof fetch);
    await expect(adapter.generate(request())).rejects.toMatchObject({ code });
  });

  it("maps aborts and transport failures without leaking upstream details", async () => {
    const aborted = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "key", vi.fn(async () => { throw new DOMException("secret", "AbortError"); }) as typeof fetch);
    await expect(aborted.generate(request())).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    const offline = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "key", vi.fn(async () => { throw new Error("private upstream"); }) as typeof fetch);
    await expect(offline.generate(request())).rejects.toMatchObject({ code: "AI_PROVIDER_UNAVAILABLE" });
  });

  it("rejects malformed answers and malformed tool arguments", async () => {
    const malformedAnswer = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "key", vi.fn(async () => providerResponse({ status: "completed", output: [] })) as typeof fetch);
    await expect(malformedAnswer.generate(request())).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
    const malformedTool = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "key", vi.fn(async () => providerResponse({ status: "completed", output: [{ type: "function_call", call_id: "x", name: "get_price", arguments: "{" }] })) as typeof fetch);
    await expect(malformedTool.generate(request())).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
  });

  it("rejects an ungrounded business answer that did not call an approved tool", async () => {
    const adapter = new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "key", vi.fn(async () => providerResponse({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: "Phòng còn và giá là 500.000đ." }] }],
    })) as typeof fetch);
    await expect(adapter.generate(request())).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
  });

  it("uses the public error taxonomy", () => {
    expect(new AssistantError("AI_TOOL_ERROR", 503).message).toBe("Mình chưa xác nhận được thông tin này từ hệ thống lúc này.");
  });
});
