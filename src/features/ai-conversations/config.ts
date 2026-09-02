import "server-only";

export type AIConversationStoreConfigurationStatus = "configured" | "missing" | "not_separate";

export interface AIConversationStoreConfiguration {
  status: AIConversationStoreConfigurationStatus;
  configured: boolean;
  url: string | null;
  token: string | null;
}

export function getAIConversationStoreConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): AIConversationStoreConfiguration {
  const url = environment.AI_CONVERSATION_REDIS_REST_URL?.trim() || null;
  const token = environment.AI_CONVERSATION_REDIS_REST_TOKEN?.trim() || null;
  if (!url || !token) return { status: "missing", configured: false, url: null, token: null };
  const quotaUrl = environment.UPSTASH_REDIS_REST_URL?.trim();
  const quotaToken = environment.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url === quotaUrl || token === quotaToken) {
    return { status: "not_separate", configured: false, url: null, token: null };
  }
  return { status: "configured", configured: true, url, token };
}
