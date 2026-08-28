import { z } from "zod";
import { PUBLISH_STATUSES } from "@/features/properties/types";
import { BATHROOM_TYPES, VIEW_TYPES } from "@/features/rooms/types";
import {
  formCheckbox,
  optionalNumber,
  optionalText,
  slugSchema,
} from "@/lib/validation";

export const roomTypeSchema = z
  .object({
    id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    property_id: z.uuid(),
    slug: slugSchema,
    name: z.string().trim().min(2).max(160),
    short_description: optionalText(300),
    description: optionalText(10000),
    capacity_adults: z.coerce.number().int().min(1).max(50),
    capacity_children: z.coerce.number().int().min(0).max(50),
    max_guests: z.coerce.number().int().min(1).max(100),
    bed_type: optionalText(120),
    bed_count: optionalNumber(z.coerce.number().int().min(1).max(50)),
    bathroom_type: z.enum(BATHROOM_TYPES),
    quantity: z.coerce.number().int().min(0).max(1000),
    size_m2: optionalNumber(z.coerce.number().positive().max(10000)),
    floor_label: optionalText(80),
    has_private_balcony: formCheckbox,
    view_type: z.enum(VIEW_TYPES),
    is_active: formCheckbox,
    publish_status: z.enum(PUBLISH_STATUSES),
    amenity_ids: z.array(z.uuid()).default([]),
  })
  .superRefine((value, context) => {
    if (
      value.max_guests < value.capacity_adults ||
      value.max_guests > value.capacity_adults + value.capacity_children
    ) {
      context.addIssue({
        code: "custom",
        path: ["max_guests"],
        message: "Số khách tối đa phải phù hợp sức chứa người lớn và trẻ em.",
      });
    }

    if (value.publish_status === "published" && (!value.is_active || value.quantity < 1)) {
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Phòng đã xuất bản phải hoạt động và có ít nhất một đơn vị vật lý.",
      });
    }
  });

export type RoomTypeInput = z.infer<typeof roomTypeSchema>;
