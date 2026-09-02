import "server-only";

import { getActiveAIRuntime } from "@/features/ai/runtime/data";
import type { AssistantPublicReadiness } from "@/features/ai/discovery";

export async function getPublicAssistantReadiness(): Promise<AssistantPublicReadiness> {
  try {
    const { config } = await getActiveAIRuntime();
    if (config.status === "ready") return "ready";
    if (config.status === "disabled") return "disabled";
    return "not_configured";
  } catch {
    return "temporarily_unavailable";
  }
}
