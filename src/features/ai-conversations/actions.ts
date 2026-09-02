"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAIConversationStore } from "@/features/ai-conversations/repository";
import { retentionCutoff, retentionDaysSchema } from "@/features/ai-conversations/retention";
import { requireAdminUser } from "@/features/admin/auth";

const basePath = "/admin/integrations/ai";
const uuidSchema = z.string().uuid();

function finish(path: string, result: string): never {
  revalidatePath(`${basePath}/conversations`);
  revalidatePath(`${basePath}/retention`);
  redirect(`${path}?result=${encodeURIComponent(result)}`);
}

async function adminStore(path: string) {
  await requireAdminUser(["admin"], `${basePath}?result=forbidden`);
  const store = createAIConversationStore();
  if (!store) finish(path, "store-not-configured");
  return store;
}

export async function deleteAIConversationAction(formData: FormData) {
  const path = `${basePath}/conversations`;
  const store = await adminStore(path);
  const id = uuidSchema.safeParse(formData.get("conversation_id"));
  if (!id.success) finish(path, "invalid-selection");
  try {
    const result = await store.deleteConversation(id.data);
    finish(path, result.failedCount ? "delete-partial" : "deleted");
  } catch { finish(path, "store-unavailable"); }
}

export async function deleteAIConversationsAction(formData: FormData) {
  const path = `${basePath}/conversations`;
  const store = await adminStore(path);
  const ids = z.array(uuidSchema).max(100).safeParse(formData.getAll("conversation_ids"));
  if (!ids.success || ids.data.length === 0) finish(path, "invalid-selection");
  try {
    const result = await store.deleteConversations(ids.data);
    finish(path, result.failedCount ? "delete-partial" : `deleted-${result.successCount}`);
  } catch { finish(path, "store-unavailable"); }
}

export async function updateAIConversationRetentionAction(formData: FormData) {
  const path = `${basePath}/retention`;
  const store = await adminStore(path);
  const retention = retentionDaysSchema.safeParse(formData.get("retention_days"));
  const loggingEnabled = formData.get("logging_enabled") === "on";
  const applyExisting = formData.get("apply_existing") === "on";
  if (!retention.success) finish(path, "invalid-retention");
  try {
    const current = await store.getRetentionConfig();
    if (retention.data < current.retentionDays && !applyExisting) finish(path, "apply-required");
    await store.updateRetentionConfig({ loggingEnabled, retentionDays: retention.data });
    if (applyExisting) {
      const result = await store.applyRetentionToExisting(retention.data);
      finish(path, result.failedCount ? "retention-partial" : `retention-saved-${result.successCount}`);
    }
    finish(path, "retention-saved");
  } catch { finish(path, "store-unavailable"); }
}

export async function deleteAIConversationsBeforeAction(formData: FormData) {
  const path = `${basePath}/retention`;
  const store = await adminStore(path);
  const days = retentionDaysSchema.safeParse(formData.get("older_than_days"));
  if (!days.success) finish(path, "invalid-retention");
  try {
    const result = await store.deleteBefore(retentionCutoff(new Date(), days.data));
    finish(path, result.failedCount ? "delete-partial" : `deleted-${result.successCount}`);
  } catch { finish(path, "store-unavailable"); }
}

export async function deleteAllAIConversationsAction(formData: FormData) {
  const path = `${basePath}/retention`;
  const store = await adminStore(path);
  if (formData.get("confirmation") !== "DELETE ALL") finish(path, "confirmation-required");
  try {
    const result = await store.deleteAll();
    finish(path, result.failedCount ? "delete-partial" : `deleted-${result.successCount}`);
  } catch { finish(path, "store-unavailable"); }
}
