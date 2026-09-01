import "server-only";

import { getAIModelDefinition } from "@/features/ai/providers/registry";
import type { AIProviderUsage } from "@/features/ai/types";

export function estimateAIUsageCostMicros(
  provider: string,
  model: string,
  usage?: AIProviderUsage,
): number | null {
  const pricing = getAIModelDefinition(provider, model)?.pricing;
  if (
    !usage
    || pricing?.inputUsdPerMillion === undefined
    || pricing.outputUsdPerMillion === undefined
  ) return null;
  if (
    !Number.isSafeInteger(usage.inputTokens)
    || !Number.isSafeInteger(usage.outputTokens)
    || (usage.inputTokens ?? -1) < 0
    || (usage.outputTokens ?? -1) < 0
  ) return null;
  const costUsd = ((usage.inputTokens ?? 0) * pricing.inputUsdPerMillion
    + (usage.outputTokens ?? 0) * pricing.outputUsdPerMillion) / 1_000_000;
  return Math.max(0, Math.ceil(costUsd * 1_000_000));
}

export function microsToUsd(micros: number | null | undefined) {
  return micros === null || micros === undefined ? null : Number((micros / 1_000_000).toFixed(6));
}
