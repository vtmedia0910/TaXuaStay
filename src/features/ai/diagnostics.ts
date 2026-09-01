import "server-only";

import { getAIProviderConfig } from "@/features/ai/config";
import {
  budgetState,
  createAIControlStore,
  type AIControlDiagnostics,
} from "@/features/ai/control-store";
import { microsToUsd } from "@/features/ai/cost";
import { getAIMetricsSnapshot } from "@/features/ai/metrics";
import { ASSISTANT_TOOL_NAMES } from "@/features/ai/tools";

export async function getAISystemDiagnostics() {
  const config = getAIProviderConfig();
  const controls = createAIControlStore(config);
  let shared: AIControlDiagnostics | null = null;
  let sharedStoreError: string | null = null;

  if (controls) {
    try {
      shared = await controls.diagnostics();
    } catch {
      sharedStoreError = "Không kết nối được shared limiter/budget store.";
    }
  }

  return {
    configured: config.status === "ready",
    status: config.status,
    provider: config.provider,
    model: config.model,
    enabled: config.enabled,
    killSwitch: config.killSwitch,
    environmentAllowed: config.environmentAllowed,
    credentialConfigured: config.credentialConfigured,
    adapterSupported: config.adapterSupported,
    rateLimiterConfigured: config.rateLimiterConfigured,
    identitySaltConfigured: config.identitySaltConfigured,
    configurationMessage: config.message,
    toolCount: ASSISTANT_TOOL_NAMES.length,
    readOnly: true,
    directDatabaseAccess: false,
    writeTools: false,
    limits: {
      ...config.limits,
      dailyBudgetUsd: microsToUsd(config.limits.dailyBudgetMicros),
      monthlyBudgetUsd: microsToUsd(config.limits.monthlyBudgetMicros),
      maxRequestCostUsd: microsToUsd(config.limits.maxRequestReservationMicros),
    },
    shared: shared
      ? {
          ...shared,
          daily: { ...shared.daily, costUsd: microsToUsd(shared.daily.costMicros) },
          monthly: { ...shared.monthly, costUsd: microsToUsd(shared.monthly.costMicros) },
          dailyBudgetState: budgetState(shared.daily.costMicros, config.limits.dailyBudgetMicros),
          monthlyBudgetState: budgetState(shared.monthly.costMicros, config.limits.monthlyBudgetMicros),
        }
      : null,
    sharedStoreError,
    instanceMetrics: getAIMetricsSnapshot(),
  };
}
