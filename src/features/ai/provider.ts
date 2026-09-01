import "server-only";

import { AssistantError } from "@/features/ai/errors";
import { DeepSeekAdapter } from "@/features/ai/providers/deepseek";
import { GeminiAdapter } from "@/features/ai/providers/gemini";
import { OpenAIResponsesAdapter } from "@/features/ai/providers/openai";
import {
  getAIModelDefinition,
  getProviderCredential,
  isAIProviderId,
  isAISelectionActivatable,
} from "@/features/ai/providers/registry";
import { AIProviderAdapterError } from "@/features/ai/providers/shared";
import type {
  AIProviderAdapter,
  AIProviderHealthStatus,
  AIProviderRequest,
  AIProviderResponse,
} from "@/features/ai/types";

export { DeepSeekAdapter, GeminiAdapter, OpenAIResponsesAdapter };

class UnconfiguredAIProviderAdapter implements AIProviderAdapter {
  readonly configured = false;

  constructor(readonly provider: string, readonly model: string) {}

  async generate(_request: AIProviderRequest): Promise<AIProviderResponse> {
    void _request;
    throw new AssistantError("AI_NOT_CONFIGURED", 503);
  }
}

export function createAIProviderAdapter(
  selection: { provider: string; model: string },
  environment: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch,
): AIProviderAdapter {
  const { provider, model } = selection;
  const credential = getProviderCredential(provider, environment);
  if (!credential || !isAIProviderId(provider) || !isAISelectionActivatable(provider, model)) {
    return new UnconfiguredAIProviderAdapter(provider, model);
  }
  if (provider === "gemini") return new GeminiAdapter(model, credential, fetcher);
  if (provider === "openai") return new OpenAIResponsesAdapter(model, credential, fetcher);
  if (provider === "deepseek") return new DeepSeekAdapter(model, credential, fetcher);
  return new UnconfiguredAIProviderAdapter(provider, model);
}

export async function checkAIProviderHealth(adapter: AIProviderAdapter, timeoutMs: number) {
  if (!adapter.configured) {
    return { status: "BLOCKED" as AIProviderHealthStatus, latencyMs: null, usage: undefined };
  }
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await adapter.generate({
      systemPrompt: "Trả lời đúng chuỗi: CLARIFY: OK. Không gọi tool và không dùng dữ liệu khách hàng.",
      messages: [{ role: "user", content: "Health check" }],
      tools: [],
      toolResults: [],
      maxOutputCharacters: 16,
      maxOutputTokens: 32,
      signal: controller.signal,
    });
    if (response.type !== "final") throw new AssistantError("AI_RESPONSE_INVALID", 502);
    return {
      status: "CONNECTED" as AIProviderHealthStatus,
      latencyMs: Date.now() - startedAt,
      usage: response.usage,
    };
  } catch (error) {
    const status: AIProviderHealthStatus = error instanceof AIProviderAdapterError
      ? error.healthStatus
      : error instanceof AssistantError && error.code === "AI_TIMEOUT"
        ? "TIMEOUT"
        : "PROVIDER_ERROR";
    return { status, latencyMs: Date.now() - startedAt, usage: undefined };
  } finally {
    clearTimeout(timeout);
  }
}

export function providerSelectionSupported(provider: string, model: string) {
  return Boolean(getAIModelDefinition(provider, model) && isAISelectionActivatable(provider, model));
}
