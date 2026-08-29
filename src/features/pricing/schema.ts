import { z } from "zod";
import { priceVerificationDatesAreConsistent } from "@/features/pricing/policy";
import { PRICE_SOURCES, RATE_TYPES } from "@/features/pricing/types";
import { blankToNull, formCheckbox, optionalNumber, optionalText } from "@/lib/validation";

const optionalDate = z.preprocess(blankToNull, z.iso.date().nullable());
const money = optionalNumber(z.coerce.number().int().min(0).max(2_000_000_000));

export const ratePlanSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.uuid().optional()),
  property_id: z.uuid(),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().trim().min(2).max(120),
  description: optionalText(3000),
  valid_from: optionalDate,
  valid_until: optionalDate,
  priority: z.coerce.number().int().min(-10000).max(10000),
  is_active: formCheckbox,
  publish_status: z.enum(["draft", "published", "archived"]),
}).superRefine((value, context) => {
  if (value.valid_from && value.valid_until && value.valid_from > value.valid_until) {
    context.addIssue({ code: "custom", path: ["valid_until"], message: "Ngày kết thúc phải từ ngày bắt đầu trở đi." });
  }
  if (value.publish_status === "published" && !value.is_active) {
    context.addIssue({ code: "custom", path: ["is_active"], message: "Bảng giá công khai phải hoạt động." });
  }
  if (value.publish_status === "archived" && value.is_active) {
    context.addIssue({ code: "custom", path: ["is_active"], message: "Bảng giá lưu trữ phải ngừng hoạt động." });
  }
});

export const roomRateRuleSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.uuid().optional()),
  rate_plan_id: z.uuid(),
  room_type_id: z.uuid(),
  rate_type: z.enum(RATE_TYPES),
  price_vnd: z.coerce.number().int().min(0).max(2_000_000_000),
  extra_adult_vnd: money,
  extra_child_vnd: money,
  valid_from: optionalDate,
  valid_until: optionalDate,
  days_of_week: z.array(z.coerce.number().int().min(1).max(7)).max(7).transform((days) => [...new Set(days)].sort()),
  priority: z.coerce.number().int().min(-10000).max(10000),
  source: z.enum(PRICE_SOURCES),
  price_verified_at: z.preprocess(blankToNull, z.iso.datetime({ local: true }).nullable()),
  price_valid_until: optionalDate,
  is_active: formCheckbox,
  internal_notes: optionalText(3000),
}).superRefine((value, context) => {
  if (value.valid_from && value.valid_until && value.valid_from > value.valid_until) {
    context.addIssue({ code: "custom", path: ["valid_until"], message: "Ngày kết thúc phải từ ngày bắt đầu trở đi." });
  }
  if (["peak", "holiday", "override"].includes(value.rate_type) && (!value.valid_from || !value.valid_until)) {
    context.addIssue({ code: "custom", path: ["valid_from"], message: "Giá cao điểm, lễ hoặc điều chỉnh riêng cần khoảng ngày rõ ràng." });
  }
  if (value.price_verified_at) {
    const submitted = new Date(`${value.price_verified_at}+07:00`);
    if (submitted.getTime() > Date.now()) {
      context.addIssue({ code: "custom", path: ["price_verified_at"], message: "Thời điểm xác minh không được ở tương lai." });
    }
  }
  if (!priceVerificationDatesAreConsistent(value.price_verified_at, value.price_valid_until)) {
    context.addIssue({
      code: "custom",
      path: ["price_valid_until"],
      message: "Ngày hết xác minh không được trước ngày xác minh theo giờ Việt Nam.",
    });
  }
});

export const pricingPreviewSchema = z.object({
  room_type_id: z.uuid(),
  check_in: z.iso.date(),
  check_out: z.iso.date(),
  adults: z.coerce.number().int().min(1).max(30).default(2),
  children: z.coerce.number().int().min(0).max(20).default(0),
}).refine((value) => value.check_out > value.check_in, {
  path: ["check_out"],
  message: "Ngày trả phòng phải sau ngày nhận phòng.",
});
