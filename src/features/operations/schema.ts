import { z } from "zod";
import { ATTENTION_REASONS, PRIORITY_BUCKETS } from "@/features/operations/types";

const optionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && !value.trim() ? null : value,
  z.string().trim().max(maximum).nullable(),
);
const optionalInteger = z.preprocess(
  (value) => value === "" || value == null ? null : value,
  z.coerce.number().int().nullable(),
);
const optionalUuid = z.preprocess(
  (value) => value === "" || value == null ? null : value,
  z.uuid().nullable(),
);

export const operationsQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  view: z.enum(["all", "needs_attention", "pending", "overdue", "needs_requote", "quote_expiring", "declined", "replacement", "checkout_blocked", "ready", "cancelled", "completed"]).optional(),
  priority: z.enum(PRIORITY_BUCKETS).optional(),
  reason: z.enum(ATTENTION_REASONS).optional(),
  sort: z.enum(["priority", "oldest_pending", "trip_date", "quote_expiry", "newest"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
});

export const createChangeRequestFormSchema = z.object({
  booking_id: z.uuid(),
  expected_revision: z.coerce.number().int().positive(),
  change_type: z.enum(["dates", "guest_count", "room_quantity", "replace_item"]),
  check_in: z.iso.date().optional(),
  check_out: z.iso.date().optional(),
  adults: optionalInteger,
  children: optionalInteger,
  target_item_id: optionalUuid,
  quantity: optionalInteger,
  replacement_component_type: z.preprocess((value) => value === "" ? null : value, z.enum(["ROOM", "MOTORBIKE"]).nullable()),
  replacement_source_id: optionalUuid,
  customer_reason: optionalText(3000),
  internal_note: optionalText(5000),
}).superRefine((value, context) => {
  if (!value.customer_reason && !value.internal_note) {
    context.addIssue({ code: "custom", path: ["internal_note"], message: "Cần ít nhất một lý do thay đổi." });
  }
  if (value.change_type === "dates") {
    if (!value.check_in || !value.check_out || value.check_out <= value.check_in) context.addIssue({ code: "custom", path: ["check_out"], message: "Ngày mới chưa hợp lệ." });
  } else if (value.change_type === "guest_count") {
    if (value.adults === null || value.adults < 1 || value.adults > 100) context.addIssue({ code: "custom", path: ["adults"], message: "Số người lớn chưa hợp lệ." });
    if (value.children === null || value.children < 0 || value.children > 100) context.addIssue({ code: "custom", path: ["children"], message: "Số trẻ em chưa hợp lệ." });
  } else if (value.change_type === "room_quantity") {
    if (!value.target_item_id || value.quantity === null || value.quantity < 1 || value.quantity > 100) context.addIssue({ code: "custom", path: ["quantity"], message: "Chọn dịch vụ và số lượng hợp lệ." });
  } else if (!value.target_item_id || !value.replacement_component_type || !value.replacement_source_id) {
    context.addIssue({ code: "custom", path: ["replacement_source_id"], message: "Chọn dịch vụ cũ và nguồn thay thế hợp lệ." });
  }
});

export const reviewChangeRequestSchema = z.object({
  booking_id: z.uuid(),
  change_request_id: z.uuid(),
  status: z.enum(["reviewing", "approved", "rejected", "cancelled"]),
  expected_revision: z.coerce.number().int().positive(),
  internal_note: optionalText(5000),
}).superRefine((value, context) => {
  if (value.status !== "reviewing" && !value.internal_note) context.addIssue({ code: "custom", path: ["internal_note"], message: "Quyết định cần có căn cứ nội bộ." });
});

export const applyChangeRequestSchema = z.object({
  booking_id: z.uuid(),
  change_request_id: z.uuid(),
  expected_revision: z.coerce.number().int().positive(),
});

export const followUpConfirmationSchema = z.object({
  booking_id: z.uuid(),
  confirmation_id: z.uuid(),
  expected_updated_at: z.iso.datetime({ offset: true }),
  reason: z.string().trim().min(2).max(500),
});

export const processExpiriesSchema = z.object({ limit: z.coerce.number().int().min(1).max(500).default(200) });

export function buildChangePayload(value: z.output<typeof createChangeRequestFormSchema>) {
  switch (value.change_type) {
    case "dates": return { check_in: value.check_in as string, check_out: value.check_out as string };
    case "guest_count": return { adults: value.adults as number, children: value.children as number };
    case "room_quantity": return { target_item_id: value.target_item_id as string, quantity: value.quantity as number };
    case "replace_item": return {
      target_item_id: value.target_item_id as string,
      replacement_component_type: value.replacement_component_type as "ROOM" | "MOTORBIKE",
      replacement_source_id: value.replacement_source_id as string,
    };
  }
}
