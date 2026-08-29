import { z } from "zod";
import { PUBLISH_STATUSES } from "@/features/properties/types";
import {
  formCheckbox,
  optionalNumber,
  optionalText,
  slugSchema,
} from "@/lib/validation";

export const destinationSchema = z
  .object({
    id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    slug: slugSchema,
    name: z.string().trim().min(2).max(160),
    short_name: optionalText(80),
    province: optionalText(120),
    country_code: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    timezone: z.string().trim().min(1).max(100),
    latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
    longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
    altitude_reference_m: optionalNumber(z.coerce.number().int().min(0).max(9000)),
    description: optionalText(10000),
    is_active: formCheckbox,
    publish_status: z.enum(PUBLISH_STATUSES),
  })
  .superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        path: [value.latitude === null ? "latitude" : "longitude"],
        message: "Latitude và longitude phải được nhập cùng nhau.",
      });
    }

    if (value.publish_status === "published" && !value.is_active) {
      context.addIssue({
        code: "custom",
        path: ["is_active"],
        message: "Điểm đến đã xuất bản phải hoạt động.",
      });
    }
  });

export type DestinationInput = z.infer<typeof destinationSchema>;
