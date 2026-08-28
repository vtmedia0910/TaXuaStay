import { z } from "zod";
import { EVIDENCE_TYPES, MEDIA_TYPES } from "@/features/media/types";
import {
  formCheckbox,
  optionalHttpsUrl,
  optionalLocalDateTime,
  optionalNumber,
  optionalText,
} from "@/lib/validation";

export const mediaAssetSchema = z
  .object({
    id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    property_id: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
    room_type_id: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
    media_type: z.enum(MEDIA_TYPES),
    evidence_type: z.enum(EVIDENCE_TYPES),
    url: z.url({ protocol: /^https$/ }).max(2048),
    thumbnail_url: optionalHttpsUrl,
    caption: optionalText(500),
    alt_text: z.string().trim().min(2).max(300),
    sort_order: z.coerce.number().int().min(0).max(100000),
    captured_at: optionalLocalDateTime,
    latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
    longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
    compass_heading_deg: optionalNumber(z.coerce.number().min(0).lt(360)),
    horizontal_fov_deg: optionalNumber(z.coerce.number().positive().max(360)),
    is_verified: formCheckbox,
  })
  .superRefine((value, context) => {
    if ((value.property_id === null) === (value.room_type_id === null)) {
      context.addIssue({
        code: "custom",
        path: ["property_id"],
        message: "Media phải thuộc đúng một nơi lưu trú hoặc một loại phòng.",
      });
    }

    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        path: [value.latitude === null ? "latitude" : "longitude"],
        message: "Latitude và longitude phải được nhập cùng nhau.",
      });
    }
  });

export type MediaAssetInput = z.infer<typeof mediaAssetSchema>;
