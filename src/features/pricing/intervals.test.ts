import { describe, expect, it } from "vitest";
import { dateIntervalsOverlap, intersectDateIntervals } from "@/features/pricing/intervals";

describe("pricing date intervals", () => {
  it("handles open-ended ranges and inclusive boundaries", () => {
    expect(dateIntervalsOverlap(
      { valid_from: null, valid_until: "2026-08-29" },
      { valid_from: "2026-08-29", valid_until: null },
    )).toBe(true);
    expect(intersectDateIntervals(
      { valid_from: null, valid_until: "2026-08-29" },
      { valid_from: "2026-08-29", valid_until: null },
    )).toEqual({ valid_from: "2026-08-29", valid_until: "2026-08-29" });
  });

  it("accepts partial overlaps and rejects disjoint bounded ranges", () => {
    expect(dateIntervalsOverlap(
      { valid_from: "2026-08-01", valid_until: "2026-08-20" },
      { valid_from: "2026-08-15", valid_until: "2026-09-01" },
    )).toBe(true);
    expect(dateIntervalsOverlap(
      { valid_from: "2026-08-01", valid_until: "2026-08-20" },
      { valid_from: "2026-08-21", valid_until: "2026-09-01" },
    )).toBe(false);
    expect(intersectDateIntervals(
      { valid_from: "2026-08-01", valid_until: "2026-08-20" },
      { valid_from: "2026-08-21", valid_until: "2026-09-01" },
    )).toBeNull();
  });
});
