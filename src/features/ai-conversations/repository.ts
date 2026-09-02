import "server-only";

import { Redis } from "@upstash/redis";
import { getAIConversationStoreConfiguration } from "@/features/ai-conversations/config";
import type { AIConversationStore } from "@/features/ai-conversations/types";
import { UpstashAIConversationStore } from "@/features/ai-conversations/upstash-store";

export function createAIConversationStore(environment: NodeJS.ProcessEnv = process.env): AIConversationStore | null {
  const config = getAIConversationStoreConfiguration(environment);
  if (!config.configured || !config.url || !config.token) return null;
  return new UpstashAIConversationStore(new Redis({ url: config.url, token: config.token }));
}
