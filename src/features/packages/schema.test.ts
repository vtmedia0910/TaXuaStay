import { describe, expect, it } from "vitest";
import { packageCommerceSchema } from "@/features/packages/schema";

function base(overrides: Record<string, unknown> = {}) {
  return {
    id: "",
    destination_id: "11111111-1111-4111-8111-111111111111",
    code: "ta-xua-2n1d",
    slug: "ta-xua-2-ngay-1-dem",
    name: "Tà Xùa 2 ngày 1 đêm",
    proposition: "Phù hợp cho hai người muốn chủ động lịch trình",
    description: "Thông tin gói được ghi rõ theo từng thành phần.",
    lifecycle_status: "draft",
    valid_from: "2026-09-01",
    valid_until: "2026-12-31",
    confirmation_mode: "manual",
    public_request_url: "https://example.com/xac-nhan",
    is_featured: false,
    sort_order: "0",
    hero_media_id: "",
    internal_notes: "",
    components: [{
      component_key: "phong-chinh", component_type: "ROOM",
      room_type_id: "22222222-2222-4222-8222-222222222222", motorbike_offering_id: "",
      custom_code: "", custom_name: "", custom_description: "", is_required: true,
      quantity: 1, sort_order: 0, confirmation_mode: "manual", public_copy_override: "",
      unit_cost_vnd: "", cost_source: "", cost_verified_at: "", cost_valid_until: "", internal_notes: "",
    }],
    price_rules: [{
      rule_key: "gia-hai-nguoi", price_vnd: 1600000,
      effective_from: "2026-09-01", effective_until: "2026-12-31",
      adults_min: 2, adults_max: 2, children_min: 0, children_max: 0,
      rooms_min: 1, rooms_max: 1, selected_optional_component_keys: [],
      priority: 10, price_source: "owner_confirmation", verified_at: "2026-08-30T10:00",
      price_valid_until: "2026-12-31", is_active: true, internal_notes: "",
    }],
    ...overrides,
  };
}

describe("V2 Phase 6 Admin validation", () => {
  it("accepts a real ROOM package with an explicit total price rule", () => {
    const parsed = packageCommerceSchema.parse(base());
    expect(parsed.components[0].room_type_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(parsed.price_rules[0].price_vnd).toBe(1_600_000);
  });

  it("rejects arbitrary source UUID combinations and instant confirmation", () => {
    const invalidSources = base({ components: [{ ...base().components[0], motorbike_offering_id: "33333333-3333-4333-8333-333333333333" }] });
    expect(packageCommerceSchema.safeParse(invalidSources).success).toBe(false);
    expect(packageCommerceSchema.safeParse(base({ confirmation_mode: "instant" })).success).toBe(false);
  });

  it("requires a controlled CUSTOM identity and complete cost snapshot", () => {
    const custom = { ...base().components[0], component_type: "CUSTOM", room_type_id: "", custom_code: "", custom_name: "" };
    expect(packageCommerceSchema.safeParse(base({ components: [custom] })).success).toBe(false);
    expect(packageCommerceSchema.safeParse(base({ components: [{ ...custom, custom_code: "bua-sang", custom_name: "Bữa sáng", unit_cost_vnd: 100000 }] })).success).toBe(false);
  });

  it("does not publish an empty visual bundle or accept a foreign optional key", () => {
    expect(packageCommerceSchema.safeParse(base({ lifecycle_status: "published", components: [] })).success).toBe(false);
    const rules = [{ ...base().price_rules[0], selected_optional_component_keys: ["khong-ton-tai"] }];
    expect(packageCommerceSchema.safeParse(base({ price_rules: rules })).success).toBe(false);
  });
});
