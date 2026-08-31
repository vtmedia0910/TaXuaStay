import { describe, expect, it } from "vitest";
import { MOTORBIKE_STALE_AFTER_MS, resolveMotorbikePublicTruth } from "@/features/motorbike/policy";
import type { PublicMotorbikeOffering } from "@/features/motorbike/types";

function offering(overrides: Partial<PublicMotorbikeOffering> = {}): PublicMotorbikeOffering {
  return {
    slug: "xe-so-tham-chieu",
    display_name: "Xe số tham chiếu",
    vehicle_category: "motorbike",
    transmission_type: "semi_automatic",
    engine_class_cc: 110,
    suitable_for: "Di chuyển trong khu vực Tà Xùa",
    helmet_status: "unknown",
    pickup_summary: null,
    return_summary: null,
    public_description: null,
    image: null,
    public_price_vnd: null,
    price_source: null,
    price_checked_at: null,
    price_valid_until: null,
    availability_state: "needs_confirmation",
    confirmation_mode: "manual",
    public_request_url: "https://example.com/xac-nhan",
    source_checked_at: "2026-08-30T00:00:00.000Z",
    updated_at: "2026-08-30T00:00:00.000Z",
    source_system_key: "taxua_biker",
    source_provider: "Tà Xùa Biker",
    ...overrides,
  };
}

describe("V2 Phase 5 public truth", () => {
  const now = new Date("2026-08-31T05:00:00.000Z");

  it("keeps missing price null and uses truthful manual wording", () => {
    const truth = resolveMotorbikePublicTruth(offering(), now);
    expect(truth.priceLabel).toBe("Cần xác nhận giá");
    expect(truth.availabilityLabel).toBe("Cần xác nhận");
    expect(truth.confirmationLabel).toContain("thủ công");
  });

  it("shows a whole-VND snapshot only while its explicit validity is current", () => {
    const current = resolveMotorbikePublicTruth(offering({
      public_price_vnd: 180000,
      price_source: "supplier_confirmation",
      price_checked_at: "2026-08-30T05:00:00.000Z",
      price_valid_until: "2026-09-01",
    }), now);
    const expired = resolveMotorbikePublicTruth(offering({
      public_price_vnd: 180000,
      price_source: "supplier_confirmation",
      price_checked_at: "2026-08-20T05:00:00.000Z",
      price_valid_until: "2026-08-30",
    }), now);
    expect(current.priceLabel).toBe("180.000₫");
    expect(current.priceIsCurrent).toBe(true);
    expect(expired.priceLabel).toBe("Cần xác nhận giá");
    expect(expired.priceIsCurrent).toBe(false);
  });

  it("never converts listed or priced into live availability", () => {
    const truth = resolveMotorbikePublicTruth(offering({ public_price_vnd: 200000, price_source: "owner_confirmation", price_checked_at: "2026-08-30T05:00:00.000Z", price_valid_until: "2026-09-01" }), now);
    expect(truth.availabilityLabel).toBe("Cần xác nhận");
    expect(JSON.stringify(truth)).not.toContain("Còn xe");
  });

  it("marks source data stale after the documented seven-day boundary", () => {
    const sourceCheckedAt = new Date(now.getTime() - MOTORBIKE_STALE_AFTER_MS - 1).toISOString();
    const truth = resolveMotorbikePublicTruth(offering({ source_checked_at: sourceCheckedAt }), now);
    expect(truth.sourceIsStale).toBe(true);
    expect(truth.freshnessLabel).toBe("Thông tin nguồn cần kiểm tra lại");
  });

  it("disables request intent when the published state is unavailable", () => {
    expect(resolveMotorbikePublicTruth(offering({ availability_state: "unavailable" }), now).canRequest).toBe(false);
    expect(resolveMotorbikePublicTruth(offering({ availability_state: "unknown" }), now).canRequest).toBe(true);
  });
});
