import { describe, expect, it } from "vitest";
import {
  calculateCloudViewScore,
  calculateCloudViewTotal,
  getCloudViewLabel,
  getEffectiveRoadFacts,
  isVerificationExpiringSoon,
  isPropertyVerified,
  resolveVerificationState,
} from "@/features/verification/policy";
import type { CloudViewComponents } from "@/features/verification/types";

const minimum: CloudViewComponents = {
  direct_valley_points: 0,
  view_width_points: 0,
  obstruction_points: 0,
  view_from_bed_points: 0,
  private_position_points: 0,
  orientation_points: 0,
  evidence_points: 0,
};

const maximum: CloudViewComponents = {
  direct_valley_points: 30,
  view_width_points: 20,
  obstruction_points: 15,
  view_from_bed_points: 15,
  private_position_points: 10,
  orientation_points: 5,
  evidence_points: 5,
};

describe("Cloud View scoring", () => {
  it("derives 0 and 10 from minimum and maximum components", () => {
    expect(calculateCloudViewTotal(minimum)).toBe(0);
    expect(calculateCloudViewScore(minimum)).toBe(0);
    expect(calculateCloudViewTotal(maximum)).toBe(100);
    expect(calculateCloudViewScore(maximum)).toBe(10);
  });

  it("derives the representative 92 point score", () => {
    expect(calculateCloudViewScore({
      direct_valley_points: 30,
      view_width_points: 20,
      obstruction_points: 12,
      view_from_bed_points: 15,
      private_position_points: 8,
      orientation_points: 3,
      evidence_points: 4,
    })).toBe(9.2);
  });

  it.each([
    ["direct_valley_points", 30], ["view_width_points", 20],
    ["obstruction_points", 15], ["view_from_bed_points", 15],
    ["private_position_points", 10], ["orientation_points", 5],
    ["evidence_points", 5],
  ] as const)("accepts the exact %s maximum", (key, max) => {
    expect(calculateCloudViewTotal({ ...minimum, [key]: max })).toBe(max);
  });

  it("rejects negative, above-maximum, and decimal components", () => {
    expect(() => calculateCloudViewTotal({ ...minimum, evidence_points: -1 })).toThrow(RangeError);
    expect(() => calculateCloudViewTotal({ ...minimum, direct_valley_points: 31 })).toThrow(RangeError);
    expect(() => calculateCloudViewTotal({ ...minimum, view_width_points: 1.5 })).toThrow(RangeError);
  });

  it.each([
    [2.9, "Không phù hợp nếu mục tiêu là săn mây tại phòng"],
    [3, "Chủ yếu ở khu chung"], [4.9, "Chủ yếu ở khu chung"],
    [5, "Một phần"], [6.4, "Một phần"], [6.5, "Tốt"],
    [7.9, "Tốt"], [8, "Rất tốt"], [8.9, "Rất tốt"],
    [9, "Xuất sắc"], [10, "Xuất sắc"],
  ])("maps score %s to its public label", (score, label) => {
    expect(getCloudViewLabel(score)).toBe(label);
  });
});

describe("verification freshness", () => {
  const now = new Date("2026-08-29T00:00:00.000Z");
  it.each(["pending", "rejected", "needs_review"] as const)("does not expose %s as current", (status) => {
    expect(resolveVerificationState(status, "2027-01-01T00:00:00.000Z", now)).toBe(status);
  });
  it("treats future expiry as current", () => {
    expect(resolveVerificationState("verified", "2026-08-29T00:00:00.001Z", now)).toBe("current");
  });
  it("treats the exact boundary and past as expired", () => {
    expect(resolveVerificationState("verified", "2026-08-29T00:00:00.000Z", now)).toBe("expired");
    expect(resolveVerificationState("verified", "2026-08-28T23:59:59.999Z", now)).toBe("expired");
  });
  it("flags only future expiry inside the review window", () => {
    expect(isVerificationExpiringSoon("2026-09-28T00:00:00.000Z", now)).toBe(true);
    expect(isVerificationExpiringSoon("2026-09-29T00:00:00.001Z", now)).toBe(false);
    expect(isVerificationExpiringSoon("2026-08-29T00:00:00.000Z", now)).toBe(false);
  });
});

describe("Road fact precedence", () => {
  const preliminary = {
    road_access_grade: "unknown" as const,
    car_access: "unknown" as const,
    motorbike_access: "yes" as const,
    parking: "unknown" as const,
  };

  it("uses a current Road Verified DTO instead of preliminary facts", () => {
    const result = getEffectiveRoadFacts(preliminary, {
      verification_id: "verification-road",
      property_id: "property-one",
      grade: "c",
      car_access: "no",
      motorbike_access: "yes",
      sedan_access: "no",
      parking: "yes",
      road_surface: "mixed",
      steepness_notes: null,
      narrow_section_notes: null,
      rain_risk_notes: null,
      parking_location: null,
      walk_from_parking_m: 120,
      notes: null,
      verified_at: "2026-08-29T00:00:00.000Z",
      expires_at: "2027-02-28T00:00:00.000Z",
    });
    expect(result).toMatchObject({
      source: "verified",
      grade: "c",
      carAccess: "no",
      motorbikeAccess: "yes",
      parking: "yes",
    });
  });

  it("falls back to untouched preliminary facts without a current public record", () => {
    expect(getEffectiveRoadFacts(preliminary, null)).toEqual({
      source: "preliminary",
      grade: "unknown",
      carAccess: "unknown",
      motorbikeAccess: "yes",
      parking: "unknown",
    });
  });
});

describe("Property Verified definition", () => {
  it("requires both current identity and location badges", () => {
    expect(isPropertyVerified([{ verification_type: "property_identity" }])).toBe(false);
    expect(isPropertyVerified([{ verification_type: "property_location" }])).toBe(false);
    expect(isPropertyVerified([
      { verification_type: "property_identity" },
      { verification_type: "property_location" },
    ])).toBe(true);
  });
});
