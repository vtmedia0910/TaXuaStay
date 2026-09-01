import "server-only";

import type { AIProviderConfig } from "@/features/ai/types";

export const APPROVED_AI_PROVIDER = "openai";
export const APPROVED_AI_MODEL = "gpt-5-mini-2025-08-07";

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

export function getAIProviderConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AIProviderConfig {
  const provider = environment.AI_PROVIDER?.trim() || null;
  const model = environment.AI_MODEL?.trim() || null;
  const credentialConfigured = Boolean(environment.AI_API_KEY?.trim());
  const rateLimiterConfigured = Boolean(
    environment.UPSTASH_REDIS_REST_URL?.trim()
    && environment.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
  const identitySaltConfigured = Boolean(environment.AI_IDENTITY_HASH_SALT?.trim());
  const aiEnabled = enabled(environment.AI_ENABLED);
  const killSwitch = enabled(environment.AI_KILL_SWITCH);
  const isPreview = environment.VERCEL_ENV === "preview";
  const environmentAllowed = !isPreview || enabled(environment.AI_ALLOW_PREVIEW);
  const adapterSupported = provider === APPROVED_AI_PROVIDER && model === APPROVED_AI_MODEL;
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
    enabled: aiEnabled,
    killSwitch,
    environmentAllowed,
    limits,
  };

  if (killSwitch || !aiEnabled || !environmentAllowed) {
    return {
      ...base,
      status: "disabled",
      message: killSwitch
        ? "Kill switch đang bật; không có request nào được gửi tới provider."
        : !environmentAllowed
          ? "Preview mặc định bị khóa để không phát sinh paid inference ngoài Production."
          : "AI_ENABLED đang tắt; không có request nào được gửi tới provider.",
    };
  }
  if (!provider && !model && !credentialConfigured) {
    return { ...base, status: "unconfigured", message: "Chưa cấu hình provider, model và credential server-only." };
  }
  if (!provider || !model || !credentialConfigured || !rateLimiterConfigured || !identitySaltConfigured) {
    return {
      ...base,
      status: "incomplete",
      message: "Cấu hình provider hoặc shared safety store chưa đầy đủ; hệ thống đang khóa an toàn.",
    };
  }
  if (provider !== APPROVED_AI_PROVIDER) {
    return { ...base, status: "unsupported", message: "Provider không nằm trong allow-list Phase 13A." };
  }
  if (model !== APPROVED_AI_MODEL) {
    return { ...base, status: "unsupported", message: "Model không nằm trong allow-list Phase 13A." };
  }
  return {
    ...base,
    status: "ready",
    message: "Provider, model và shared safety store đã sẵn sàng.",
  };
}

export function getAIConfigurationError(config: AIProviderConfig) {
  if (config.status === "ready") return null;
  if (config.status === "disabled") return "AI_DISABLED" as const;
  if (config.provider && config.provider !== APPROVED_AI_PROVIDER) return "AI_PROVIDER_UNSUPPORTED" as const;
  if (config.model && config.model !== APPROVED_AI_MODEL) return "AI_MODEL_UNSUPPORTED" as const;
  return "AI_NOT_CONFIGURED" as const;
}
