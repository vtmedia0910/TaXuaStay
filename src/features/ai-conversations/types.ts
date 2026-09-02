import type { AIErrorCode } from "@/features/ai/types";

export const AI_CONVERSATION_RETENTION_PRESETS = [7, 14, 30, 60, 90] as const;
export type AIConversationRetentionDays = (typeof AI_CONVERSATION_RETENTION_PRESETS)[number];

export const AI_CONVERSATION_ENTRY_POINTS = [
  "assistant_page",
  "floating_assistant",
  "homepage_launcher",
  "booking_page",
  "unknown",
] as const;
export type AIConversationEntryPoint = (typeof AI_CONVERSATION_ENTRY_POINTS)[number];
export type AIConversationStatus = "success" | "error";

export interface AIConversationRetentionConfig {
  loggingEnabled: boolean;
  retentionDays: AIConversationRetentionDays;
  updatedAt: string | null;
  updatedBy: "admin" | "default";
}

export interface AIConversationMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  entryPoint: AIConversationEntryPoint;
  provider: string;
  model: string;
  runtimeRevision: number;
  profileRevision: number;
  status: AIConversationStatus;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  totalEstimatedCostUsd: number | null;
  lastLatencyMs: number;
  lastErrorCode: AIErrorCode | null;
  retentionExpiresAt: string;
}

export interface AIConversationMessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  createdAt: string;
  contentRedacted: string;
  contentTruncated: boolean;
  provider: string | null;
  model: string | null;
  runtimeRevision: number | null;
  profileRevision: number | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  toolNames: string[];
  normalizedResult: AIConversationStatus;
  normalizedErrorCode: AIErrorCode | null;
}

export interface AIConversationWithMessages {
  meta: AIConversationMeta;
  messages: AIConversationMessageRecord[];
}

export interface AIConversationTurnInput {
  sessionHash: string;
  entryPoint: AIConversationEntryPoint;
  customerMessage: string;
  assistantAnswer: string;
  provider: string;
  model: string;
  runtimeRevision: number;
  profileRevision: number;
  toolNames: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
  latencyMs: number;
  result: AIConversationStatus;
  errorCode: AIErrorCode | null;
  now?: Date;
}

export interface AIConversationFilters {
  from?: string;
  to?: string;
  entryPoint?: AIConversationEntryPoint;
  provider?: string;
  model?: string;
  profileRevision?: number;
  status?: AIConversationStatus;
  hasError?: boolean;
}

export interface AIConversationPage {
  items: AIConversationMeta[];
  nextCursor: string | null;
}

export interface AIConversationSummary {
  conversationsToday: number;
  messagesToday: number;
  assistantErrorsToday: number;
  averageLatencyMs: number | null;
  storedConversations: number;
  oldestRetainedAt: string | null;
}

export interface AIConversationDeleteResult {
  requested: number;
  successCount: number;
  failedCount: number;
  failedIds: string[];
}

export interface AIConversationStore {
  appendTurn(input: AIConversationTurnInput, retentionDays: AIConversationRetentionDays): Promise<string>;
  getConversation(id: string): Promise<AIConversationWithMessages | null>;
  listConversations(input: { filters?: AIConversationFilters; cursor?: string; limit?: number }): Promise<AIConversationPage>;
  getSummary(now?: Date): Promise<AIConversationSummary>;
  deleteConversation(id: string): Promise<AIConversationDeleteResult>;
  deleteConversations(ids: string[]): Promise<AIConversationDeleteResult>;
  deleteBefore(cutoff: Date): Promise<AIConversationDeleteResult>;
  deleteAll(): Promise<AIConversationDeleteResult>;
  getRetentionConfig(): Promise<AIConversationRetentionConfig>;
  updateRetentionConfig(input: { loggingEnabled: boolean; retentionDays: AIConversationRetentionDays }): Promise<AIConversationRetentionConfig>;
  applyRetentionToExisting(retentionDays: AIConversationRetentionDays, now?: Date): Promise<AIConversationDeleteResult>;
}
