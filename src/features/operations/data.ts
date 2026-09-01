import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import type { AdminDataHealthFeed, AdminOperationsFeed, OperationsView } from "@/features/operations/types";
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
  return data as unknown as AdminOperationsFeed;
}

export async function getAdminDataHealth(limit = 200): Promise<AdminDataHealthFeed> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return EMPTY_HEALTH;
  const { data, error } = await client.rpc("get_admin_data_health", { target_limit: limit });
  if (error || !data) throw new Error("Không thể tải kiểm tra Data Health lúc này.");
  return data as unknown as AdminDataHealthFeed;
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
