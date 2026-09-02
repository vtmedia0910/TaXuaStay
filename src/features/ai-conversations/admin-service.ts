import "server-only";

import { z } from "zod";
import { getAIConversationStoreConfiguration } from "@/features/ai-conversations/config";
import { createAIConversationStore } from "@/features/ai-conversations/repository";
import type { AIConversationEntryPoint, AIConversationFilters, AIConversationStatus } from "@/features/ai-conversations/types";
import { AI_CONVERSATION_ENTRY_POINTS } from "@/features/ai-conversations/types";
import { requireAdminUser } from "@/features/admin/auth";

const listQuerySchema = z.object({
  cursor: z.string().max(200).optional(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  entryPoint: z.enum(AI_CONVERSATION_ENTRY_POINTS).optional(), provider: z.string().trim().max(40).optional(), model: z.string().trim().max(120).optional(),
  profileRevision: z.coerce.number().int().positive().optional(), status: z.enum(["success", "error"]).optional(), hasError: z.enum(["yes", "no"]).optional(),
}).strict();

export async function getAIConversationAdminDashboard(query: Record<string, string | undefined>) {
  await requireAdminUser(["admin"]);
  const rawConfiguration = getAIConversationStoreConfiguration();
  const configuration = { status: rawConfiguration.status, configured: rawConfiguration.configured };
  const store = createAIConversationStore();
  const parsed = listQuerySchema.safeParse(query);
  if (!store) return { configuration, config: null, summary: null, page: null, error: "not_configured" as const };
  if (!parsed.success) return { configuration, config: null, summary: null, page: null, error: "invalid_filters" as const };
  const filters: AIConversationFilters = {
    ...(parsed.data.from ? { from: new Date(`${parsed.data.from}T00:00:00+07:00`).toISOString() } : {}),
    ...(parsed.data.to ? { to: new Date(`${parsed.data.to}T23:59:59.999+07:00`).toISOString() } : {}),
    ...(parsed.data.entryPoint ? { entryPoint: parsed.data.entryPoint as AIConversationEntryPoint } : {}),
    ...(parsed.data.provider ? { provider: parsed.data.provider } : {}),
    ...(parsed.data.model ? { model: parsed.data.model } : {}),
    ...(parsed.data.profileRevision ? { profileRevision: parsed.data.profileRevision } : {}),
    ...(parsed.data.status ? { status: parsed.data.status as AIConversationStatus } : {}),
    ...(parsed.data.hasError ? { hasError: parsed.data.hasError === "yes" } : {}),
  };
  try {
    const [config, summary, page] = await Promise.all([
      store.getRetentionConfig(), store.getSummary(), store.listConversations({ filters, cursor: parsed.data.cursor, limit: 25 }),
    ]);
    return { configuration, config, summary, page, error: null };
  } catch {
    return { configuration, config: null, summary: null, page: null, error: "unavailable" as const };
  }
}

export async function getAIConversationAdminDetail(id: string) {
  await requireAdminUser(["admin"]);
  const rawConfiguration = getAIConversationStoreConfiguration();
  const configuration = { status: rawConfiguration.status, configured: rawConfiguration.configured };
  const store = createAIConversationStore();
  if (!store) return { configuration, conversation: null, error: "not_configured" as const };
  try {
    return { configuration, conversation: await store.getConversation(id), error: null };
  } catch {
    return { configuration, conversation: null, error: "unavailable" as const };
  }
}

export async function getAIConversationRetentionAdminState() {
  await requireAdminUser(["admin"]);
  const rawConfiguration = getAIConversationStoreConfiguration();
  const configuration = { status: rawConfiguration.status, configured: rawConfiguration.configured };
  const store = createAIConversationStore();
  if (!store) return { configuration, config: null, summary: null, error: "not_configured" as const };
  try {
    const [config, summary] = await Promise.all([store.getRetentionConfig(), store.getSummary()]);
    return { configuration, config, summary, error: null };
  } catch {
    return { configuration, config: null, summary: null, error: "unavailable" as const };
  }
}
