import { z } from "zod";
import { commercialVerificationDatesAreConsistent } from "@/features/economics/policy";
import { COMMERCIAL_PLAN_STATUSES, COMMERCIAL_SOURCES } from "@/features/economics/types";
import { RATE_TYPES } from "@/features/pricing/types";
import { blankToNull, formCheckbox, optionalNumber, optionalText } from "@/lib/validation";

const optionalDate = z.preprocess(blankToNull, z.iso.date().nullable());
const optionalMoney = optionalNumber(z.coerce.number().int().min(0).max(2_000_000_000));

export const commercialRatePlanSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.uuid().optional()),
  supplier_id: z.uuid(),
  property_id: z.uuid(),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  name: z.string().trim().min(2).max(160),
  valid_from: optionalDate,
  valid_until: optionalDate,
  priority: z.coerce.number().int().min(-10000).max(10000),
  status: z.enum(COMMERCIAL_PLAN_STATUSES),
  source: z.enum(COMMERCIAL_SOURCES),
  contract_reference: optionalText(500),
  notes_internal: optionalText(10000),
}).superRefine((value, context) => {
  if (value.valid_from && value.valid_until && value.valid_from > value.valid_until) {
    context.addIssue({ code: "custom", path: ["valid_until"], message: "Ngày kết thúc phải từ ngày bắt đầu trở đi." });
  }
});

export const roomCommercialRuleSchema = z.object({
  id: z.preprocess((value) => value === "" ? undefined : value, z.uuid().optional()),
  commercial_rate_plan_id: z.uuid(),
  supplier_id: z.uuid(),
  property_id: z.uuid(),
  room_type_id: z.uuid(),
  rate_type: z.enum(RATE_TYPES),
  net_cost_vnd: optionalMoney,
  market_reference_vnd: optionalMoney,
  effective_from: optionalDate,
  effective_until: optionalDate,
  iso_weekdays: z.array(z.coerce.number().int().min(1).max(7)).max(7).transform((days) => [...new Set(days)].sort()),
  priority: z.coerce.number().int().min(-10000).max(10000),
  source: z.enum(COMMERCIAL_SOURCES),
  verified_at: z.preprocess(blankToNull, z.iso.datetime({ local: true }).nullable()),
  valid_until: optionalDate,
  is_active: formCheckbox,
  notes_internal: optionalText(10000),
}).superRefine((value, context) => {
  if (value.net_cost_vnd === null && value.market_reference_vnd === null) {
    context.addIssue({ code: "custom", path: ["net_cost_vnd"], message: "Cần nhập giá vốn hoặc tham chiếu thị trường." });
  }
  if (value.effective_from && value.effective_until && value.effective_from > value.effective_until) {
    context.addIssue({ code: "custom", path: ["effective_until"], message: "Ngày kết thúc phải từ ngày bắt đầu trở đi." });
  }
  if (["peak", "holiday", "override"].includes(value.rate_type) && (!value.effective_from || !value.effective_until)) {
    context.addIssue({ code: "custom", path: ["effective_from"], message: "Cao điểm, lễ và điều chỉnh riêng cần khoảng ngày rõ ràng." });
  }
  if (value.verified_at) {
    const submitted = new Date(`${value.verified_at}+07:00`);
    if (submitted.getTime() > Date.now()) {
      context.addIssue({ code: "custom", path: ["verified_at"], message: "Thời điểm xác minh không được ở tương lai." });
    }
  }
  if (!commercialVerificationDatesAreConsistent(value.verified_at, value.valid_until)) {
    context.addIssue({ code: "custom", path: ["valid_until"], message: "Hạn xác minh không được trước ngày xác minh theo giờ Việt Nam." });
  }
});

export const economicsPreviewSchema = z.object({
  room_type_id: z.uuid(),
  check_in: z.iso.date(),
  check_out: z.iso.date(),
}).refine((value) => value.check_out > value.check_in, {
  path: ["check_out"],
  message: "Ngày trả phòng phải sau ngày nhận phòng.",
});
