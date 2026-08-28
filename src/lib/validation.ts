import { z } from "zod";

export function blankToNull(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

export function optionalText(maxLength: number) {
  return z.preprocess(blankToNull, z.string().trim().max(maxLength).nullable());
}

export function optionalNumber(schema: z.ZodType<number, unknown>) {
  return z.preprocess(blankToNull, schema.nullable());
}

export const formCheckbox = z.preprocess(
  (value) => value === true || value === "on",
  z.boolean(),
);

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const optionalHttpsUrl = z.preprocess(
  blankToNull,
  z.url({ protocol: /^https$/ }).max(2048).nullable(),
);

export const optionalLocalDateTime = z.preprocess(
  blankToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/)
    .nullable(),
);

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
