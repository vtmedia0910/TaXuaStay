import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAIConfigurationError, getAIProviderConfig } from "@/features/ai/config";
import {
  DeepSeekAdapter,
  GeminiAdapter,
  OpenAIResponsesAdapter,
  checkAIProviderHealth,
  createAIProviderAdapter,
} from "@/features/ai/provider";
import { AI_PROVIDER_REGISTRY, SAFE_AI_PROVIDER_REGISTRY } from "@/features/ai/providers/registry";
import { ASSISTANT_TOOL_NAMES, createAssistantToolRegistry } from "@/features/ai/tools";
import type { AIProviderRequest } from "@/features/ai/types";

const selection = { provider: "openai", model: "gpt-5-mini-2025-08-07", enabled: true };
const completeEnv = {
  AI_ENABLED: "true",
  OPENAI_API_KEY: "test-key-never-log",
  GEMINI_API_KEY: "gemini-test-never-log",
  DEEPSEEK_API_KEY: "deepseek-test-never-log",
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

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Phase 13B provider registry and configuration", () => {
  afterEach(() => vi.restoreAllMocks());

  it("exposes only the controlled provider/model allow-list and no credential env names", () => {
    expect(AI_PROVIDER_REGISTRY.map((item) => item.id)).toEqual(["gemini", "openai", "deepseek"]);
    expect(AI_PROVIDER_REGISTRY.flatMap((item) => item.models.map((model) => model.id))).toEqual([
      "gemini-2.5-flash",
      "gpt-5-mini-2025-08-07",
      "deepseek-v4-flash",
    ]);
    expect(JSON.stringify(SAFE_AI_PROVIDER_REGISTRY)).not.toMatch(/API_KEY|credentialEnv|secret/i);
  });

  it("fails closed without an active runtime, with missing controls, and for unsupported selections", () => {
    expect(getAIProviderConfig(null, completeEnv)).toMatchObject({ status: "disabled", runtimeEnabled: false });
    expect(getAIProviderConfig(selection, { AI_ENABLED: "true" } as unknown as NodeJS.ProcessEnv)).toMatchObject({ status: "incomplete", credentialConfigured: false });
    expect(getAIProviderConfig({ provider: "other", model: "moving", enabled: true }, completeEnv)).toMatchObject({ status: "unsupported", adapterSupported: false });
    expect(createAIProviderAdapter({ provider: "other", model: "moving" }, completeEnv)).toMatchObject({ configured: false, provider: "other" });
    expect(getAIConfigurationError(getAIProviderConfig({ provider: "other", model: "moving", enabled: true }, completeEnv))).toBe("AI_PROVIDER_UNSUPPORTED");
    expect(getAIConfigurationError(getAIProviderConfig({ provider: "openai", model: "moving", enabled: true }, completeEnv))).toBe("AI_MODEL_UNSUPPORTED");
  });

  it("is ready only when the runtime, credential and shared controls all pass", () => {
    const config = getAIProviderConfig(selection, completeEnv);
    expect(config).toMatchObject({ status: "ready", provider: "openai", credentialConfigured: true, masterEnabled: true, runtimeEnabled: true });
    expect(JSON.stringify(config)).not.toContain("test-key-never-log");
  });

  it("keeps Preview disabled unless explicitly allowed and honors the hard kill switch", () => {
    expect(getAIProviderConfig(selection, { ...completeEnv, VERCEL_ENV: "preview" } as NodeJS.ProcessEnv)).toMatchObject({ status: "disabled", environmentAllowed: false });
    expect(getAIProviderConfig(selection, { ...completeEnv, AI_KILL_SWITCH: "true" } as NodeJS.ProcessEnv)).toMatchObject({ status: "disabled", killSwitch: true });
  });
});

describe("OpenAI Responses adapter", () => {
  it("keeps store=false, serial tool calling and normalized usage", async () => {
    const fetcher = vi.fn(async () => response({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "CLARIFY: OK" }] }], usage: { input_tokens: 12, output_tokens: 7 } }));
    const adapter = new OpenAIResponsesAdapter(selection.model, "secret-key", fetcher as typeof fetch);
    await expect(adapter.generate(request())).resolves.toMatchObject({ type: "final", kind: "clarification", text: "OK", usage: { inputTokens: 12, outputTokens: 7 } });
    const init = (fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ store: false, parallel_tool_calls: false, model: selection.model });
    expect(JSON.stringify(body)).not.toContain("secret-key");
  });

  it("normalizes tool calls and provider errors", async () => {
    const adapter = new OpenAIResponsesAdapter(selection.model, "key", vi.fn(async () => response({ status: "completed", output: [{ type: "function_call", call_id: "call-1", name: "get_price", arguments: "{\"room\":\"a\"}" }] })) as typeof fetch);
    await expect(adapter.generate(request())).resolves.toMatchObject({ type: "tool_calls", calls: [{ id: "call-1", name: "get_price", input: { room: "a" } }] });
    const invalid = new OpenAIResponsesAdapter(selection.model, "key", vi.fn(async () => response({}, 401)) as typeof fetch);
    await expect(invalid.generate(request())).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR", healthStatus: "INVALID_CREDENTIAL" });
  });
});

describe("Gemini adapter", () => {
  it("uses the approved Google endpoint, bounded no-thinking policy, function declarations and normalized usage", async () => {
    const fetcher = vi.fn(async () => response({ candidates: [{ content: { parts: [{ functionCall: { name: "get_availability", args: { rooms: 1 } } }] } }], usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 4 } }));
    const adapter = new GeminiAdapter("gemini-2.5-flash", "gemini-secret", fetcher as typeof fetch);
    await expect(adapter.generate(request({ tools: [{ name: "get_availability", description: "safe", inputSchema: { type: "object" } }] }))).resolves.toMatchObject({ type: "tool_calls", calls: [{ name: "get_availability", input: { rooms: 1 } }], usage: { inputTokens: 20, outputTokens: 4 } });
    expect(String((fetcher.mock.calls as unknown[][])[0]?.[0])).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
    const init = (fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("gemini-secret");
    const body = JSON.parse(String(init.body));
    expect(body.tools[0].functionDeclarations[0].name).toBe("get_availability");
    expect(body.tools[0].functionDeclarations[0].parametersJsonSchema).toEqual({ type: "object" });
    expect(body.tools[0].functionDeclarations[0]).not.toHaveProperty("parameters");
    expect(body.generationConfig).toEqual({
      maxOutputTokens: 800,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it("serializes all nine application tool schemas through parametersJsonSchema", async () => {
    const fetcher = vi.fn(async () => response({
      candidates: [{ content: { parts: [{ text: "CLARIFY: OK" }] } }],
    }));
    const definitions = [...createAssistantToolRegistry().values()].map((tool) => tool.definition);
    const adapter = new GeminiAdapter("gemini-2.5-flash", "key", fetcher as typeof fetch);
    await expect(adapter.generate(request({ tools: definitions }))).resolves.toMatchObject({
      type: "final",
      kind: "clarification",
    });
    const body = JSON.parse(String(((fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit).body));
    const declarations = body.tools[0].functionDeclarations as Array<Record<string, unknown>>;
    expect(definitions.map((tool) => tool.name)).toEqual(ASSISTANT_TOOL_NAMES);
    expect(declarations).toHaveLength(9);
    expect(declarations.map((tool) => tool.name)).toEqual(ASSISTANT_TOOL_NAMES);
    for (const declaration of declarations) {
      expect(declaration).toHaveProperty("parametersJsonSchema");
      expect(declaration).not.toHaveProperty("parameters");
      expect(() => JSON.stringify(declaration.parametersJsonSchema)).not.toThrow();
    }
  });

  it("continues a Gemini tool result with the matching function call context", async () => {
    const fetcher = vi.fn(async () => response({
      candidates: [{ content: { parts: [{ text: "Dữ liệu công khai đã được kiểm tra." }] } }],
      usageMetadata: { promptTokenCount: 14, candidatesTokenCount: 5 },
    }));
    const adapter = new GeminiAdapter("gemini-2.5-flash", "key", fetcher as typeof fetch);
    await expect(adapter.generate(request({
      toolResults: [{
        callId: "gemini-call-1",
        toolName: "get_availability",
        input: { rooms: 1 },
        result: { status: "known", data: { available: true }, source: { label: "Tình trạng phòng" } },
      }],
    }))).resolves.toMatchObject({ type: "final", kind: "tool_based" });
    const body = JSON.parse(String(((fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit).body));
    expect(body.contents.at(-2)).toEqual({
      role: "model",
      parts: [{ functionCall: { id: "gemini-call-1", name: "get_availability", args: { rooms: 1 } } }],
    });
    expect(body.contents.at(-1)).toEqual({
      role: "user",
      parts: [{ functionResponse: {
        id: "gemini-call-1",
        name: "get_availability",
        response: { result: { status: "known", data: { available: true }, source: { label: "Tình trạng phòng" } } },
      } }],
    });
  });

  it("normalizes final text, accounts for any reported thinking usage and rejects empty or malformed responses", async () => {
    const adapter = new GeminiAdapter("gemini-2.5-flash", "key", vi.fn(async () => response({ candidates: [{ content: { parts: [{ text: "CLARIFY: Bạn đi ngày nào?" }] } }] })) as typeof fetch);
    await expect(adapter.generate(request())).resolves.toMatchObject({ type: "final", kind: "clarification", text: "Bạn đi ngày nào?" });
    const withUsage = new GeminiAdapter("gemini-2.5-flash", "key", vi.fn(async () => response({
      candidates: [{ content: { parts: [{ text: "CLARIFY: OK" }] } }],
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 2, thoughtsTokenCount: 3 },
    })) as typeof fetch);
    await expect(withUsage.generate(request())).resolves.toMatchObject({ usage: { inputTokens: 8, outputTokens: 5 } });
    const empty = new GeminiAdapter("gemini-2.5-flash", "key", vi.fn(async () => response({ candidates: [{ content: { parts: [{ text: "" }] } }] })) as typeof fetch);
    await expect(empty.generate(request())).rejects.toMatchObject({
      code: "AI_RESPONSE_INVALID",
      healthStatus: "PROVIDER_ERROR",
      diagnosticStatus: "MALFORMED_RESPONSE",
    });
    const malformed = new GeminiAdapter("gemini-2.5-flash", "key", vi.fn(async () => response({ candidates: [] })) as typeof fetch);
    await expect(malformed.generate(request())).rejects.toMatchObject({ code: "AI_RESPONSE_INVALID" });
  });

  it("runs a deterministic minimal health check with thinking disabled", async () => {
    const fetcher = vi.fn(async () => response({
      candidates: [{ content: { parts: [{ text: "CLARIFY: OK" }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 3 },
    }));
    const result = await checkAIProviderHealth(
      new GeminiAdapter("gemini-2.5-flash", "key", fetcher as typeof fetch),
      1_000,
    );
    expect(result).toMatchObject({ status: "CONNECTED", usage: { inputTokens: 10, outputTokens: 3 } });
    const body = JSON.parse(String(((fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit).body));
    expect(body.generationConfig).toEqual({
      maxOutputTokens: 32,
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(body.tools).toBeUndefined();
  });

  it("fails closed when a Gemini model has no reviewed thinking policy", async () => {
    const fetcher = vi.fn();
    const adapter = new GeminiAdapter("gemini-future-unreviewed", "key", fetcher as typeof fetch);
    await expect(adapter.generate(request())).rejects.toMatchObject({ healthStatus: "UNSUPPORTED_MODEL" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [400, "AI_PROVIDER_ERROR", "PROVIDER_ERROR", "INVALID_REQUEST"],
    [401, "AI_PROVIDER_ERROR", "INVALID_CREDENTIAL", "INVALID_CREDENTIAL"],
    [403, "AI_PROVIDER_ERROR", "INVALID_CREDENTIAL", "INVALID_CREDENTIAL"],
    [404, "AI_PROVIDER_ERROR", "UNSUPPORTED_MODEL", "UNSUPPORTED_MODEL"],
    [429, "AI_PROVIDER_UNAVAILABLE", "UNAVAILABLE", "RATE_LIMITED"],
    [500, "AI_PROVIDER_UNAVAILABLE", "UNAVAILABLE", "PROVIDER_UNAVAILABLE"],
    [503, "AI_PROVIDER_UNAVAILABLE", "UNAVAILABLE", "PROVIDER_UNAVAILABLE"],
  ] as const)("maps Gemini HTTP %s to sanitized %s / %s / %s", async (status, code, healthStatus, diagnosticStatus) => {
    const adapter = new GeminiAdapter(
      "gemini-2.5-flash",
      "key",
      vi.fn(async () => response({ sensitive_provider_detail: "never expose" }, status)) as typeof fetch,
    );
    await expect(adapter.generate(request())).rejects.toMatchObject({ code, healthStatus, diagnosticStatus });
  });
});

describe("DeepSeek adapter", () => {
  it("uses the fixed endpoint and safely supports the normalized tool loop", async () => {
    const fetcher = vi.fn(async () => response({ choices: [{ message: { content: null, tool_calls: [{ id: "d1", type: "function", function: { name: "get_price", arguments: "{\"room\":\"a\"}" } }] } }], usage: { prompt_tokens: 9, completion_tokens: 3 } }));
    const adapter = new DeepSeekAdapter("deepseek-v4-flash", "deepseek-secret", fetcher as typeof fetch);
    await expect(adapter.generate(request({ tools: [{ name: "get_price", description: "safe", inputSchema: { type: "object" } }] }))).resolves.toMatchObject({ type: "tool_calls", calls: [{ id: "d1", name: "get_price", input: { room: "a" } }], usage: { inputTokens: 9, outputTokens: 3 } });
    expect(String((fetcher.mock.calls as unknown[][])[0]?.[0])).toBe("https://api.deepseek.com/chat/completions");
    const body = JSON.parse(String(((fetcher.mock.calls as unknown[][])[0]?.[1] as RequestInit).body));
    expect(body).toMatchObject({ model: "deepseek-v4-flash", tool_choice: "auto", stream: false });
    expect(JSON.stringify(body)).not.toContain("deepseek-secret");
  });

  it.each([[429, "UNAVAILABLE"], [500, "UNAVAILABLE"], [401, "INVALID_CREDENTIAL"], [404, "UNSUPPORTED_MODEL"]] as const)("maps HTTP %s to %s without raw errors", async (status, healthStatus) => {
    const adapter = new DeepSeekAdapter("deepseek-v4-flash", "key", vi.fn(async () => response({ private_error: "never expose" }, status)) as typeof fetch);
    await expect(adapter.generate(request())).rejects.toMatchObject({ healthStatus });
  });
});

describe("multi-provider failure normalization", () => {
  it.each([
    ["Gemini", () => new GeminiAdapter("gemini-2.5-flash", "key", vi.fn(async () => response({}, 429)) as typeof fetch)],
    ["OpenAI", () => new OpenAIResponsesAdapter("gpt-5-mini-2025-08-07", "key", vi.fn(async () => response({}, 500)) as typeof fetch)],
    ["DeepSeek", () => new DeepSeekAdapter("deepseek-v4-flash", "key", vi.fn(async () => { throw new DOMException("timeout", "AbortError"); }) as typeof fetch)],
  ])("normalizes %s 429/5xx/timeout without raw provider payloads", async (_label, factory) => {
    await expect(factory().generate(request())).rejects.toMatchObject({
      code: _label === "DeepSeek" ? "AI_TIMEOUT" : "AI_PROVIDER_UNAVAILABLE",
    });
  });
});
