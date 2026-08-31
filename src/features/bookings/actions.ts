"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { BOOKING_ACCESS_COOKIE } from "@/features/bookings/data";
import { bookingInternalNoteActionSchema, bookingLifecycleActionSchema, bookingRequestSchema, supplierConfirmationActionSchema } from "@/features/bookings/schema";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface BookingRequestActionState { error?: string }

function canonicalFingerprint(value: ReturnType<typeof bookingRequestSchema.parse>) {
  return JSON.stringify({
    check_in: value.check_in,
    check_out: value.check_out,
    adults: value.adults,
    children: value.children,
    rooms: value.rooms,
    customer: {
      name: value.customer_name,
      phone: value.customer_phone.replace(/\s+/g, ""),
      email: value.customer_email?.toLocaleLowerCase("vi") ?? null,
      zalo: value.customer_zalo,
      note: value.customer_note,
    },
    selections: value.selections,
  });
}

export async function submitBookingRequestAction(_: BookingRequestActionState, formData: FormData): Promise<BookingRequestActionState> {
  const parsed = bookingRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin chưa hợp lệ." };
  const client = createPublicSupabaseClient();
  if (!client) return { error: "Kênh gửi yêu cầu chưa được cấu hình. Vui lòng thử lại sau." };
  const value = parsed.data;
  const tokenHash = createHash("sha256").update(value.request_token).digest("hex");
  const fingerprint = createHash("sha256").update(canonicalFingerprint(value)).digest("hex");
  const request = {
    check_in: value.check_in,
    check_out: value.check_out,
    adults: value.adults,
    children: value.children,
    rooms: value.rooms,
    selections: value.selections,
    customer: { name: value.customer_name, phone: value.customer_phone, email: value.customer_email, zalo: value.customer_zalo, note: value.customer_note },
  };
  const { data, error } = await client.rpc("create_public_booking_request", { target_request: request, target_token_hash: tokenHash, target_request_fingerprint: fingerprint });
  const row = Array.isArray(data) ? data[0] as { booking_code?: string } | undefined : data as { booking_code?: string } | null;
  if (error || !row?.booking_code) return { error: "Chưa thể gửi yêu cầu. Nguồn, giá hoặc tình trạng có thể vừa thay đổi; hãy kiểm tra lại." };
  const cookieStore = await cookies();
  cookieStore.set(BOOKING_ACCESS_COOKIE, `${row.booking_code}.${value.request_token}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/booking", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/booking/${row.booking_code}`);
}

export async function updateBookingLifecycleAction(formData: FormData) {
  const user = await requireAdminUser();
  const parsed = bookingLifecycleActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || (parsed.data.status === "cancelled" && user.role !== "admin")) redirect("/admin/bookings?error=booking-action");
  const client = await createServerSupabaseClient();
  if (!client) redirect("/admin/bookings?error=config");
  const { error } = await client.rpc("update_booking_lifecycle", { target_booking_id: parsed.data.booking_id, target_status: parsed.data.status, target_note: parsed.data.note });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=booking-action`);
  revalidatePath("/admin/bookings"); revalidatePath(`/admin/bookings/${parsed.data.booking_id}`);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=booking`);
}

export async function updateBookingInternalNoteAction(formData: FormData) {
  await requireAdminUser();
  const parsed = bookingInternalNoteActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/bookings?error=booking-note");
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${parsed.data.booking_id}?error=config`);
  const { error } = await client.rpc("update_booking_internal_note", { target_booking_id: parsed.data.booking_id, target_note: parsed.data.note });
  if (error) redirect(`/admin/bookings/${parsed.data.booking_id}?error=booking-note`);
  revalidatePath("/admin/bookings"); revalidatePath(`/admin/bookings/${parsed.data.booking_id}`);
  redirect(`/admin/bookings/${parsed.data.booking_id}?saved=note`);
}

export async function updateSupplierConfirmationAction(formData: FormData) {
  await requireAdminUser();
  const bookingId = String(formData.get("booking_id") ?? "");
  const parsed = supplierConfirmationActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/bookings/${bookingId}?error=confirmation-action`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`/admin/bookings/${bookingId}?error=config`);
  const expiresAt = parsed.data.expires_at ? `${parsed.data.expires_at.length === 16 ? `${parsed.data.expires_at}:00` : parsed.data.expires_at}+07:00` : null;
  const { error } = await client.rpc("update_supplier_confirmation", { target_booking_item_id: parsed.data.booking_item_id, target_status: parsed.data.status, target_note: parsed.data.note, target_external_reference: parsed.data.external_reference, target_expires_at: expiresAt });
  if (error) redirect(`/admin/bookings/${bookingId}?error=confirmation-action`);
  revalidatePath("/admin/bookings"); revalidatePath(`/admin/bookings/${bookingId}`);
  redirect(`/admin/bookings/${bookingId}?saved=confirmation`);
}
