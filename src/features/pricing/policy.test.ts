import { describe, expect, it } from "vitest";
import { resolvePriceConfidence } from "@/features/pricing/policy";
import type { PublicRateRuleDto } from "@/features/pricing/types";

const baseRule = {
  source: "partner",
  price_verified_at: "2026-08-20T00:00:00Z",
  price_valid_until: "2026-10-01",
} as PublicRateRuleDto;

describe("price confidence", () => {
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
