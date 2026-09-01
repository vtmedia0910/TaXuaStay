import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import type { AdminDataHealthFeed, AdminOperationsFeed, DataHealthIssue, OperationsView } from "@/features/operations/types";
import { buildOperationsView, resolveBookingOperations, type OperationsFilters } from "@/features/operations/policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const EMPTY_OPERATIONS: AdminOperationsFeed = {
  policy_version: "phase11-operations-v1",
  priority_policy_version: "phase11-operations-priority-v1",
  total_bookings: 0,
  truncated: false,
  bookings: [],
};

const EMPTY_HEALTH: AdminDataHealthFeed = {
  policy_version: "phase11-data-health-v1",
  total_issues: 0,
  truncated: false,
  issues: [],
};

export async function getAdminOperationsFeed(limit = 500): Promise<AdminOperationsFeed> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return EMPTY_OPERATIONS;
  const { data, error } = await client.rpc("get_admin_operations_feed", { target_limit: limit });
  if (error || !data) throw new Error("Không thể tải hàng đợi vận hành lúc này.");
  const feed = data as unknown as AdminOperationsFeed;
  const { data: discussions, error: discussionError } = await client.from("telegram_actions")
    .select("booking_id").eq("action_type", "NEED_DISCUSSION").eq("status", "used").is("discussion_resolved_at", null);
  if (discussionError) throw new Error("Không thể tải tín hiệu Telegram lúc này.");
  const bookingIds = new Set((discussions ?? []).map((item) => item.booking_id));
  return { ...feed, bookings: feed.bookings.map((booking) => ({ ...booking, has_open_telegram_discussion: bookingIds.has(booking.id) })) };
}

export async function getAdminDataHealth(limit = 200): Promise<AdminDataHealthFeed> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return EMPTY_HEALTH;
  const { data, error } = await client.rpc("get_admin_data_health", { target_limit: limit });
  if (error || !data) throw new Error("Không thể tải kiểm tra Data Health lúc này.");
  const feed = data as unknown as AdminDataHealthFeed;
  const [suppliersResult, channelsResult, assignmentsResult, failedResult] = await Promise.all([
    client.from("suppliers").select("id,supplier_code,display_name").eq("status", "active"),
    client.from("supplier_communication_channels").select("id,supplier_id,status,is_primary,last_error_code").eq("is_primary", true),
    client.from("supplier_operations_assignments").select("supplier_id").eq("is_active", true),
    client.from("communication_outbox").select("id,supplier_id,last_error_code").eq("status", "failed").order("created_at", { ascending: false }).limit(100),
  ]);
  if (suppliersResult.error || channelsResult.error || assignmentsResult.error || failedResult.error) throw new Error("Không thể tải Data Health Telegram lúc này.");
  const channels = new Map((channelsResult.data ?? []).map((item) => [item.supplier_id, item]));
  const assigned = new Set((assignmentsResult.data ?? []).map((item) => item.supplier_id));
  const telegramIssues: DataHealthIssue[] = [];
  for (const supplier of suppliersResult.data ?? []) {
    const channel = channels.get(supplier.id);
    if (!channel || channel.status === "disabled") telegramIssues.push({ category: "supplier", code: "telegram_channel_missing", label: "Supplier chưa có nhóm Telegram active", entity_type: "supplier", entity_id: supplier.id, entity_label: supplier.display_name, path: `/admin/integrations/telegram#supplier-${supplier.id}`, fingerprint: `telegram-channel-missing:${supplier.id}` });
    else if (channel.status === "error") telegramIssues.push({ category: "supplier", code: "telegram_channel_error", label: "Nhóm Telegram cần xử lý", entity_type: "supplier", entity_id: supplier.id, entity_label: supplier.display_name, path: `/admin/integrations/telegram#supplier-${supplier.id}`, fingerprint: `telegram-channel-error:${supplier.id}:${channel.last_error_code ?? "unknown"}` });
    if (!assigned.has(supplier.id)) telegramIssues.push({ category: "supplier", code: "telegram_staff_assignment_missing", label: "Supplier chưa có nhân viên Tà Xùa Trip phụ trách", entity_type: "supplier", entity_id: supplier.id, entity_label: supplier.display_name, path: `/admin/integrations/telegram#supplier-${supplier.id}`, fingerprint: `telegram-assignment-missing:${supplier.id}` });
  }
  for (const failed of failedResult.data ?? []) telegramIssues.push({ category: "data_health", code: "telegram_delivery_failed", label: "Tin Telegram gửi thất bại", entity_type: "communication_outbox", entity_id: failed.id, entity_label: failed.last_error_code ?? "Telegram delivery", path: "/admin/integrations/telegram", fingerprint: `telegram-delivery-failed:${failed.id}` });
  const issues = [...feed.issues, ...telegramIssues].slice(0, Math.min(Math.max(limit, 1), 500));
  return { ...feed, policy_version: "phase11-data-health-v1", total_issues: feed.total_issues + telegramIssues.length, truncated: feed.truncated || feed.total_issues + telegramIssues.length > issues.length, issues };
}

export async function getAdminOperationsView(filters: OperationsFilters = {}): Promise<OperationsView> {
  const feed = await getAdminOperationsFeed();
  const view = buildOperationsView(feed.bookings, filters);
  return { ...view, source_total: feed.total_bookings, source_truncated: feed.truncated };
}

export async function getAdminBookingOperations(bookingId: string) {
  const feed = await getAdminOperationsFeed(1000);
  const booking = feed.bookings.find((item) => item.id === bookingId);
  return booking ? resolveBookingOperations(booking) : null;
}

export async function getAdminReplacementOptions() {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return { rooms: [], motorbikes: [] };
  const [roomsResult, propertiesResult, motorbikesResult] = await Promise.all([
    client.from("room_types").select("id,property_id,name,publish_status,is_active").eq("is_active", true).eq("publish_status", "published").order("name").limit(500),
    client.from("properties").select("id,name").limit(500),
    client.from("motorbike_offerings").select("id,display_name,publication_status,availability_state").eq("publication_status", "published").neq("availability_state", "unavailable").order("display_name").limit(200),
  ]);
  const propertyNames = new Map((propertiesResult.data ?? []).map((item) => [item.id, item.name]));
  return {
    rooms: (roomsResult.data ?? []).map((item) => ({ id: item.id, label: `${propertyNames.get(item.property_id) ?? "Lưu trú"} · ${item.name}` })),
    motorbikes: (motorbikesResult.data ?? []).map((item) => ({ id: item.id, label: item.display_name })),
  };
}
