import { z } from "zod";
import { PUBLISH_STATUSES } from "@/features/properties/types";
import { formCheckbox, optionalText } from "@/lib/validation";

const roomCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/));

export const physicalRoomSchema = z
  .object({
    id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    property_id: z.uuid(),
    room_type_id: z.uuid(),
    room_code: roomCodeSchema,
    display_name: optionalText(160),
    floor_label: optionalText(80),
    unit_label: optionalText(80),
    position_notes: optionalText(3000),
    exact_room_bookable: formCheckbox,
    is_active: formCheckbox,
    publish_status: z.enum(PUBLISH_STATUSES),
  })
  .superRefine((value, context) => {
    if (value.publish_status === "published" && !value.is_active) {
      context.addIssue({
        code: "custom",
        path: ["is_active"],
        message: "Phòng cụ thể đã xuất bản phải hoạt động.",
      });
    }
  });

export type PhysicalRoomInput = z.infer<typeof physicalRoomSchema>;
