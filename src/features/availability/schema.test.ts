import { describe, expect, it } from "vitest";
import { inventoryRangeSchema } from "@/features/availability/schema";

const base = {
  room_type_id: "00000000-0000-4000-8000-000000000001",
  date_from: "2026-11-15",
  date_to: "2026-11-21",
  available_quantity: "2",
  source: "admin",
  price_override_vnd: "",
};

describe("Phase 6 inventory schema", () => {
  it("accepts zero and whole-number quantities", () => {
    expect(inventoryRangeSchema.safeParse(base).success).toBe(true);
    expect(inventoryRangeSchema.safeParse({ ...base, available_quantity: "0" }).success).toBe(true);
  });

  it("rejects negative, decimal, and invalid source values", () => {
    expect(inventoryRangeSchema.safeParse({ ...base, available_quantity: "-1" }).success).toBe(false);
    expect(inventoryRangeSchema.safeParse({ ...base, available_quantity: "1.5" }).success).toBe(false);
    expect(inventoryRangeSchema.safeParse({ ...base, source: "guess" }).success).toBe(false);
  });

  it("supports one through 365 inclusive dates and rejects larger/reverse ranges", () => {
    expect(inventoryRangeSchema.safeParse({ ...base, date_to: base.date_from }).success).toBe(true);
    expect(inventoryRangeSchema.safeParse({ ...base, date_from: "2026-01-01", date_to: "2026-12-31" }).success).toBe(true);
    expect(inventoryRangeSchema.safeParse({ ...base, date_from: "2026-01-01", date_to: "2027-01-01" }).success).toBe(false);
    expect(inventoryRangeSchema.safeParse({ ...base, date_from: "2026-11-22", date_to: "2026-11-21" }).success).toBe(false);
  });

  it("keeps optional price overrides as non-negative integer VND", () => {
    expect(inventoryRangeSchema.safeParse({ ...base, price_override_vnd: "950000" }).success).toBe(true);
    expect(inventoryRangeSchema.safeParse({ ...base, price_override_vnd: "950000.5" }).success).toBe(false);
    expect(inventoryRangeSchema.safeParse({ ...base, price_override_vnd: "-1" }).success).toBe(false);
  });
});
