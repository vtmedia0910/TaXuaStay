import { describe, expect, it } from "vitest";
import {
  priceVerificationDatesAreConsistent,
  resolvePriceConfidence,
  vietnamCalendarDate,
} from "@/features/pricing/policy";
import type { PublicRateRuleDto } from "@/features/pricing/types";

const baseRule = {
  source: "partner",
  price_verified_at: "2026-08-20T00:00:00Z",
  price_valid_until: "2026-10-01",
} as PublicRateRuleDto;

describe("price confidence", () => {
  it("uses the Vietnam calendar date at UTC day boundaries", () => {
    expect(vietnamCalendarDate("2026-08-28T16:59:59.999Z")).toBe("2026-08-28");
    expect(vietnamCalendarDate("2026-08-28T17:00:00.000Z")).toBe("2026-08-29");
    expect(vietnamCalendarDate("2026-08-29T00:30")).toBe("2026-08-29");
    expect(vietnamCalendarDate("2026-08-29T00:30:00+07:00")).toBe("2026-08-29");
  });

  it("requires verified validity to cover the Vietnam verification date", () => {
    expect(priceVerificationDatesAreConsistent("2026-08-28T17:00:00.000Z", "2026-08-28")).toBe(false);
    expect(priceVerificationDatesAreConsistent("2026-08-28T17:00:00.000Z", "2026-08-29")).toBe(true);
    expect(priceVerificationDatesAreConsistent(null, "2026-08-01")).toBe(true);
    expect(priceVerificationDatesAreConsistent("2026-08-29T00:30", null)).toBe(true);
  });

  it("requires a trusted source, non-future verification and validity through the stay night", () => {
    const now = new Date("2026-08-29T00:00:00Z");
    expect(resolvePriceConfidence(baseRule, "2026-09-10", now)).toBe("verified");
    expect(resolvePriceConfidence({ ...baseRule, price_valid_until: "2026-09-10" }, "2026-09-10", now)).toBe("verified");
    expect(resolvePriceConfidence({ ...baseRule, price_valid_until: "2026-09-01" }, "2026-09-10", now)).toBe("recent");
    expect(resolvePriceConfidence({ ...baseRule, price_verified_at: "2026-09-01T00:00:00Z" }, "2026-09-10", now)).toBe("reference");
    expect(resolvePriceConfidence({ ...baseRule, source: "reference" }, "2026-09-10", now)).toBe("reference");
  });

  it("treats an operational update within 30 days as recent", () => {
    const now = new Date("2026-08-29T00:00:00Z");
    expect(resolvePriceConfidence({ ...baseRule, source: "import", price_valid_until: null }, "2026-09-10", now)).toBe("recent");
    expect(resolvePriceConfidence({ ...baseRule, source: "import", price_verified_at: "2026-07-01T00:00:00Z" }, "2026-09-10", now)).toBe("reference");
  });
});
