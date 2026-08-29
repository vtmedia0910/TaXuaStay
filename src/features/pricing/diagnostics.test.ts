import { describe, expect, it } from "vitest";
import { detectAdminPricingIssues } from "@/features/pricing/diagnostics";
import type { RatePlanDto, RoomRateRuleDto } from "@/features/pricing/types";

const plan: RatePlanDto = {
  id: "plan-a",
  property_id: "property-a",
  code: "standard",
  name: "Standard",
  description: null,
  currency: "VND",
  valid_from: null,
  valid_until: null,
  priority: 0,
  is_active: true,
  publish_status: "published",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const rule: RoomRateRuleDto = {
  id: "rule-a",
  rate_plan_id: plan.id,
  room_type_id: "room-a",
  rate_type: "weekday",
  price_vnd: 850000,
  extra_adult_vnd: null,
  extra_child_vnd: null,
  valid_from: null,
  valid_until: null,
  days_of_week: null,
  priority: 0,
  source: "admin",
  price_verified_at: null,
  price_valid_until: null,
  is_active: true,
  internal_notes: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("Admin pricing diagnostics", () => {
  it("reports equal-priority overlaps even when duplicate prices match", () => {
    const issues = detectAdminPricingIssues({
      plans: [plan],
      rules: [rule, { ...rule, id: "rule-b" }],
      activeRoomIds: [rule.room_type_id],
      now: new Date("2026-08-29T00:00:00Z"),
    });
    expect(issues.some((issue) => issue.code === "overlap" && issue.severity === "error")).toBe(true);
  });

  it("reports active rooms without a published active rule", () => {
    const issues = detectAdminPricingIssues({
      plans: [{ ...plan, publish_status: "draft" }],
      rules: [rule],
      activeRoomIds: [rule.room_type_id],
    });
    expect(issues.some((issue) => issue.code === "missing-rule")).toBe(true);
  });
});
