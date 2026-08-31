import { describe, expect, it } from "vitest";
import { motorbikeOfferingSchema } from "@/features/motorbike/schema";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    id: "",
    supplier_id: "11111111-1111-4111-8111-111111111111",
    source_external_ref_id: "22222222-2222-4222-8222-222222222222",
    slug: "xe-so-tham-chieu",
    display_name: "Xe số tham chiếu",
    vehicle_category: "motorbike",
    transmission_type: "semi_automatic",
    engine_class_cc: "110",
    suitable_for: "Di chuyển tại Tà Xùa",
    helmet_status: "unknown",
    pickup_summary: "Xác nhận điểm nhận sau",
    return_summary: "Xác nhận điểm trả sau",
    public_description: "Lựa chọn công khai đã được kiểm tra.",
    image_media_id: "",
    public_price_vnd: "",
    price_source: "",
    price_checked_at: "",
    price_valid_until: "",
    availability_state: "needs_confirmation",
    public_request_url: "https://example.com/xac-nhan",
    source_checked_at: "2026-08-20T10:00",
    publication_status: "published",
    sort_order: "0",
    internal_notes: "",
    ...overrides,
  };
}

describe("V2 Phase 5 Admin validation", () => {
  it("accepts a truthful published manual projection without price", () => {
    const parsed = motorbikeOfferingSchema.parse(valid());
    expect(parsed.public_price_vnd).toBeNull();
    expect(parsed.price_source).toBeNull();
  });

  it("requires a complete price snapshot and rejects future checks", () => {
    expect(motorbikeOfferingSchema.safeParse(valid({ public_price_vnd: "180000" })).success).toBe(false);
    expect(motorbikeOfferingSchema.safeParse(valid({
      public_price_vnd: "180000",
      price_source: "supplier_confirmation",
      price_checked_at: "2999-01-01T00:00",
      price_valid_until: "2999-01-02",
    })).success).toBe(false);
  });

  it("requires freshness and a public HTTPS confirmation URL before publish", () => {
    expect(motorbikeOfferingSchema.safeParse(valid({ source_checked_at: "" })).success).toBe(false);
    expect(motorbikeOfferingSchema.safeParse(valid({ public_request_url: "" })).success).toBe(false);
    expect(motorbikeOfferingSchema.safeParse(valid({ public_request_url: "http://example.com" })).success).toBe(false);
  });

  it("does not admit live availability or a non-manual mode", () => {
    expect(motorbikeOfferingSchema.safeParse(valid({ availability_state: "available_live" })).success).toBe(false);
  });
});
