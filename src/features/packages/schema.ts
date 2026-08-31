import { z } from "zod";
import {
  ACTIVE_PACKAGE_COMPONENT_TYPES,
  PACKAGE_CONFIRMATION_MODES,
  PACKAGE_COST_SOURCES,
  PACKAGE_LIFECYCLE_STATUSES,
  PACKAGE_PRICE_SOURCES,
} from "@/features/packages/types";
import { blankToNull, optionalHttpsUrl, optionalNumber, optionalText, slugSchema } from "@/lib/validation";

const optionalId = z.preprocess(blankToNull, z.uuid().nullable());
const optionalDate = z.preprocess(blankToNull, z.iso.date().nullable());
const optionalDateTime = z.preprocess(blankToNull, z.iso.datetime({ local: true }).nullable());

export const packageComponentInputSchema = z.object({
  component_key: slugSchema,
  component_type: z.enum(ACTIVE_PACKAGE_COMPONENT_TYPES),
  room_type_id: optionalId,
  motorbike_offering_id: optionalId,
  custom_code: z.preprocess(blankToNull, slugSchema.nullable()),
  custom_name: optionalText(160),
  custom_description: optionalText(3000),
  is_required: z.boolean(),
  quantity: z.coerce.number().int().min(1).max(100),
  sort_order: z.coerce.number().int().min(0).max(10000),
  confirmation_mode: z.enum(PACKAGE_CONFIRMATION_MODES).refine((value) => value !== "instant", "Phase 6 chưa hỗ trợ xác nhận tức thời."),
  public_copy_override: optionalText(500),
  unit_cost_vnd: optionalNumber(z.coerce.number().int().min(0).max(1_000_000_000)),
  cost_source: z.preprocess(blankToNull, z.enum(PACKAGE_COST_SOURCES).nullable()),
  cost_verified_at: optionalDateTime,
  cost_valid_until: optionalDate,
  internal_notes: optionalText(10000),
}).superRefine((value, context) => {
  const sourceCount = Number(Boolean(value.room_type_id)) + Number(Boolean(value.motorbike_offering_id));
  if (value.component_type === "ROOM" && (!value.room_type_id || sourceCount !== 1)) {
    context.addIssue({ code: "custom", path: ["room_type_id"], message: "Lưu trú cần đúng một nguồn Room Type." });
  }
  if (value.component_type === "MOTORBIKE" && (!value.motorbike_offering_id || sourceCount !== 1)) {
    context.addIssue({ code: "custom", path: ["motorbike_offering_id"], message: "Xe máy cần đúng một nguồn Phase 5." });
  }
  if (value.component_type === "MOTORBIKE" && value.confirmation_mode !== "manual") {
    context.addIssue({ code: "custom", path: ["confirmation_mode"], message: "Xe máy luôn xác nhận thủ công." });
  }
  if (value.component_type === "CUSTOM" && (!value.custom_code || !value.custom_name || sourceCount !== 0)) {
    context.addIssue({ code: "custom", path: ["custom_name"], message: "Nội dung riêng cần code, tên và không nhận UUID nguồn." });
  }
  if (value.component_type === "ROOM" && value.unit_cost_vnd !== null) {
    context.addIssue({ code: "custom", path: ["unit_cost_vnd"], message: "Chi phí phòng phải lấy từ Commercial Economics." });
  }
  const costCompanions = [value.cost_source, value.cost_verified_at, value.cost_valid_until];
  if (value.unit_cost_vnd === null && costCompanions.some(Boolean)) {
    context.addIssue({ code: "custom", path: ["unit_cost_vnd"], message: "Xóa toàn bộ nguồn/ngày khi chưa có chi phí." });
  }
  if (value.unit_cost_vnd !== null && costCompanions.some((item) => !item)) {
    context.addIssue({ code: "custom", path: ["unit_cost_vnd"], message: "Chi phí cần đủ nguồn, mốc kiểm tra và ngày hiệu lực." });
  }
});

export const packagePriceRuleInputSchema = z.object({
  rule_key: slugSchema,
  price_vnd: z.coerce.number().int().min(1).max(2_000_000_000),
  effective_from: optionalDate,
  effective_until: optionalDate,
  adults_min: optionalNumber(z.coerce.number().int().min(1).max(100)),
  adults_max: optionalNumber(z.coerce.number().int().min(1).max(100)),
  children_min: optionalNumber(z.coerce.number().int().min(0).max(100)),
  children_max: optionalNumber(z.coerce.number().int().min(0).max(100)),
  rooms_min: optionalNumber(z.coerce.number().int().min(1).max(100)),
  rooms_max: optionalNumber(z.coerce.number().int().min(1).max(100)),
  selected_optional_component_keys: z.array(slugSchema).max(50),
  priority: z.coerce.number().int().min(-10000).max(10000),
  price_source: z.enum(PACKAGE_PRICE_SOURCES),
  verified_at: z.iso.datetime({ local: true }),
  price_valid_until: z.iso.date(),
  is_active: z.boolean(),
  internal_notes: optionalText(10000),
}).superRefine((value, context) => {
  for (const [minKey, maxKey] of [["adults_min", "adults_max"], ["children_min", "children_max"], ["rooms_min", "rooms_max"]] as const) {
    const min = value[minKey];
    const max = value[maxKey];
    if (min !== null && max !== null && min > max) context.addIssue({ code: "custom", path: [maxKey], message: "Giới hạn tối đa phải lớn hơn hoặc bằng tối thiểu." });
  }
  if (value.effective_from && value.effective_until && value.effective_from > value.effective_until) {
    context.addIssue({ code: "custom", path: ["effective_until"], message: "Ngày kết thúc không được trước ngày bắt đầu." });
  }
  if (value.price_valid_until < value.verified_at.slice(0, 10)) {
    context.addIssue({ code: "custom", path: ["price_valid_until"], message: "Hiệu lực giá không được kết thúc trước mốc kiểm tra." });
  }
  if (new Date(`${value.verified_at}+07:00`) > new Date()) {
    context.addIssue({ code: "custom", path: ["verified_at"], message: "Mốc kiểm tra giá không được ở tương lai." });
  }
});

function parseJsonArray(value: unknown) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}

export const packageCommerceSchema = z.object({
  id: optionalId,
  destination_id: z.uuid(),
  code: slugSchema,
  slug: slugSchema,
  name: z.string().trim().min(2).max(160),
  proposition: z.string().trim().min(2).max(240),
  description: optionalText(5000),
  lifecycle_status: z.enum(PACKAGE_LIFECYCLE_STATUSES),
  valid_from: optionalDate,
  valid_until: optionalDate,
  confirmation_mode: z.enum(PACKAGE_CONFIRMATION_MODES).refine((value) => value !== "instant", "Phase 6 chưa hỗ trợ xác nhận tức thời."),
  public_request_url: optionalHttpsUrl,
  is_featured: z.preprocess((value) => value === "on" || value === true, z.boolean()),
  sort_order: z.coerce.number().int().min(0).max(10000),
  hero_media_id: optionalId,
  internal_notes: optionalText(10000),
  components: z.preprocess(parseJsonArray, z.array(packageComponentInputSchema).max(100)),
  price_rules: z.preprocess(parseJsonArray, z.array(packagePriceRuleInputSchema).max(100)),
}).superRefine((value, context) => {
  if (value.valid_from && value.valid_until && value.valid_from > value.valid_until) {
    context.addIssue({ code: "custom", path: ["valid_until"], message: "Ngày kết thúc không được trước ngày bắt đầu." });
  }
  const componentKeys = value.components.map((component) => component.component_key);
  if (new Set(componentKeys).size !== componentKeys.length) {
    context.addIssue({ code: "custom", path: ["components"], message: "Component key phải duy nhất trong gói." });
  }
  const ruleKeys = value.price_rules.map((rule) => rule.rule_key);
  if (new Set(ruleKeys).size !== ruleKeys.length) {
    context.addIssue({ code: "custom", path: ["price_rules"], message: "Rule key phải duy nhất trong gói." });
  }
  const optionalKeys = new Set(value.components.filter((component) => !component.is_required).map((component) => component.component_key));
  if (value.price_rules.some((rule) => rule.selected_optional_component_keys.some((key) => !optionalKeys.has(key)))) {
    context.addIssue({ code: "custom", path: ["price_rules"], message: "Giá chỉ được tham chiếu component tự chọn trong cùng gói." });
  }
  if (value.lifecycle_status === "published" && value.components.length === 0) {
    context.addIssue({ code: "custom", path: ["components"], message: "Gói công khai cần ít nhất một thành phần thật." });
  }
});

export const packageIdSchema = z.uuid();
export const packageSlugSchema = slugSchema;

export const packageQuoteInputSchema = z.object({
  check_in: z.iso.date(),
  check_out: z.iso.date(),
  adults: z.coerce.number().int().min(1).max(100).default(2),
  children: z.coerce.number().int().min(0).max(100).default(0),
  rooms: z.coerce.number().int().min(1).max(100).default(1),
  selected_optional_component_keys: z.preprocess((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value) return value.split(",");
    return [];
  }, z.array(slugSchema).max(50)),
});
