import { z } from "zod";
import {
  PROPERTY_TYPES,
  PUBLISH_STATUSES,
  ROAD_ACCESS_GRADES,
} from "@/features/properties/types";
import {
  formCheckbox,
  optionalHttpsUrl,
  optionalNumber,
  optionalText,
  slugSchema,
  timeSchema,
} from "@/lib/validation";

export const propertySchema = z
  .object({
    id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    slug: slugSchema,
    name: z.string().trim().min(2).max(160),
    property_type: z.enum(PROPERTY_TYPES),
    short_description: optionalText(300),
    description: optionalText(10000),
    area_name: z.string().trim().min(2).max(120),
    address: optionalText(500),
    latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
    longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
    altitude_m: optionalNumber(z.coerce.number().int().min(-500).max(9000)),
    google_maps_url: optionalHttpsUrl,
    public_phone: optionalText(30),
    public_zalo_url: optionalHttpsUrl,
    check_in_time: timeSchema,
    check_out_time: timeSchema,
    road_access_grade: z.enum(ROAD_ACCESS_GRADES),
    car_access: formCheckbox,
    motorbike_access: formCheckbox,
    parking: formCheckbox,
    restaurant: formCheckbox,
    breakfast: formCheckbox,
    bbq: formCheckbox,
    wifi: formCheckbox,
    is_featured: formCheckbox,
    is_active: formCheckbox,
    publish_status: z.enum(PUBLISH_STATUSES),
    amenity_ids: z.array(z.uuid()).default([]),
  })
  .superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        path: [value.latitude === null ? "latitude" : "longitude"],
        message: "Latitude và longitude phải được nhập cùng nhau.",
      });
    }

    if (value.check_in_time === value.check_out_time) {
      context.addIssue({
        code: "custom",
        path: ["check_out_time"],
        message: "Giờ check-in và check-out phải khác nhau.",
      });
    }

    if (value.publish_status === "published" && !value.is_active) {
      context.addIssue({
        code: "custom",
        path: ["is_active"],
        message: "Nơi lưu trú đã xuất bản phải hoạt động.",
      });
    }
  });

export type PropertyInput = z.infer<typeof propertySchema>;
