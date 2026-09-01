import { z } from "zod";
import { DEPOSIT_POLICY_TYPES } from "@/features/checkout/types";

const optionalText = (max: number) => z.preprocess((value) => value == null || typeof value === "string" && !value.trim() ? null : value, z.string().trim().max(max).nullable());
const optionalInteger = z.preprocess((value) => value === "" || value == null ? null : value, z.coerce.number().int().nullable());
const optionalLocalDateTime = z.preprocess((value) => value === "" || value == null ? null : value, z.iso.datetime({ local: true }).nullable());

export const requoteBookingSchema = z.object({ booking_id: z.uuid(), reason: z.string().trim().min(2).max(500) });
export const depositPolicySchema = z.object({
  booking_id: z.uuid(),
  policy_type: z.enum(DEPOSIT_POLICY_TYPES),
  fixed_amount_vnd: optionalInteger,
  percentage_bps: optionalInteger,
  free_cancel_until: optionalLocalDateTime,
  non_refundable_after: optionalLocalDateTime,
  manual_policy: optionalText(5000),
  cancellation_terms: optionalText(10_000),
}).superRefine((value, context) => {
  if (value.policy_type === "fixed_amount" && (value.fixed_amount_vnd === null || value.fixed_amount_vnd < 0)) context.addIssue({ code: "custom", path: ["fixed_amount_vnd"], message: "Nhập số tiền cố định hợp lệ." });
  if (value.policy_type === "percentage" && (value.percentage_bps === null || value.percentage_bps < 1 || value.percentage_bps > 10_000)) context.addIssue({ code: "custom", path: ["percentage_bps"], message: "Tỷ lệ phải từ 1 đến 10.000 basis points." });
  if (value.free_cancel_until && value.non_refundable_after && new Date(value.free_cancel_until) > new Date(value.non_refundable_after)) context.addIssue({ code: "custom", path: ["non_refundable_after"], message: "Mốc không hoàn lại không được trước hạn hủy miễn phí." });
});
export const checkoutDraftSchema = z.object({ booking_id: z.uuid() });
export const cancelCheckoutSchema = z.object({ booking_id: z.uuid(), checkout_session_id: z.uuid(), reason: optionalText(500) });
