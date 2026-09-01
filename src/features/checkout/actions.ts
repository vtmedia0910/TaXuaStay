"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { cancelCheckoutSchema, checkoutDraftSchema, depositPolicySchema, requoteBookingSchema } from "@/features/checkout/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function vietnamTimestamp(value: string | null) {
  if (!value) return null;
  return `${value.length === 16 ? `${value}:00` : value}+07:00`;
}
function refreshBooking(id: string) {
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
}

export async function requoteBookingAction(formData: FormData) {
  await requireAdminUser();
  const parsed = requoteBookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/bookings?error=requote");
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("requote_booking", { target_booking_id: parsed.data.booking_id, target_reason: parsed.data.reason });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=requote`);
  refreshBooking(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=requote`);
}

export async function setDepositPolicyAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = depositPolicySchema.safeParse(Object.fromEntries(formData));
  const bookingId = String(formData.get("booking_id") ?? "");
  if (!parsed.success || user.role !== "admin") redirect(`/admin/bookings/${bookingId}?error=deposit-policy`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("set_booking_deposit_policy", {
    target_booking_id: parsed.data.booking_id,
    target_policy_type: parsed.data.policy_type,
    target_fixed_amount_vnd: parsed.data.policy_type === "fixed_amount" ? parsed.data.fixed_amount_vnd : null,
    target_percentage_bps: parsed.data.policy_type === "percentage" ? parsed.data.percentage_bps : null,
    target_free_cancel_until: vietnamTimestamp(parsed.data.free_cancel_until),
    target_non_refundable_after: vietnamTimestamp(parsed.data.non_refundable_after),
    target_manual_policy: parsed.data.manual_policy,
    target_cancellation_terms: parsed.data.cancellation_terms,
  });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=deposit-policy`);
  refreshBooking(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=deposit-policy`);
}

export async function createCheckoutDraftAction(formData: FormData) {
  await requireAdminUser();
  const parsed = checkoutDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/bookings?error=checkout-draft");
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("create_checkout_draft", { target_booking_id: parsed.data.booking_id });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=checkout-draft`);
  refreshBooking(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=checkout-draft`);
}

export async function cancelCheckoutDraftAction(formData: FormData) {
  await requireAdminUser();
  const parsed = cancelCheckoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/bookings?error=checkout-cancel");
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("cancel_checkout_draft", { target_checkout_session_id: parsed.data.checkout_session_id, target_reason: parsed.data.reason });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=checkout-cancel`);
  refreshBooking(parsed.data.booking_id);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=checkout-cancel`);
}
