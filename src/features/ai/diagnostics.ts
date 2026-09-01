import "server-only";

import { getAIProviderConfig } from "@/features/ai/config";
import { getAIMetricsSnapshot } from "@/features/ai/metrics";
import { ASSISTANT_TOOL_NAMES } from "@/features/ai/tools";

export function getAISystemDiagnostics() {
  const config = getAIProviderConfig();
  return {
    configured: false,
    status: config.status,
    provider: config.provider,
    model: config.model,
    credentialConfigured: config.credentialConfigured,
    configurationMessage: config.message,
    toolCount: ASSISTANT_TOOL_NAMES.length,
    readOnly: true,
    directDatabaseAccess: false,
    writeTools: false,
    metrics: getAIMetricsSnapshot(),
  };
}
