import { describe, expect, it } from "vitest";
import { commercialRatePlanSchema, roomCommercialRuleSchema } from "@/features/economics/schema";

const ids = {
  plan: "11111111-1111-4111-8111-111111111111",
  supplier: "22222222-2222-4222-8222-222222222222",
  property: "33333333-3333-4333-8333-333333333333",
  room: "44444444-4444-4444-8444-444444444444",
};

function rule(overrides: Record<string, unknown> = {}) {
  return {
    commercial_rate_plan_id: ids.plan,
    supplier_id: ids.supplier,
    property_id: ids.property,
    room_type_id: ids.room,
    rate_type: "weekday",
    net_cost_vnd: "500000",
    market_reference_vnd: "",
    effective_from: "",
    effective_until: "",
    iso_weekdays: [],
    priority: "0",
    source: "contract",
    verified_at: "2026-08-20T10:00",
    valid_until: "2026-08-20",
    is_active: "on",
    notes_internal: "",
    ...overrides,
  };
}

describe("Phase 4 economics schemas", () => {
  it("accepts integer VND and an inclusive verification boundary", () => {
    expect(roomCommercialRuleSchema.safeParse(rule()).success).toBe(true);
  });

  it("rejects negative economics", () => {
    expect(roomCommercialRuleSchema.safeParse(rule({ net_cost_vnd: "-1" })).success).toBe(false);
    expect(roomCommercialRuleSchema.safeParse(rule({ net_cost_vnd: "", market_reference_vnd: "-1" })).success).toBe(false);
  });

  it("rejects rules with neither cost nor market reference", () => {
    expect(roomCommercialRuleSchema.safeParse(rule({ net_cost_vnd: "", market_reference_vnd: "" })).success).toBe(false);
  });

  it("rejects reversed effective and verification ranges", () => {
    expect(roomCommercialRuleSchema.safeParse(rule({ effective_from: "2026-09-02", effective_until: "2026-09-01" })).success).toBe(false);
    expect(roomCommercialRuleSchema.safeParse(rule({ valid_until: "2026-08-19" })).success).toBe(false);
  });

  it("rejects future verification timestamps", () => {
    expect(roomCommercialRuleSchema.safeParse(rule({ verified_at: "2999-01-01T00:00", valid_until: "2999-01-01" })).success).toBe(false);
  });

  it("requires bounded special-date rules", () => {
    expect(roomCommercialRuleSchema.safeParse(rule({ rate_type: "holiday" })).success).toBe(false);
  });

  it("validates commercial plan date order and VND-safe code", () => {
    const base = {
      supplier_id: ids.supplier,
      property_id: ids.property,
      code: "hop-dong-2026",
      name: "Thỏa thuận 2026",
      valid_from: "2026-09-01",
      valid_until: "2026-12-31",
      priority: "0",
      status: "draft",
      source: "contract",
      contract_reference: "HD-01",
      notes_internal: "",
    };
    expect(commercialRatePlanSchema.safeParse(base).success).toBe(true);
    expect(commercialRatePlanSchema.safeParse({ ...base, valid_until: "2026-08-31" }).success).toBe(false);
  });
});
