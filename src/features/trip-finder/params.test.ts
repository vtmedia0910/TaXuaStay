import { describe, expect, it } from "vitest";
import { buildTripFinderUrl, parseTripFinderParams } from "@/features/trip-finder/params";

describe("Trip Finder URL state", () => {
  it("parses a complete shareable result state with stable public parameters", () => {
    const parsed = parseTripFinderParams({
      results: "1", check_in: "2026-10-10", check_out: "2026-10-12",
      adults: "2", children: "1", rooms: "1", style: "family", view: "cloud_view",
      road: "car_required", quality: "current_quality", budget: "under_3000000",
      motorbike: "1", package: "1", verified: "1",
    });
    expect(parsed.showResults).toBe(true);
    expect(parsed.intent).toMatchObject({
      style: "family", viewPriority: "cloud_view", roadNeed: "car_required",
      qualityPreference: "current_quality", budgetPreference: "under_3000000",
      wantsMotorbike: true, wantsPackage: true, prefersVerified: true,
    });
    expect(parsed.normalizedQuery).toContain("results=1");
    expect(parsed.normalizedQuery).not.toMatch(/email|phone|name=/);
  });

  it("does not render results for missing, reversed, or overlong date ranges", () => {
    expect(parseTripFinderParams({ results: "1" }).showResults).toBe(false);
    expect(parseTripFinderParams({ results: "1", check_in: "2026-10-12", check_out: "2026-10-10" }).showResults).toBe(false);
    expect(parseTripFinderParams({ results: "1", check_in: "2026-10-01", check_out: "2026-12-01" }).showResults).toBe(false);
  });

  it("normalizes invalid counts and enums to bounded safe defaults", () => {
    const parsed = parseTripFinderParams({ adults: "200", children: "-1", rooms: "0", style: "ai_magic", step: "99" });
    expect(parsed.intent.adults).toBe(2);
    expect(parsed.intent.children).toBe(0);
    expect(parsed.intent.rooms).toBe(1);
    expect(parsed.intent.style).toBe("balanced");
    expect(parsed.step).toBe(0);
    expect(parsed.issues.length).toBeGreaterThan(0);
  });

  it("builds a canonical single-route URL without customer identity", () => {
    const parsed = parseTripFinderParams({ check_in: "2026-10-10", check_out: "2026-10-12" });
    const url = buildTripFinderUrl(parsed.intent, { step: 3 });
    expect(url.startsWith("/trip-finder?")).toBe(true);
    expect(url).toContain("step=3");
  });
});
