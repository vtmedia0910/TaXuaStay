import { describe, expect, it } from "vitest";
import { enumerateStayNights, resolveRoomPrice } from "@/features/pricing/resolver";
import type { PublicRateRuleDto } from "@/features/pricing/types";

function rule(overrides: Partial<PublicRateRuleDto> = {}): PublicRateRuleDto {
  return {
    rule_id: "00000000-0000-4000-8000-000000000001",
    rate_plan_id: "00000000-0000-4000-8000-000000000010",
    property_id: "00000000-0000-4000-8000-000000000020",
    room_type_id: "00000000-0000-4000-8000-000000000030",
    rate_type: "weekday",
    price_vnd: 500_000,
    extra_adult_vnd: 100_000,
    extra_child_vnd: 50_000,
    rule_valid_from: null,
    rule_valid_until: null,
    days_of_week: null,
    rule_priority: 0,
    plan_priority: 0,
    source: "admin",
    price_verified_at: "2026-08-20T03:00:00.000Z",
    price_valid_until: "2026-12-31",
    plan_valid_from: null,
    plan_valid_until: null,
    ...overrides,
  };
}

describe("Phase 5 price resolver", () => {
  it("uses [check-in, check-out) and handles UTC dates without timezone drift", () => {
    expect(enumerateStayNights("2026-08-31", "2026-09-02")).toEqual(["2026-08-31", "2026-09-01"]);
    expect(enumerateStayNights("2026-09-02", "2026-09-02")).toEqual([]);
    expect(enumerateStayNights("2026-09-03", "2026-09-02")).toEqual([]);
    expect(enumerateStayNights("2026-12-31", "2027-01-02")).toEqual(["2026-12-31", "2027-01-01"]);
    expect(enumerateStayNights("2026-01-31", "2026-02-02")).toEqual(["2026-01-31", "2026-02-01"]);
  });

  it("uses Monday-Thursday weekday and Friday-Sunday weekend defaults", () => {
    const quote = resolveRoomPrice({
      roomTypeId: rule().room_type_id,
      checkIn: "2026-08-27",
      checkOut: "2026-08-29",
      rules: [rule(), rule({ rule_id: "weekend", rate_type: "weekend", price_vnd: 700_000 })],
      now: new Date("2026-08-25T00:00:00Z"),
    });
    expect(quote.nightly_lines.map((line) => line.base_price_vnd)).toEqual([500_000, 700_000]);
    expect(quote.total_vnd).toBe(1_200_000);
    expect(quote.confidence).toBe("verified");
  });

  it("maps Monday, Thursday, Friday, Saturday and Sunday exactly", () => {
    const rules = [rule(), rule({ rule_id: "weekend", rate_type: "weekend", price_vnd: 700_000 })];
    const quote = resolveRoomPrice({
      roomTypeId: rule().room_type_id,
      checkIn: "2026-08-24",
      checkOut: "2026-08-31",
      rules,
      now: new Date("2026-08-20T00:00:00Z"),
    });
    expect(quote.nightly_lines.map((line) => [line.date, line.rule_id])).toEqual([
      ["2026-08-24", rule().rule_id],
      ["2026-08-25", rule().rule_id],
      ["2026-08-26", rule().rule_id],
      ["2026-08-27", rule().rule_id],
      ["2026-08-28", "weekend"],
      ["2026-08-29", "weekend"],
      ["2026-08-30", "weekend"],
    ]);
  });

  it("applies override > holiday > peak > weekend/weekday before explicit priority", () => {
    const common = { rule_valid_from: "2026-09-01", rule_valid_until: "2026-09-01" };
    const quote = resolveRoomPrice({
      roomTypeId: rule().room_type_id,
      checkIn: "2026-09-01",
      checkOut: "2026-09-02",
      rules: [
        rule({ ...common, rule_priority: 999 }),
        rule({ ...common, rule_id: "peak", rate_type: "peak", price_vnd: 800_000 }),
        rule({ ...common, rule_id: "holiday", rate_type: "holiday", price_vnd: 900_000 }),
        rule({ ...common, rule_id: "override", rate_type: "override", price_vnd: 1_000_000 }),
      ],
      now: new Date("2026-08-25T00:00:00Z"),
    });
    expect(quote.nightly_lines[0].rule_id).toBe("override");
  });

  it("selects holiday and peak over standard when no override exists", () => {
    const range = { rule_valid_from: "2026-09-01", rule_valid_until: "2026-09-01" };
    const peak = rule({ ...range, rule_id: "peak", rate_type: "peak" });
    const holiday = rule({ ...range, rule_id: "holiday", rate_type: "holiday" });
    const peakQuote = resolveRoomPrice({ roomTypeId: rule().room_type_id, checkIn: "2026-09-01", checkOut: "2026-09-02", rules: [rule(), peak] });
    const holidayQuote = resolveRoomPrice({ roomTypeId: rule().room_type_id, checkIn: "2026-09-01", checkOut: "2026-09-02", rules: [rule(), peak, holiday] });
    expect(peakQuote.nightly_lines[0].rule_id).toBe("peak");
    expect(holidayQuote.nightly_lines[0].rule_id).toBe("holiday");
  });

  it("uses higher rule then plan priority and reports an equal-priority conflict", () => {
    const quote = resolveRoomPrice({
      roomTypeId: rule().room_type_id,
      checkIn: "2026-09-01",
      checkOut: "2026-09-02",
      rules: [rule(), rule({ rule_id: "tie", price_vnd: 600_000 })],
      now: new Date("2026-08-25T00:00:00Z"),
    });
    expect(quote.status).toBe("conflict");
    expect(quote.total_vnd).toBeNull();
    expect(quote.nightly_lines[0].conflicting_rule_ids).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "tie",
    ]);
  });

  it("does not apply stored extras without occupancy-safe semantics", () => {
    const quote = resolveRoomPrice({
      roomTypeId: rule().room_type_id,
      checkIn: "2026-09-01",
      checkOut: "2026-09-02",
      rules: [rule()],
      now: new Date("2026-08-25T00:00:00Z"),
    });
    expect(quote.total_vnd).toBe(500_000);
    expect(quote).toMatchObject({ subtotal_vnd: 500_000, discount_vnd: 0, fees_vnd: 0 });
    expect(quote.nightly_lines[0]).toMatchObject({ extra_adult_vnd: 100_000, extra_charges_applied: false });
  });

  it("returns no authoritative total when any night is missing", () => {
    const quote = resolveRoomPrice({
      roomTypeId: rule().room_type_id,
      checkIn: "2026-08-27",
      checkOut: "2026-08-29",
      rules: [rule()],
    });
    expect(quote.status).toBe("partial");
    expect(quote.total_vnd).toBeNull();
    expect(quote.confidence).toBe("unknown");
  });
});
