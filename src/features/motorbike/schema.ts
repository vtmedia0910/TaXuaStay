import { z } from "zod";
import {
  MOTORBIKE_AVAILABILITY_STATES,
  MOTORBIKE_HELMET_STATUSES,
  MOTORBIKE_PRICE_SOURCES,
  MOTORBIKE_PUBLICATION_STATUSES,
  MOTORBIKE_TRANSMISSION_TYPES,
  MOTORBIKE_VEHICLE_CATEGORIES,
} from "@/features/motorbike/types";
import { blankToNull, optionalHttpsUrl, optionalNumber, optionalText, slugSchema } from "@/lib/validation";

const optionalId = z.preprocess(blankToNull, z.uuid().nullable());
const optionalDate = z.preprocess(blankToNull, z.iso.date().nullable());
const optionalDateTime = z.preprocess(blankToNull, z.iso.datetime({ local: true }).nullable());

export const motorbikeOfferingSchema = z.object({
  id: optionalId,
  supplier_id: z.uuid(),
  source_external_ref_id: z.uuid(),
  slug: slugSchema,
  display_name: z.string().trim().min(2).max(160),
  vehicle_category: z.enum(MOTORBIKE_VEHICLE_CATEGORIES),
  transmission_type: z.enum(MOTORBIKE_TRANSMISSION_TYPES),
  engine_class_cc: optionalNumber(z.coerce.number().int().min(40).max(1000)),
  suitable_for: optionalText(240),
  helmet_status: z.enum(MOTORBIKE_HELMET_STATUSES),
  pickup_summary: optionalText(300),
  return_summary: optionalText(300),
  public_description: optionalText(3000),
  image_media_id: optionalId,
  public_price_vnd: optionalNumber(z.coerce.number().int().min(1).max(100_000_000)),
  price_source: z.preprocess(blankToNull, z.enum(MOTORBIKE_PRICE_SOURCES).nullable()),
  price_checked_at: optionalDateTime,
  price_valid_until: optionalDate,
  availability_state: z.enum(MOTORBIKE_AVAILABILITY_STATES),
  public_request_url: optionalHttpsUrl,
  source_checked_at: optionalDateTime,
  publication_status: z.enum(MOTORBIKE_PUBLICATION_STATUSES),
  sort_order: z.coerce.number().int().min(0).max(10000),
  internal_notes: optionalText(10000),
}).superRefine((value, context) => {
  const priceFields = [value.price_source, value.price_checked_at, value.price_valid_until];
  if (value.public_price_vnd === null && priceFields.some(Boolean)) {
    context.addIssue({ code: "custom", path: ["public_price_vnd"], message: "Xóa toàn bộ nguồn/ngày giá khi chưa có giá công khai." });
  }
  if (value.public_price_vnd !== null && priceFields.some((field) => !field)) {
    context.addIssue({ code: "custom", path: ["public_price_vnd"], message: "Giá cần đủ nguồn, thời điểm kiểm tra và ngày hiệu lực." });
  }
  const now = new Date();
  if (value.price_checked_at && new Date(`${value.price_checked_at}+07:00`) > now) {
    context.addIssue({ code: "custom", path: ["price_checked_at"], message: "Thời điểm kiểm tra giá không được ở tương lai." });
  }
  if (value.source_checked_at && new Date(`${value.source_checked_at}+07:00`) > now) {
    context.addIssue({ code: "custom", path: ["source_checked_at"], message: "Thời điểm kiểm tra nguồn không được ở tương lai." });
  }
  if (value.price_checked_at && value.price_valid_until && value.price_valid_until < value.price_checked_at.slice(0, 10)) {
    context.addIssue({ code: "custom", path: ["price_valid_until"], message: "Hiệu lực giá không được kết thúc trước lúc kiểm tra." });
  }
  if (value.publication_status === "published" && !value.public_request_url) {
    context.addIssue({ code: "custom", path: ["public_request_url"], message: "Bản công khai cần URL xác nhận thủ công." });
  }
  if (value.publication_status === "published" && !value.source_checked_at) {
    context.addIssue({ code: "custom", path: ["source_checked_at"], message: "Bản công khai cần mốc kiểm tra nguồn." });
  }
});

export const motorbikeIdSchema = z.uuid();
export const motorbikeSlugSchema = slugSchema;
