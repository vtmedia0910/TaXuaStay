"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import {
  telegramAssignmentSchema,
  telegramChannelIdSchema,
  telegramDisableSchema,
  telegramDiscussionResolutionSchema,
  telegramDispatchSchema,
  telegramSupplierIdSchema,
  telegramTestSchema,
  telegramWorkerSchema,
} from "@/features/telegram/schema";
import type { TelegramConnectionActionState } from "@/features/telegram/types";
import { processTelegramOutbox } from "@/features/telegram/worker";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const integrationPath = "/admin/integrations/telegram";
function refreshTelegram(supplierId?: string, bookingId?: string) {
  revalidatePath(integrationPath);
  if (supplierId) revalidatePath(`/admin/suppliers/${supplierId}/edit`);
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/operations");
}
export async function generateTelegramConnectionCodeAction(
  _: TelegramConnectionActionState,
  formData: FormData,
): Promise<TelegramConnectionActionState> {
  await requireAdminUser(["admin", "staff"]);
  const parsed = telegramSupplierIdSchema.safeParse(formData.get("supplier_id"));
  if (!parsed.success) return { error: "Nhà cung cấp không hợp lệ." };
  const client = await createServerSupabaseClient();
  if (!client) return { error: "Supabase chưa được cấu hình." };
  const { data, error } = await client.rpc("generate_telegram_connection_code", { target_supplier_id: parsed.data });
  if (error || !data || typeof data !== "object") return { error: "Không thể tạo mã. Kết nối hiện tại có thể cần Admin xử lý." };
  const row = data as Record<string, unknown>;
  refreshTelegram(parsed.data);
  return {
    code: typeof row.code === "string" ? row.code : undefined,
    supplierName: typeof row.supplier_name === "string" ? row.supplier_name : undefined,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : undefined,
  };
}

export async function saveTelegramAssignmentAction(formData: FormData) {
  await requireAdminUser(["admin"], `${integrationPath}?error=forbidden`);
  const parsed = telegramAssignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${integrationPath}?error=telegram-assignment`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${integrationPath}?error=config`);
  const { error } = await client.rpc("set_supplier_telegram_assignment", {
    target_supplier_id: parsed.data.supplier_id,
    target_user_id: parsed.data.user_id,
    target_assignment_role: parsed.data.assignment_role,
    target_is_active: parsed.data.is_active,
  });
  if (error) redirect(`${integrationPath}?error=telegram-assignment`);
  refreshTelegram(parsed.data.supplier_id);
  redirect(`${integrationPath}?saved=telegram-assignment#supplier-${parsed.data.supplier_id}`);
}

export async function disableTelegramChannelAction(formData: FormData) {
  await requireAdminUser(["admin"], `${integrationPath}?error=forbidden`);
  const parsed = telegramDisableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${integrationPath}?error=telegram-disable`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${integrationPath}?error=config`);
  const { error } = await client.rpc("disable_supplier_telegram_channel", {
    target_channel_id: parsed.data.channel_id,
    target_reason: parsed.data.reason,
  });
  if (error) redirect(`${integrationPath}?error=telegram-disable`);
  refreshTelegram(parsed.data.supplier_id);
  redirect(`${integrationPath}?saved=telegram-disabled#supplier-${parsed.data.supplier_id}`);
}

export async function dispatchSupplierTelegramAction(formData: FormData) {
  await requireAdminUser();
  const parsed = telegramDispatchSchema.safeParse(Object.fromEntries(formData));
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!parsed.success) redirect(`/admin/bookings/${bookingId}?error=telegram-dispatch`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${bookingId}?error=config`);
  const { error } = await client.rpc("dispatch_supplier_confirmation_telegram", {
    target_confirmation_id: parsed.data.confirmation_id,
    target_expected_confirmation_updated_at: parsed.data.expected_confirmation_updated_at,
    target_expected_booking_revision: parsed.data.expected_booking_revision,
    target_dispatch_mode: parsed.data.dispatch_mode,
  });
  if (error) redirect(`/admin/bookings/${bookingId}?error=${error.message.includes("Booking changed") ? "stale" : "telegram-dispatch"}`);
  const summary = await processTelegramOutbox(1);
  refreshTelegram(undefined, bookingId);
  redirect(`/admin/bookings/${bookingId}?saved=${summary.sent ? "telegram-sent" : "telegram-queued"}`);
}

export async function sendAuthorizedTelegramTestAction(formData: FormData) {
  await requireAdminUser(["admin"], `${integrationPath}?error=forbidden`);
  const parsed = telegramTestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${integrationPath}?error=telegram-test-authorization`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${integrationPath}?error=config`);
  const { error } = await client.rpc("queue_supplier_telegram_test", {
    target_channel_id: parsed.data.channel_id,
    target_owner_authorization: parsed.data.owner_authorization,
  });
  if (error) redirect(`${integrationPath}?error=telegram-test`);
  const summary = await processTelegramOutbox(1);
  refreshTelegram(parsed.data.supplier_id);
  redirect(`${integrationPath}?saved=${summary.sent ? "telegram-test-sent" : "telegram-test-queued"}#supplier-${parsed.data.supplier_id}`);
}

export async function processTelegramOutboxAction(formData: FormData) {
  await requireAdminUser();
  const parsed = telegramWorkerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${integrationPath}?error=telegram-worker`);
  const summary = await processTelegramOutbox(parsed.data.limit);
  refreshTelegram();
  redirect(`${integrationPath}?saved=telegram-worker&claimed=${summary.claimed}&sent=${summary.sent}&retry=${summary.retry}&failed=${summary.failed}`);
}

export async function resolveTelegramDiscussionAction(formData: FormData) {
  await requireAdminUser();
  const parsed = telegramDiscussionResolutionSchema.safeParse(Object.fromEntries(formData));
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!parsed.success) redirect(`/admin/bookings/${bookingId}?error=telegram-discussion`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${bookingId}?error=config`);
  const { error } = await client.rpc("resolve_telegram_supplier_discussion", {
    target_action_id: parsed.data.action_id,
    target_expected_booking_revision: parsed.data.expected_booking_revision,
    target_resolution_note: parsed.data.resolution_note,
  });
  if (error) redirect(`/admin/bookings/${bookingId}?error=${error.message.includes("Booking changed") ? "stale" : "telegram-discussion"}`);
  refreshTelegram(undefined, bookingId);
  redirect(`/admin/bookings/${bookingId}?saved=telegram-discussion-resolved`);
}

export async function validateTelegramChannelIdAction(value: unknown) {
  await requireAdminUser();
  return telegramChannelIdSchema.safeParse(value).success;
}
