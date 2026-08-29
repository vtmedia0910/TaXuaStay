import { describe, expect, it } from "vitest";
import { enumerateInclusiveLodgingDates, enumerateLodgingNights } from "@/lib/lodging-dates";

describe("lodging calendar dates", () => {
  it("enumerates one and multiple nights with checkout excluded", () => {
    expect(enumerateLodgingNights("2026-11-15", "2026-11-16", 31)).toEqual(["2026-11-15"]);
    expect(enumerateLodgingNights("2026-11-15", "2026-11-17", 31)).toEqual(["2026-11-15", "2026-11-16"]);
  });

  it("crosses month and year boundaries without timezone drift", () => {
    expect(enumerateLodgingNights("2026-11-30", "2026-12-02", 31)).toEqual(["2026-11-30", "2026-12-01"]);
    expect(enumerateLodgingNights("2026-12-31", "2027-01-02", 31)).toEqual(["2026-12-31", "2027-01-01"]);
  });

  it("rejects same-day, reverse, invalid, and over-limit stays", () => {
    expect(enumerateLodgingNights("2026-11-15", "2026-11-15", 31)).toEqual([]);
    expect(enumerateLodgingNights("2026-11-16", "2026-11-15", 31)).toEqual([]);
    expect(enumerateLodgingNights("2026-02-30", "2026-03-02", 31)).toEqual([]);
    expect(enumerateLodgingNights("2026-01-01", "2026-02-02", 31)).toEqual([]);
  });

  it("supports inclusive Admin inventory ranges separately from stay nights", () => {
    expect(enumerateInclusiveLodgingDates("2026-11-15", "2026-11-17", 365)).toEqual([
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
    ]);
  });
});
