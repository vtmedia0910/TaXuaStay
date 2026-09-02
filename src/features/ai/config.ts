import "server-only";

import {
  getAIProviderDefinition,
  getProviderCredential,
  isAISelectionActivatable,
} from "@/features/ai/providers/registry";
import type { AIProviderConfig } from "@/features/ai/types";

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function integer(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function usdMicros(value: string | undefined, fallbackUsd: number, minUsd: number, maxUsd: number) {
  const parsed = Number(value);
  const dollars = Number.isFinite(parsed) && parsed >= minUsd && parsed <= maxUsd ? parsed : fallbackUsd;
  return Math.round(dollars * 1_000_000);
}

export interface AIRuntimeSelection {
  provider: string;
  model: string;
  enabled: boolean;
}

export function getAIMasterGateError(environment: NodeJS.ProcessEnv = process.env) {
  const masterEnabled = enabled(environment.AI_ENABLED);
  const killSwitch = enabled(environment.AI_KILL_SWITCH);
  const isPreview = environment.VERCEL_ENV === "preview";
  const environmentAllowed = !isPreview || enabled(environment.AI_ALLOW_PREVIEW);
  return killSwitch || !masterEnabled || !environmentAllowed ? "AI_DISABLED" as const : null;
}

export function getAIProviderConfig(
  selection: AIRuntimeSelection | null = null,
  environment: NodeJS.ProcessEnv = process.env,
): AIProviderConfig {
  const provider = selection?.provider ?? null;
  const model = selection?.model ?? null;
  const credentialConfigured = provider ? Boolean(getProviderCredential(provider, environment)) : false;
  const rateLimiterConfigured = Boolean(
    environment.UPSTASH_REDIS_REST_URL?.trim()
    && environment.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
  const identitySaltConfigured = Boolean(environment.AI_IDENTITY_HASH_SALT?.trim());
  const masterEnabled = enabled(environment.AI_ENABLED);
  const runtimeEnabled = selection?.enabled === true;
  const killSwitch = enabled(environment.AI_KILL_SWITCH);
  const isPreview = environment.VERCEL_ENV === "preview";
  const environmentAllowed = !isPreview || enabled(environment.AI_ALLOW_PREVIEW);
  const adapterSupported = Boolean(provider && model && isAISelectionActivatable(provider, model));
  const limits = {
    providerTimeoutMs: integer(environment.AI_PROVIDER_TIMEOUT_MS, 12_000, 3_000, 15_000),
    requestTimeoutMs: integer(environment.AI_REQUEST_TIMEOUT_MS, 18_000, 8_000, 20_000),
    maxOutputTokens: integer(environment.AI_MAX_OUTPUT_TOKENS, 800, 128, 1_200),
    perIpPerMinute: integer(environment.AI_PER_IP_PER_MINUTE, 8, 1, 60),
    perSessionPerMinute: integer(environment.AI_PER_SESSION_PER_MINUTE, 10, 1, 80),
    globalPerMinute: integer(environment.AI_GLOBAL_PER_MINUTE, 80, 1, 1_000),
    dailyRequests: integer(environment.AI_DAILY_REQUEST_LIMIT, 200, 1, 100_000),
    dailyBudgetMicros: usdMicros(environment.AI_DAILY_BUDGET_USD, 3, 0.05, 10_000),
    monthlyBudgetMicros: usdMicros(environment.AI_MONTHLY_BUDGET_USD, 30, 0.5, 100_000),
    maxRequestReservationMicros: usdMicros(environment.AI_MAX_REQUEST_COST_USD, 0.05, 0.005, 5),
  };
  const base = {
    provider,
    model,
    credentialConfigured,
    adapterSupported,
    rateLimiterConfigured,
    identitySaltConfigured,
    enabled: masterEnabled && runtimeEnabled,
    masterEnabled,
    runtimeEnabled,
    killSwitch,
    environmentAllowed,
    limits,
  };

  if (killSwitch || !masterEnabled || !runtimeEnabled || !environmentAllowed) {
    return {
      ...base,
      status: "disabled",
      message: killSwitch
        ? "Kill switch đang bật; không có request nào được gửi tới provider."
        : !environmentAllowed
          ? "Preview mặc định bị khóa để không phát sinh paid inference ngoài Production."
          : !runtimeEnabled
            ? "Chưa có runtime ACTIVE được bật cho khách hàng."
            : "AI_ENABLED đang tắt; runtime ACTIVE vẫn không thể gọi provider.",
    };
  }
  if (!provider && !model) {
    return { ...base, status: "unconfigured", message: "Chưa có runtime ACTIVE." };
  }
  if (provider && model && !adapterSupported) {
    return { ...base, status: "unsupported", message: "Provider/model không nằm trong allow-list có tool calling." };
  }
  if (!provider || !model || !credentialConfigured || !rateLimiterConfigured || !identitySaltConfigured) {
    return {
      ...base,
      status: "incomplete",
      message: "Credential provider hoặc shared safety store chưa đầy đủ; hệ thống đang khóa an toàn.",
    };
  }
  return { ...base, status: "ready", message: "Runtime, provider và shared safety store đã sẵn sàng." };
}

export function getAIConfigurationError(config: AIProviderConfig) {
  if (config.status === "ready") return null;
  if (config.status === "disabled") return "AI_DISABLED" as const;
  if (config.provider && !config.adapterSupported) {
    return getAIProviderDefinition(config.provider)
      ? "AI_MODEL_UNSUPPORTED" as const
      : "AI_PROVIDER_UNSUPPORTED" as const;
  }
  return "AI_NOT_CONFIGURED" as const;
}
