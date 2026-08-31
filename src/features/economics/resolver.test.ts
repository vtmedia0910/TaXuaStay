import { describe, expect, it } from "vitest";
import { resolveRoomEconomics } from "@/features/economics/resolver";
import type { CommercialResolverRule } from "@/features/economics/types";
import { resolveRoomPrice } from "@/features/pricing/resolver";
import type { PublicRateRuleDto } from "@/features/pricing/types";

const roomId = "11111111-1111-4111-8111-111111111111";
const sellPlanId = "22222222-2222-4222-8222-222222222222";
const costPlanId = "33333333-3333-4333-8333-333333333333";
const supplierId = "44444444-4444-4444-8444-444444444444";
const propertyId = "55555555-5555-4555-8555-555555555555";

function sellRule(overrides: Partial<PublicRateRuleDto> = {}): PublicRateRuleDto {
  return {
    rule_id: "sell-weekday",
    rate_plan_id: sellPlanId,
    property_id: propertyId,
    room_type_id: roomId,
    rate_type: "weekday",
    price_vnd: 1_000_000,
    extra_adult_vnd: null,
    extra_child_vnd: null,
    rule_valid_from: null,
    rule_valid_until: null,
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    rule_priority: 0,
    plan_priority: 0,
    source: "admin",
    price_verified_at: "2026-08-01T00:00:00.000Z",
    price_valid_until: "2027-12-31",
    plan_valid_from: null,
    plan_valid_until: null,
    ...overrides,
  };
}

function commercialRule(overrides: Partial<CommercialResolverRule> = {}): CommercialResolverRule {
  return {
    id: "cost-weekday",
    commercial_rate_plan_id: costPlanId,
    supplier_id: supplierId,
    property_id: propertyId,
    room_type_id: roomId,
    rate_type: "weekday",
    net_cost_vnd: 700_000,
    market_reference_vnd: 1_100_000,
    effective_from: null,
    effective_until: null,
    iso_weekdays: [1, 2, 3, 4, 5, 6, 7],
    priority: 0,
    source: "contract",
    verified_at: "2026-08-01T00:00:00.000Z",
    valid_until: "2027-12-31",
    is_active: true,
    notes_internal: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    plan_priority: 0,
    plan_status: "active",
    plan_valid_from: null,
    plan_valid_until: null,
    supplier_status: "active",
    relationship_ranges: [{ valid_from: null, valid_until: null }],
    ...overrides,
  };
}

function quote(input: {
  checkIn?: string;
  checkOut?: string;
  sellRules?: PublicRateRuleDto[];
  costRules?: CommercialResolverRule[];
  now?: Date;
}) {
  const checkIn = input.checkIn ?? "2026-09-01";
  const checkOut = input.checkOut ?? "2026-09-02";
  const sellQuote = resolveRoomPrice({ roomTypeId: roomId, checkIn, checkOut, rules: input.sellRules ?? [sellRule()], now: input.now });
  return resolveRoomEconomics({
    roomTypeId: roomId,
    checkIn,
    checkOut,
    sellQuote,
    commercialRules: input.costRules ?? [commercialRule()],
    now: input.now ?? new Date("2026-08-15T00:00:00.000Z"),
  });
}

describe("Phase 4 economics resolver", () => {
  it("resolves a one-night complete quote and contribution", () => {
    const result = quote({});
    expect(result.nights).toBe(1);
    expect(result.sell_subtotal_vnd).toBe(1_000_000);
    expect(result.net_cost_total_vnd).toBe(700_000);
    expect(result.market_reference_total_vnd).toBe(1_100_000);
    expect(result.gross_contribution_vnd).toBe(300_000);
    expect(result.gross_margin_bps).toBe(3000);
    expect(result.status).toBe("complete");
    expect(result.policy_version).toBe("phase4-economics-v1");
  });

  it("keeps checkout exclusive", () => {
    const result = quote({ checkIn: "2026-09-01", checkOut: "2026-09-03" });
    expect(result.nightly_lines.map((line) => line.date)).toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("accepts 31 nights and rejects a 32-night stay", () => {
    expect(quote({ checkIn: "2026-09-01", checkOut: "2026-10-02" }).nights).toBe(31);
    const invalid = quote({ checkIn: "2026-09-01", checkOut: "2026-10-03" });
    expect(invalid.nights).toBe(0);
    expect(invalid.status).toBe("unknown");
  });

  it("keeps missing sell price distinct from zero", () => {
    const result = quote({ sellRules: [] });
    expect(result.sell_subtotal_vnd).toBeNull();
    expect(result.net_cost_total_vnd).toBe(700_000);
    expect(result.gross_contribution_vnd).toBeNull();
    expect(result.nightly_lines[0].warnings).toContain("sell-missing");
  });

  it("keeps missing cost distinct from zero", () => {
    const result = quote({ costRules: [commercialRule({ net_cost_vnd: null })] });
    expect(result.net_cost_total_vnd).toBeNull();
    expect(result.gross_margin_bps).toBeNull();
    expect(result.missing_dates).toEqual(["2026-09-01"]);
  });

  it("allows complete contribution with missing market reference", () => {
    const result = quote({ costRules: [commercialRule({ market_reference_vnd: null })] });
    expect(result.status).toBe("complete");
    expect(result.market_reference_total_vnd).toBeNull();
    expect(result.nightly_lines[0].warnings).toContain("market-missing");
  });

  it("reports negative, zero, and positive contribution without changing sell price", () => {
    expect(quote({ costRules: [commercialRule({ net_cost_vnd: 1_100_000 })] }).gross_contribution_vnd).toBe(-100_000);
    expect(quote({ costRules: [commercialRule({ net_cost_vnd: 1_000_000 })] }).gross_margin_bps).toBe(0);
    expect(quote({ costRules: [commercialRule({ net_cost_vnd: 900_000 })] }).gross_contribution_vnd).toBe(100_000);
    expect(quote({ costRules: [commercialRule({ net_cost_vnd: 1_100_000 })] }).nightly_lines[0].warnings).toContain("negative-contribution");
  });

  it("returns null margin when sell subtotal is zero", () => {
    const result = quote({ sellRules: [sellRule({ price_vnd: 0 })], costRules: [commercialRule({ net_cost_vnd: 0 })] });
    expect(result.gross_contribution_vnd).toBe(0);
    expect(result.gross_margin_bps).toBeNull();
  });

  it("rounds gross margin to integer BPS", () => {
    const result = quote({ sellRules: [sellRule({ price_vnd: 3 })], costRules: [commercialRule({ net_cost_vnd: 2 })] });
    expect(result.gross_margin_bps).toBe(3333);
  });

  it("treats equal effective priority as conflict even when amounts match", () => {
    const result = quote({ costRules: [commercialRule({ id: "a" }), commercialRule({ id: "b" })] });
    expect(result.status).toBe("conflict");
    expect(result.conflict_dates).toEqual(["2026-09-01"]);
    expect(result.nightly_lines[0].conflicting_commercial_rule_ids).toEqual(["a", "b"]);
  });

  it("preserves an existing sell-price conflict", () => {
    const result = quote({ sellRules: [sellRule({ rule_id: "sell-a" }), sellRule({ rule_id: "sell-b" })] });
    expect(result.status).toBe("conflict");
    expect(result.nightly_lines[0].warnings).toContain("sell-conflict");
  });

  it("applies override above holiday and holiday above weekday", () => {
    const rules = [
      commercialRule({ id: "weekday", net_cost_vnd: 600_000 }),
      commercialRule({ id: "holiday", rate_type: "holiday", effective_from: "2026-09-01", effective_until: "2026-09-01", net_cost_vnd: 700_000 }),
      commercialRule({ id: "override", rate_type: "override", effective_from: "2026-09-01", effective_until: "2026-09-01", net_cost_vnd: 800_000 }),
    ];
    expect(quote({ costRules: rules }).nightly_lines[0].commercial_rule_id).toBe("override");
    expect(quote({ costRules: rules.slice(0, 2) }).nightly_lines[0].commercial_rule_id).toBe("holiday");
  });

  it("uses Monday-Thursday as weekday and Friday-Sunday as weekend", () => {
    const rules = [
      commercialRule({ id: "weekday", iso_weekdays: null, rate_type: "weekday", net_cost_vnd: 600_000 }),
      commercialRule({ id: "weekend", iso_weekdays: null, rate_type: "weekend", net_cost_vnd: 800_000 }),
    ];
    expect(quote({ checkIn: "2026-09-03", checkOut: "2026-09-04", costRules: rules }).nightly_lines[0].commercial_rule_id).toBe("weekday");
    expect(quote({ checkIn: "2026-09-04", checkOut: "2026-09-05", costRules: rules }).nightly_lines[0].commercial_rule_id).toBe("weekend");
  });

  it("uses inclusive rule and relationship validity", () => {
    const result = quote({ costRules: [commercialRule({
      effective_from: "2026-09-01",
      effective_until: "2026-09-01",
      relationship_ranges: [{ valid_from: "2026-09-01", valid_until: "2026-09-01" }],
    })] });
    expect(result.net_cost_total_vnd).toBe(700_000);
  });

  it("does not resolve through an inactive Supplier relationship", () => {
    const result = quote({ costRules: [commercialRule({ relationship_ranges: [{ valid_from: null, valid_until: "2026-08-31" }] })] });
    expect(result.net_cost_total_vnd).toBeNull();
    expect(result.nightly_lines[0].warnings).toContain("supplier-relationship-inactive");
  });

  it("keeps Vietnam-date freshness inclusive and expires after the boundary", () => {
    const now = new Date("2026-09-01T16:59:59.000Z");
    const current = quote({ now, costRules: [commercialRule({ verified_at: "2026-08-01T00:00:00.000Z", valid_until: "2026-09-01" })] });
    expect(current.nightly_lines[0].commercial_freshness).toBe("verified");
    const afterMidnight = quote({ now: new Date("2026-09-01T17:00:01.000Z"), costRules: [commercialRule({ valid_until: "2026-09-01" })] });
    expect(afterMidnight.nightly_lines[0].warnings).toContain("commercial-expired");
  });
});
