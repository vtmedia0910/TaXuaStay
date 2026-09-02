import { z } from "zod";
import { AI_CONVERSATION_RETENTION_PRESETS, type AIConversationRetentionDays } from "@/features/ai-conversations/types";

export const DEFAULT_AI_CONVERSATION_RETENTION_DAYS: AIConversationRetentionDays = 30;
export const AI_CONVERSATION_MAX_MESSAGES = 100;
export const AI_CONVERSATION_MAX_USER_CHARACTERS = 8_000;
export const AI_CONVERSATION_MAX_ASSISTANT_CHARACTERS = 12_000;
export const AI_CONVERSATION_DELETE_BATCH_MAX = 100;

export const retentionDaysSchema = z.coerce.number().refine(
  (value): value is AIConversationRetentionDays => AI_CONVERSATION_RETENTION_PRESETS.includes(value as AIConversationRetentionDays),
  "Retention period must be an allowed preset.",
);

export function retentionTtlSeconds(days: AIConversationRetentionDays) {
  return days * 24 * 60 * 60;
}

export function retentionExpiry(now: Date, days: AIConversationRetentionDays) {
  return new Date(now.getTime() + retentionTtlSeconds(days) * 1_000);
}

export function retentionCutoff(now: Date, days: AIConversationRetentionDays) {
  return new Date(now.getTime() - retentionTtlSeconds(days) * 1_000);
}

export function truncateConversationContent(value: string, limit: number) {
  const normalized = value.trim();
  return normalized.length > limit
    ? { content: normalized.slice(0, limit), truncated: true }
    : { content: normalized, truncated: false };
}
