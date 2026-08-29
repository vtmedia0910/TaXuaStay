import { describe, expect, it } from "vitest";
import { availabilityFreshnessState } from "@/features/availability/policy";

const now = new Date("2026-08-29T12:00:00.000Z");

describe("availability freshness policy", () => {
  it("uses exact 6-hour and 24-hour boundaries", () => {
    expect(availabilityFreshnessState("2026-08-29T06:00:00.001Z", now)).toBe("live");
    expect(availabilityFreshnessState("2026-08-29T06:00:00.000Z", now)).toBe("verified_today");
    expect(availabilityFreshnessState("2026-08-28T12:00:00.000Z", now)).toBe("verified_today");
    expect(availabilityFreshnessState("2026-08-28T11:59:59.999Z", now)).toBe("needs_confirmation");
  });

  it("treats invalid or future verification as unknown", () => {
    expect(availabilityFreshnessState("invalid", now)).toBe("unknown");
    expect(availabilityFreshnessState("2026-08-29T12:00:00.001Z", now)).toBe("unknown");
  });
});
