import "server-only";

import { getAIProviderConfig } from "@/features/ai/config";
import { budgetState, createAIControlStore, type AIControlDiagnostics } from "@/features/ai/control-store";
import { microsToUsd } from "@/features/ai/cost";
import { getAIMetricsSnapshot } from "@/features/ai/metrics";
import { getProviderCredentialStatuses, SAFE_AI_PROVIDER_REGISTRY } from "@/features/ai/providers/registry";
import { getAIAdminState } from "@/features/ai/runtime/data";
import { ASSISTANT_TOOL_NAMES } from "@/features/ai/tools";

export async function getAISystemDiagnostics() {
  const adminState = await getAIAdminState();
  const activeRuntime = adminState.runtimes.find((runtime) => runtime.status === "ACTIVE") ?? null;
  const latestDraft = adminState.runtimes.find((runtime) => runtime.status === "DRAFT") ?? null;
  const config = getAIProviderConfig(activeRuntime
    ? { provider: activeRuntime.provider, model: activeRuntime.model, enabled: activeRuntime.enabled }
    : null);
  const controls = createAIControlStore(config);
  let shared: AIControlDiagnostics | null = null;
  let sharedStoreError: string | null = null;
  if (controls) {
    try { shared = await controls.diagnostics(); } catch {
      sharedStoreError = "Không kết nối được shared limiter/budget store.";
    }
  }
  const latestHealth = new Map<string, (typeof adminState.health)[number]>();
  for (const item of adminState.health) {
    const key = `${item.provider}:${item.model}`;
    if (!latestHealth.has(key)) latestHealth.set(key, item);
  }
  const credentials = getProviderCredentialStatuses();
  return {
    configured: config.status === "ready",
    status: config.status,
    provider: config.provider,
    model: config.model,
    enabled: config.enabled,
    masterEnabled: config.masterEnabled,
    runtimeEnabled: config.runtimeEnabled,
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
    registry: SAFE_AI_PROVIDER_REGISTRY.map((provider) => ({
      ...provider,
      credentialConfigured: credentials.find((item) => item.provider === provider.id)?.configured ?? false,
      models: provider.models.map((model) => ({
        ...model,
        health: latestHealth.get(`${provider.id}:${model.id}`) ?? null,
      })),
    })),
    activeRuntime,
    latestDraft,
    profiles: adminState.profiles,
    runtimes: adminState.runtimes,
    audit: adminState.audit,
    dataError: adminState.error,
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
