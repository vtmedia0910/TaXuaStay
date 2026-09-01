"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import {
  applyChangeRequestSchema,
  buildChangePayload,
  createChangeRequestFormSchema,
  followUpConfirmationSchema,
  processExpiriesSchema,
  reviewChangeRequestSchema,
} from "@/features/operations/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function refreshOperations(bookingId?: string) {
  revalidatePath("/admin/operations");
  revalidatePath("/admin/operations/data-health");
  revalidatePath("/admin/bookings");
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`);
}
function failureCode(message?: string) {
  return message?.includes("Booking changed") ? "stale" : "operations-action";
}

export async function createBookingChangeRequestAction(formData: FormData) {
  await requireAdminUser();
  const parsed = createChangeRequestFormSchema.safeParse(Object.fromEntries(formData));
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!parsed.success) redirect(`/admin/bookings/${bookingId}?error=change-request`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("create_booking_change_request", {
    target_booking_id: parsed.data.booking_id,
    target_change_type: parsed.data.change_type,
    target_request_payload: buildChangePayload(parsed.data),
    target_customer_reason: parsed.data.customer_reason,
    target_internal_note: parsed.data.internal_note,
    target_expected_revision: parsed.data.expected_revision,
  });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=${failureCode(error.message)}`);
  refreshOperations(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=change-request`);
}

export async function reviewBookingChangeRequestAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = reviewChangeRequestSchema.safeParse(Object.fromEntries(formData));
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!parsed.success || (parsed.data.status !== "reviewing" && user.role !== "admin")) redirect(`/admin/bookings/${bookingId}?error=change-review`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("review_booking_change_request", {
    target_change_request_id: parsed.data.change_request_id,
    target_status: parsed.data.status,
    target_internal_note: parsed.data.internal_note,
    target_expected_revision: parsed.data.expected_revision,
  });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=${failureCode(error.message)}`);
  refreshOperations(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=change-review`);
}

export async function applyBookingChangeRequestAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = applyChangeRequestSchema.safeParse(Object.fromEntries(formData));
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!parsed.success || user.role !== "admin") redirect(`/admin/bookings/${bookingId}?error=change-apply`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("apply_booking_change_request", {
    target_change_request_id: parsed.data.change_request_id,
    target_expected_revision: parsed.data.expected_revision,
  });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=${failureCode(error.message)}`);
  refreshOperations(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=change-applied`);
}

export async function followUpSupplierConfirmationAction(formData: FormData) {
  await requireAdminUser();
  const parsed = followUpConfirmationSchema.safeParse(Object.fromEntries(formData));
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!parsed.success) redirect(`/admin/bookings/${bookingId}?error=confirmation-follow-up`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("follow_up_supplier_confirmation", {
    target_confirmation_id: parsed.data.confirmation_id,
    target_expected_updated_at: parsed.data.expected_updated_at,
    target_reason: parsed.data.reason,
  });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=${failureCode(error.message)}`);
  refreshOperations(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=confirmation-follow-up`);
}

export async function processOperationalExpiriesAction(formData: FormData) {
  await requireAdminUser();
  const parsed = processExpiriesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/operations?error=expiry-process");
  const client = await createServerSupabaseClient();
  if (!client) redirect("/admin/operations?error=config");
  const { error } = await client.rpc("process_operational_expiries", { target_limit: parsed.data.limit });
  if (error) redirect("/admin/operations?error=expiry-process");
  refreshOperations();
  redirect("/admin/operations?saved=expiry-process");
}
