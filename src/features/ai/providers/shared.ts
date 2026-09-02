import "server-only";

import { AssistantError } from "@/features/ai/errors";
import type { AIProviderHealthStatus, AIProviderResponse, AIProviderUsage } from "@/features/ai/types";

export type AIProviderDiagnosticStatus =
  | "INVALID_REQUEST"
  | "INVALID_CREDENTIAL"
  | "UNSUPPORTED_MODEL"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "MALFORMED_RESPONSE";

function defaultDiagnosticStatus(healthStatus: AIProviderHealthStatus): AIProviderDiagnosticStatus {
  if (healthStatus === "INVALID_CREDENTIAL") return "INVALID_CREDENTIAL";
  if (healthStatus === "UNSUPPORTED_MODEL") return "UNSUPPORTED_MODEL";
  if (healthStatus === "TIMEOUT") return "TIMEOUT";
  if (healthStatus === "UNAVAILABLE") return "PROVIDER_UNAVAILABLE";
  return "MALFORMED_RESPONSE";
}

export class AIProviderAdapterError extends AssistantError {
  constructor(
    code: "AI_TIMEOUT" | "AI_PROVIDER_UNAVAILABLE" | "AI_PROVIDER_ERROR" | "AI_RESPONSE_INVALID",
    status: number,
    readonly healthStatus: AIProviderHealthStatus,
    readonly diagnosticStatus: AIProviderDiagnosticStatus = defaultDiagnosticStatus(healthStatus),
  ) {
    super(code, status);
    this.name = "AIProviderAdapterError";
  }
}

export function mapProviderFailure(status: number) {
  if (status === 401 || status === 403) {
    return new AIProviderAdapterError("AI_PROVIDER_ERROR", 503, "INVALID_CREDENTIAL", "INVALID_CREDENTIAL");
  }
  if (status === 404) {
    return new AIProviderAdapterError("AI_PROVIDER_ERROR", 503, "UNSUPPORTED_MODEL", "UNSUPPORTED_MODEL");
  }
  if (status === 429) {
    return new AIProviderAdapterError("AI_PROVIDER_UNAVAILABLE", 503, "UNAVAILABLE", "RATE_LIMITED");
  }
  if (status === 408 || status >= 500) {
    return new AIProviderAdapterError("AI_PROVIDER_UNAVAILABLE", 503, "UNAVAILABLE", "PROVIDER_UNAVAILABLE");
  }
  return new AIProviderAdapterError("AI_PROVIDER_ERROR", 503, "PROVIDER_ERROR", "INVALID_REQUEST");
}

export function providerFetchFailure(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AIProviderAdapterError("AI_TIMEOUT", 504, "TIMEOUT");
  }
  return new AIProviderAdapterError("AI_PROVIDER_UNAVAILABLE", 503, "UNAVAILABLE");
}

export function normalizeFinalResponse(input: {
  text: string;
  hasToolResults: boolean;
  usage?: AIProviderUsage;
}): AIProviderResponse {
  const text = input.text.trim();
  if (!text) throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
  if (!input.hasToolResults) {
    const clarification = text.match(/^CLARIFY:\s*([\s\S]+)$/i);
    if (clarification?.[1]?.trim()) {
      return { type: "final", kind: "clarification", text: clarification[1].trim(), usage: input.usage };
    }
    const refusal = text.match(/^REFUSAL:\s*([\s\S]+)$/i);
    if (refusal?.[1]?.trim()) {
      return { type: "final", kind: "refusal", text: refusal[1].trim(), usage: input.usage };
    }
    throw new AIProviderAdapterError("AI_RESPONSE_INVALID", 502, "PROVIDER_ERROR");
  }
  return { type: "final", kind: "tool_based", text, usage: input.usage };
}

export function safeIntegerUsage(inputTokens: unknown, outputTokens: unknown): AIProviderUsage | undefined {
  if (
    !Number.isSafeInteger(inputTokens)
    || !Number.isSafeInteger(outputTokens)
    || Number(inputTokens) < 0
    || Number(outputTokens) < 0
  ) return undefined;
  return { inputTokens: Number(inputTokens), outputTokens: Number(outputTokens) };
}
