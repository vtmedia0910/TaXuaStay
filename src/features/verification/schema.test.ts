import { describe, expect, it } from "vitest";
import { verificationSchema } from "@/features/verification/schema";

const base = {
  id: "",
  status: "verified",
  method: "Kiểm tra trực tiếp",
  notes: "",
  verified_at: "2025-08-29T09:00",
  expires_at: "2027-08-29T09:00",
  use_custom_verification_dates: false,
  evidence_ids: ["11111111-1111-4111-8111-111111111111"],
  direct_valley_points: "",
  view_width_points: "",
  obstruction_points: "",
  view_from_bed_points: "",
  private_position_points: "",
  orientation_points: "",
  evidence_points: "",
  view_from_bed: "",
  viewing_position: "",
  view_direction: "",
  horizontal_view_angle_deg: "",
  sunrise_orientation: "",
  obstruction_notes: "",
  cloud_view_notes: "",
  grade: "",
  car_access: "",
  motorbike_access: "",
  sedan_access: "",
  parking: "",
  road_surface: "",
  steepness_notes: "",
  narrow_section_notes: "",
  rain_risk_notes: "",
  parking_location: "",
  walk_from_parking_m: "",
  road_notes: "",
};

describe("verification form validation", () => {
  it("accepts continuous integer Cloud View component scoring", () => {
    const result = verificationSchema.safeParse({
      ...base,
      verification_type: "cloud_view",
      property_id: "",
      room_type_id: "22222222-2222-4222-8222-222222222222",
      direct_valley_points: 27,
      view_width_points: 18,
      obstruction_points: 13,
      view_from_bed_points: 12,
      private_position_points: 9,
      orientation_points: 4,
      evidence_points: 5,
      view_from_bed: "yes",
      viewing_position: "private_balcony",
      view_direction: "SE",
      horizontal_view_angle_deg: 110,
      sunrise_orientation: "good",
      obstruction_notes: "",
      cloud_view_notes: "",
      grade: "",
      car_access: "",
      motorbike_access: "",
      sedan_access: "",
      parking: "",
      road_surface: "",
      steepness_notes: "",
      narrow_section_notes: "",
      rain_risk_notes: "",
      parking_location: "",
      walk_from_parking_m: "",
      road_notes: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a cross-target Cloud View record and missing evidence", () => {
    const result = verificationSchema.safeParse({
      ...base,
      verification_type: "cloud_view",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      evidence_ids: [],
      direct_valley_points: 0,
      view_width_points: 0,
      obstruction_points: 0,
      view_from_bed_points: 0,
      private_position_points: 0,
      orientation_points: 0,
      evidence_points: 0,
      view_from_bed: "no",
      viewing_position: "none",
      view_direction: "unknown",
      sunrise_orientation: "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("rejects grade D when direct car access is claimed", () => {
    const result = verificationSchema.safeParse({
      ...base,
      verification_type: "road_access",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      grade: "d",
      car_access: "yes",
      motorbike_access: "yes",
      sedan_access: "no",
      parking: "no",
      road_surface: "dirt",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["a", "yes", "yes"],
    ["b", "yes", "unknown"],
    ["c", "unknown", "no"],
    ["d", "no", "no"],
  ] as const)("accepts Road grade %s with compatible tri-state access", (grade, carAccess, sedanAccess) => {
    const result = verificationSchema.safeParse({
      ...base,
      verification_type: "road_access",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      grade,
      car_access: carAccess,
      motorbike_access: "yes",
      sedan_access: sedanAccess,
      parking: "unknown",
      road_surface: "mixed",
      walk_from_parking_m: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid Road grade and negative walking distance", () => {
    const result = verificationSchema.safeParse({
      ...base,
      verification_type: "road_access",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      grade: "e",
      car_access: "unknown",
      motorbike_access: "unknown",
      sedan_access: "unknown",
      parking: "unknown",
      road_surface: "unknown",
      walk_from_parking_m: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a future verified_at in the normal Admin workflow", () => {
    const result = verificationSchema.safeParse({
      ...base,
      verification_type: "property_identity",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      verified_at: "2999-08-29T09:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts intentional historical backdating with a valid future custom expiry", () => {
    const result = verificationSchema.safeParse({
      ...base,
      verification_type: "property_identity",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      verified_at: "2025-08-29T09:00",
      expires_at: "2027-08-29T09:00",
      use_custom_verification_dates: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects incomplete or already-expired custom re-verification dates", () => {
    const missingExpiry = verificationSchema.safeParse({
      ...base,
      verification_type: "property_identity",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      expires_at: "",
      use_custom_verification_dates: true,
    });
    const expired = verificationSchema.safeParse({
      ...base,
      verification_type: "property_identity",
      property_id: "33333333-3333-4333-8333-333333333333",
      room_type_id: "",
      verified_at: "2024-08-29T09:00",
      expires_at: "2025-08-29T09:00",
      use_custom_verification_dates: true,
    });
    expect(missingExpiry.success).toBe(false);
    expect(expired.success).toBe(false);
  });
});
