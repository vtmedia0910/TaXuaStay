import { z } from "zod";
import { enumerateLodgingNights } from "@/lib/lodging-dates";

const roomSelection = z.object({
  type: z.literal("ROOM"),
  source_id: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(100).optional(),
});
const packageSelection = z.object({
  type: z.literal("PACKAGE"),
  source_id: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(1).optional(),
  optional_component_keys: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80)).max(50).default([]),
});
const motorbikeSelection = z.object({
  type: z.literal("MOTORBIKE"),
  source_slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(2).max(120),
  quantity: z.coerce.number().int().min(1).max(20).optional(),
});

export const publicBookingSelectionSchema = z.discriminatedUnion("type", [roomSelection, packageSelection, motorbikeSelection]);

function parseSelections(value: unknown) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}

const optionalEmail = z.preprocess((value) => typeof value === "string" && !value.trim() ? null : value, z.email().max(254).nullable());
const optionalShort = (maximum: number) => z.preprocess((value) => typeof value === "string" && !value.trim() ? null : value, z.string().trim().max(maximum).nullable());
const optionalZalo = z.preprocess((value) => typeof value === "string" && !value.trim() ? null : value, z.string().trim().min(3).max(160).nullable());

export const bookingRequestSchema = z.object({
  check_in: z.iso.date(),
  check_out: z.iso.date(),
  adults: z.coerce.number().int().min(1).max(100),
  children: z.coerce.number().int().min(0).max(100),
  rooms: z.coerce.number().int().min(1).max(100),
  customer_name: z.string().trim().min(2).max(160),
  customer_phone: z.string().trim().min(6).max(30),
  customer_email: optionalEmail,
  customer_zalo: optionalZalo,
  customer_note: optionalShort(3000),
  selections: z.preprocess(parseSelections, z.array(publicBookingSelectionSchema).min(1).max(8)),
  request_token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  rendered_at: z.coerce.number().int().positive(),
  website: z.string().max(0),
}).superRefine((value, context) => {
  if (!enumerateLodgingNights(value.check_in, value.check_out, 31).length) {
    context.addIssue({ code: "custom", path: ["check_out"], message: "Ngày trả phải sau ngày nhận và không quá 31 đêm." });
  }
  if (value.rendered_at > Date.now() + 60_000 || Date.now() - value.rendered_at > 6 * 60 * 60 * 1000) {
    context.addIssue({ code: "custom", path: ["rendered_at"], message: "Phiên gửi yêu cầu đã hết hạn. Hãy tải lại trang." });
  }
  for (const [field, content] of [["customer_name", value.customer_name], ["customer_phone", value.customer_phone], ["customer_note", value.customer_note]] as const) {
    if (content?.includes("<") || content?.includes(">")) context.addIssue({ code: "custom", path: [field], message: "Vui lòng nhập văn bản thuần, không dùng mã HTML." });
  }
});

export const bookingCodeSchema = z.string().regex(/^TX-[0-9]{8}-[A-Z0-9]{6}$/);
export const bookingIdSchema = z.uuid();
export const bookingLifecycleActionSchema = z.object({
  booking_id: z.uuid(),
  status: z.enum(["active", "cancelled", "completed", "expired"]),
  note: optionalShort(5000),
});
export const bookingInternalNoteActionSchema = z.object({ booking_id: z.uuid(), note: optionalShort(10_000) });
export const supplierConfirmationActionSchema = z.object({
  booking_item_id: z.uuid(),
  status: z.enum(["requested", "confirmed", "declined", "expired", "cancelled"]),
  note: optionalShort(5000),
  external_reference: optionalShort(500),
  expires_at: z.preprocess((value) => typeof value === "string" && !value ? null : value, z.iso.datetime({ local: true }).nullable()),
});
