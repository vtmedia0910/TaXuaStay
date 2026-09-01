import "server-only";

import type { AIProviderUsage } from "@/features/ai/types";

const OPENAI_GPT5_MINI_INPUT_USD_PER_MILLION = 0.25;
const OPENAI_GPT5_MINI_OUTPUT_USD_PER_MILLION = 2;

export function estimateAIUsageCostMicros(
  provider: string,
  model: string,
  usage?: AIProviderUsage,
): number | null {
  if (provider !== "openai" || model !== "gpt-5-mini-2025-08-07" || !usage) return null;
  if (
    !Number.isSafeInteger(usage.inputTokens)
    || !Number.isSafeInteger(usage.outputTokens)
    || (usage.inputTokens ?? -1) < 0
    || (usage.outputTokens ?? -1) < 0
  ) return null;
  const costUsd = ((usage.inputTokens ?? 0) * OPENAI_GPT5_MINI_INPUT_USD_PER_MILLION
    + (usage.outputTokens ?? 0) * OPENAI_GPT5_MINI_OUTPUT_USD_PER_MILLION) / 1_000_000;
  return Math.max(0, Math.ceil(costUsd * 1_000_000));
}

export function microsToUsd(micros: number | null | undefined) {
  return micros === null || micros === undefined ? null : Number((micros / 1_000_000).toFixed(6));
}
