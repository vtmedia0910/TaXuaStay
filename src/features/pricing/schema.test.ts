import { describe, expect, it } from "vitest";
import { ratePlanSchema, roomRateRuleSchema } from "@/features/pricing/schema";

const uuid = "00000000-0000-4000-8000-000000000001";
const baseRule = {
  id: "",
  rate_plan_id: uuid,
  room_type_id: "00000000-0000-4000-8000-000000000002",
  rate_type: "weekday",
  price_vnd: "850000",
  extra_adult_vnd: "",
  extra_child_vnd: "",
  valid_from: "",
  valid_until: "",
  days_of_week: [],
  priority: "0",
  source: "admin",
  price_verified_at: "",
  price_valid_until: "",
  is_active: "on",
  internal_notes: "",
};

describe("Phase 5 pricing schemas", () => {
  it("accepts integer VND and rejects decimals or negative values", () => {
    expect(roomRateRuleSchema.safeParse(baseRule).success).toBe(true);
    expect(roomRateRuleSchema.safeParse({ ...baseRule, price_vnd: "850000.5" }).success).toBe(false);
    expect(roomRateRuleSchema.safeParse({ ...baseRule, price_vnd: "-1" }).success).toBe(false);
    expect(roomRateRuleSchema.safeParse({ ...baseRule, extra_adult_vnd: "100000.5" }).success).toBe(false);
    expect(roomRateRuleSchema.safeParse({ ...baseRule, extra_child_vnd: "-1" }).success).toBe(false);
  });

  it("requires bounded date ranges for special pricing", () => {
    expect(roomRateRuleSchema.safeParse({ ...baseRule, rate_type: "holiday" }).success).toBe(false);
    expect(roomRateRuleSchema.safeParse({ ...baseRule, rate_type: "holiday", valid_from: "2027-02-01", valid_until: "2027-02-03" }).success).toBe(true);
  });

  it("rejects future verification timestamps", () => {
    expect(roomRateRuleSchema.safeParse({ ...baseRule, price_verified_at: "2999-01-01T00:00" }).success).toBe(false);
  });

  it("enforces plan dates and lifecycle consistency", () => {
    const basePlan = { id: "", property_id: uuid, code: "standard-2026", name: "Standard 2026", description: "", valid_from: "2026-12-02", valid_until: "2026-12-01", priority: "0", is_active: "on", publish_status: "published" };
    expect(ratePlanSchema.safeParse(basePlan).success).toBe(false);
    expect(ratePlanSchema.safeParse({ ...basePlan, valid_until: "2026-12-31" }).success).toBe(true);
    expect(ratePlanSchema.safeParse({ ...basePlan, valid_until: "2026-12-31", is_active: undefined }).success).toBe(false);
  });
});
