import { z } from "zod";
import {
  ROOM_PROFILE_NOTE_CATEGORIES,
  ROOM_PROFILE_NOTE_TYPES,
} from "@/features/room-profiles/types";
import { blankToNull, formCheckbox, optionalText } from "@/lib/validation";

export const roomQualityScoreSchema = z.preprocess(
  (value) => (value === undefined ? null : blankToNull(value)),
  z.coerce.number().int().min(0).max(100).nullable(),
);

const optionalUuid = z.preprocess(blankToNull, z.uuid().nullable());

export const roomProfileNoteSchema = z
  .object({
    id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
    room_type_id: optionalUuid,
    physical_room_id: optionalUuid,
    note_type: z.enum(ROOM_PROFILE_NOTE_TYPES),
    category: z.enum(ROOM_PROFILE_NOTE_CATEGORIES),
    text: z.string().trim().min(2).max(500),
    sort_order: z.coerce.number().int().min(0).max(10000),
    is_public: formCheckbox,
  })
  .superRefine((value, context) => {
    if ([value.room_type_id, value.physical_room_id].filter(Boolean).length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["room_type_id"],
        message: "Ghi chú phải gắn đúng một loại phòng hoặc một phòng cụ thể.",
      });
    }
  });

export const roomQualityPublicNotesSchema = optionalText(3000).optional().transform((value) => value ?? null);
export const roomQualityInternalNotesSchema = optionalText(5000).optional().transform((value) => value ?? null);

export type RoomProfileNoteInput = z.infer<typeof roomProfileNoteSchema>;
