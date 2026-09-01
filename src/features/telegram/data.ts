import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import type {
  TelegramActionDto,
  TelegramAssignmentDto,
  TelegramChannelDto,
  TelegramConnectionCodeMeta,
  TelegramDashboard,
  TelegramDeliveryLogDto,
  TelegramOutboxDto,
  TelegramStaffOption,
  TelegramSupplierSummary,
} from "@/features/telegram/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getTelegramDashboard(): Promise<TelegramDashboard> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return { suppliers: [], staff: [], outbox: [], logs: [] };
  const [suppliersResult, channelsResult, assignmentsResult, codesResult, outboxResult, logsResult, staffResult] = await Promise.all([
    client.from("suppliers").select("id,supplier_code,display_name,status").neq("status", "archived").order("display_name"),
    client.from("supplier_communication_channels").select("id,supplier_id,telegram_chat_id,telegram_chat_type,telegram_chat_title,status,is_primary,connected_at,verified_at,disabled_at,last_success_at,last_failure_at,consecutive_failures,last_error_code,last_error_summary,updated_at").order("updated_at", { ascending: false }),
    client.from("supplier_operations_assignments").select("id,supplier_id,user_id,assignment_role,is_active,updated_at").eq("is_active", true),
    client.from("telegram_connection_codes").select("id,supplier_id,status,expires_at,used_at,used_channel_id,revoked_at,created_at").eq("status", "pending"),
    client.from("communication_outbox").select("id,supplier_id,channel_id,booking_id,booking_item_id,confirmation_id,message_type,status,attempt_count,max_attempts,next_attempt_at,claimed_at,sent_at,telegram_message_id,last_error_code,last_error_summary,created_at").order("created_at", { ascending: false }).limit(200),
    client.from("communication_delivery_logs").select("id,outbox_id,channel_id,attempt_number,outcome,telegram_response_code,error_code,response_summary,created_at").order("created_at", { ascending: false }).limit(300),
    client.rpc("get_telegram_staff_options"),
  ]);
  if (suppliersResult.error || channelsResult.error || assignmentsResult.error || codesResult.error || outboxResult.error || logsResult.error || staffResult.error) {
    throw new Error("Không thể tải trạng thái Telegram lúc này.");
  }
  const channels = (channelsResult.data ?? []) as unknown as TelegramChannelDto[];
  const assignments = (assignmentsResult.data ?? []) as unknown as TelegramAssignmentDto[];
  const codes = (codesResult.data ?? []) as unknown as TelegramConnectionCodeMeta[];
  const outbox = (outboxResult.data ?? []) as unknown as TelegramOutboxDto[];
  const logs = (logsResult.data ?? []) as unknown as TelegramDeliveryLogDto[];
  const staff = (staffResult.data ?? []) as unknown as TelegramStaffOption[];
  const staffEmails = new Map(staff.map((item) => [item.user_id, item.email]));
  const suppliers: TelegramSupplierSummary[] = (suppliersResult.data ?? []).map((supplier) => ({
    ...supplier,
    channel: channels.find((item) => item.supplier_id === supplier.id && item.is_primary && item.status !== "disabled")
      ?? channels.find((item) => item.supplier_id === supplier.id) ?? null,
    assignments: assignments.filter((item) => item.supplier_id === supplier.id)
      .map((item) => ({ ...item, email: staffEmails.get(item.user_id) ?? null })),
    pending_code: codes.find((item) => item.supplier_id === supplier.id) ?? null,
    outbox: outbox.filter((item) => item.supplier_id === supplier.id).slice(0, 10),
    logs: logs.filter((item) => channels.some((channel) => channel.supplier_id === supplier.id && channel.id === item.channel_id)).slice(0, 10),
  }));
  return { suppliers, staff, outbox, logs };
}
export async function getOpenTelegramDiscussions(bookingId: string): Promise<TelegramActionDto[]> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return [];
  const { data, error } = await client.from("telegram_actions")
    .select("id,supplier_id,channel_id,booking_id,booking_item_id,confirmation_id,action_type,status,expected_booking_revision,expected_confirmation_updated_at,expires_at,used_at,used_update_id,discussion_resolved_at,discussion_resolved_by,created_at")
    .eq("booking_id", bookingId).eq("action_type", "NEED_DISCUSSION").eq("status", "used")
    .is("discussion_resolved_at", null).order("created_at", { ascending: false });
  return error ? [] : data as unknown as TelegramActionDto[];
}
