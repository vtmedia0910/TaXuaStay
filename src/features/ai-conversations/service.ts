import "server-only";

import { recordAIConversationLogWriteError } from "@/features/ai-conversations/metrics";
import { redactAIConversationText } from "@/features/ai-conversations/redaction";
import { createAIConversationStore } from "@/features/ai-conversations/repository";
import type { AIConversationStore, AIConversationTurnInput } from "@/features/ai-conversations/types";

export type AIConversationCaptureInput = Omit<AIConversationTurnInput, "customerMessage" | "assistantAnswer"> & {
  customerMessage: string;
  assistantAnswer: string;
};

export async function captureAIConversationTurn(
  input: AIConversationCaptureInput,
  dependencies: {
    store?: AIConversationStore | null;
    redact?: (value: string) => string;
  } = {},
) {
  try {
    const store = dependencies.store === undefined ? createAIConversationStore() : dependencies.store;
    if (!store) return { stored: false as const, reason: "not_configured" as const };
    const config = await store.getRetentionConfig();
    if (!config.loggingEnabled) return { stored: false as const, reason: "disabled" as const };
    const redact = dependencies.redact ?? redactAIConversationText;
    const customerMessage = redact(input.customerMessage);
    const assistantAnswer = redact(input.assistantAnswer);
    if (!customerMessage || !assistantAnswer) return { stored: false as const, reason: "redaction_failed" as const };
    const conversationId = await store.appendTurn({ ...input, customerMessage, assistantAnswer }, config.retentionDays);
    return { stored: true as const, conversationId };
  } catch {
    recordAIConversationLogWriteError();
    return { stored: false as const, reason: "write_failed" as const };
  }
}
