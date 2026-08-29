import { z } from "zod";
import { INVENTORY_SOURCES } from "@/features/availability/types";
import { enumerateInclusiveLodgingDates } from "@/lib/lodging-dates";
import { optionalNumber } from "@/lib/validation";
import { MAX_INVENTORY_BULK_DATES } from "@/features/availability/policy";

export const inventoryRangeSchema = z.object({
  room_type_id: z.uuid(),
  date_from: z.iso.date(),
  date_to: z.iso.date(),
  available_quantity: z.coerce.number().int().min(0).max(1000),
  source: z.enum(INVENTORY_SOURCES),
  price_override_vnd: optionalNumber(z.coerce.number().int().min(0).max(2_000_000_000)),
}).superRefine((value, context) => {
  const dates = enumerateInclusiveLodgingDates(value.date_from, value.date_to, MAX_INVENTORY_BULK_DATES);
  if (!dates.length) {
    context.addIssue({
      code: "custom",
      path: ["date_to"],
      message: `Khoảng cập nhật phải hợp lệ và không quá ${MAX_INVENTORY_BULK_DATES} ngày tính cả hai đầu.`,
    });
  }
});
