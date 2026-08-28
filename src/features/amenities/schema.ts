import { z } from "zod";
import { AMENITY_CATEGORIES } from "@/features/amenities/types";
import { formCheckbox, optionalText, slugSchema } from "@/lib/validation";

export const amenitySchema = z.object({
  id: z.preprocess((value) => (value === "" ? undefined : value), z.uuid().optional()),
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  category: z.enum(AMENITY_CATEGORIES),
  icon_key: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .nullable(),
  ),
  description: optionalText(500),
  is_active: formCheckbox,
  sort_order: z.coerce.number().int().min(0).max(100000),
});

export type AmenityInput = z.infer<typeof amenitySchema>;
