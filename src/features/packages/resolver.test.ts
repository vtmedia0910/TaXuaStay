import { describe, expect, it } from "vitest";
import { resolvePrivatePackage, resolvePublicPackage } from "@/features/packages/resolver";
import type {
  AdminPackageComponent,
  PublicPackage,
  PublicPackageComponent,
  PublicPackagePriceRule,
} from "@/features/packages/types";
import type { AvailabilityQuote } from "@/features/availability/types";
import type { EconomicsQuote } from "@/features/economics/types";
import type { PublicMotorbikeOffering } from "@/features/motorbike/types";

const now = new Date("2026-08-31T05:00:00.000Z");
const packageValue: PublicPackage = {
  id: "pkg-1", destination_id: "destination-1", destination_slug: "ta-xua", destination_name: "Tà Xùa",
  slug: "goi-thu", name: "Gói thử", proposition: "Rõ từng thành phần", description: "Mô tả thật",
  valid_from: null, valid_until: null, confirmation_mode: "manual", public_request_url: "https://example.com/request",
  is_featured: false, sort_order: 0, updated_at: "2026-08-30T00:00:00Z", image: null,
};
const roomComponent: PublicPackageComponent = {
  package_id: "pkg-1", component_key: "phong", component_type: "ROOM", is_required: true, quantity: 1,
  sort_order: 0, confirmation_mode: "manual", public_copy_override: null, room_type_id: "room-1",
  motorbike_offering_slug: null, source_name: "Phòng mây", source_parent_name: "Nhà Mây", source_path: "/stay/nha-may/phong-may",
  custom_code: null, custom_name: null, custom_description: null,
};
const customComponent: PublicPackageComponent = {
  ...roomComponent, component_key: "bua-sang", component_type: "CUSTOM", is_required: false,
  room_type_id: null, source_name: "Bữa sáng", source_parent_name: null, source_path: null,
  custom_code: "bua-sang", custom_name: "Bữa sáng", custom_description: "Xác nhận theo ngày",
};
const motorbikeComponent: PublicPackageComponent = {
  ...roomComponent, component_key: "xe-so", component_type: "MOTORBIKE", room_type_id: null,
  motorbike_offering_slug: "xe-so-ta-xua", source_name: "Xe số Tà Xùa", source_parent_name: null,
  source_path: "/motorbike/xe-so-ta-xua", confirmation_mode: "manual",
};
const motorbikeOffering: PublicMotorbikeOffering = {
  slug: "xe-so-ta-xua", display_name: "Xe số Tà Xùa", vehicle_category: "motorbike",
  transmission_type: "semi_automatic", engine_class_cc: 110, suitable_for: null,
  helmet_status: "yes", pickup_summary: null, return_summary: null, public_description: null,
  image: null, public_price_vnd: null, price_source: null, price_checked_at: null,
  price_valid_until: null, availability_state: "needs_confirmation", confirmation_mode: "manual",
  public_request_url: "https://example.com/xe", source_checked_at: "2026-08-30T05:00:00Z",
  updated_at: "2026-08-30T05:00:00Z", source_system_key: "taxua_biker", source_provider: "Tà Xùa Biker",
};
const baseRule: PublicPackagePriceRule = {
  package_id: "pkg-1", price_vnd: 1_000_000, effective_from: "2026-09-01", effective_until: "2026-12-31",
  adults_min: 2, adults_max: 2, children_min: 0, children_max: 0, rooms_min: 1, rooms_max: 1,
  selected_optional_component_keys: [], priority: 10, price_source: "owner_confirmation",
  verified_at: "2026-08-30T05:00:00Z", price_valid_until: "2026-12-31", rule_id: "price-1",
};

function availability(state: AvailabilityQuote["state"]): AvailabilityQuote {
  return { room_type_id: "room-1", check_in: "2026-09-10", check_out: "2026-09-12", requested_rooms: 1, nights: 2, nightly_lines: [], state, minimum_available_quantity: state === "sold_out" ? 0 : 1, freshest_verified_at: null, oldest_verified_at: null, oldest_verification_age_hours: null, sources: [], missing_dates: [], stale_dates: [], policy_version: "phase6-v1" };
}

function resolve(overrides: { rules?: PublicPackagePriceRule[]; components?: PublicPackageComponent[]; availability?: AvailabilityQuote["state"]; optional?: string[] } = {}) {
  return resolvePublicPackage({
    package: packageValue,
    components: overrides.components ?? [roomComponent, customComponent],
    priceRules: overrides.rules ?? [baseRule],
    quoteInput: { package_id: "pkg-1", check_in: "2026-09-10", check_out: "2026-09-12", adults: 2, children: 0, rooms: 1, selected_optional_component_keys: overrides.optional ?? [] },
    sources: { roomAvailabilityQuotes: new Map([["room-1", availability(overrides.availability ?? "live")]]), motorbikeOfferings: new Map() },
    now,
  });
}

describe("V2 Phase 6 package resolver", () => {
  it("uses only an explicit current package rule and keeps price separate from availability", () => {
    const quote = resolve();
    expect(quote.sell_price.total_vnd).toBe(1_000_000);
    expect(quote.availability_state).toBe("recorded_available");
    expect(quote.confirmation_mode).toBe("manual");
    expect(quote.can_request).toBe(true);
    expect(JSON.stringify(quote)).not.toMatch(/unit_cost|gross_margin|commercial_rule|price-1/);
  });

  it("returns Cần xác nhận semantics for missing, stale, and conflicting prices", () => {
    expect(resolve({ rules: [] }).sell_price).toMatchObject({ status: "unknown", total_vnd: null });
    expect(resolve({ rules: [{ ...baseRule, verified_at: "2026-01-01T00:00:00Z" }] }).sell_price).toMatchObject({ status: "stale", total_vnd: null });
    expect(resolve({ rules: [baseRule, { ...baseRule, rule_id: "price-2", price_vnd: 900_000 }] }).sell_price).toMatchObject({ status: "conflict", total_vnd: null });
  });

  it("matches optional selections exactly and propagates required unavailability", () => {
    expect(resolve({ optional: ["bua-sang"] }).sell_price.total_vnd).toBeNull();
    expect(resolve({ availability: "sold_out" }).availability_state).toBe("unavailable");
    expect(resolve({ availability: "sold_out" }).can_request).toBe(false);
  });

  it("keeps optional components excluded and aggregates Room + Motorbike through the Phase 5 manual boundary", () => {
    const quote = resolvePublicPackage({
      package: packageValue,
      components: [roomComponent, motorbikeComponent, customComponent],
      priceRules: [baseRule],
      quoteInput: { package_id: "pkg-1", check_in: "2026-09-10", check_out: "2026-09-12", adults: 2, children: 0, rooms: 1, selected_optional_component_keys: [] },
      sources: {
        roomAvailabilityQuotes: new Map([["room-1", availability("verified_today")]]),
        motorbikeOfferings: new Map([[motorbikeOffering.slug, motorbikeOffering]]),
      },
      now,
    });
    expect(quote.nights).toBe(2);
    expect(quote.components.find((line) => line.component_key === "bua-sang")?.is_selected).toBe(false);
    expect(quote.components.find((line) => line.component_key === "xe-so")).toMatchObject({
      confirmation_mode: "manual",
      availability_state: "needs_confirmation",
      source_availability_state: "manual",
    });
    expect(quote.availability_state).toBe("needs_confirmation");
    expect(quote.confirmation_mode).toBe("manual");
  });

  it("returns unknown for a missing required source and invalid for a reversed checkout-exclusive stay", () => {
    const missing = resolvePublicPackage({
      package: packageValue,
      components: [{ ...roomComponent, room_type_id: "missing-room" }],
      priceRules: [baseRule],
      quoteInput: { package_id: "pkg-1", check_in: "2026-09-10", check_out: "2026-09-12", adults: 2, children: 0, rooms: 1, selected_optional_component_keys: [] },
      sources: { roomAvailabilityQuotes: new Map(), motorbikeOfferings: new Map() },
      now,
    });
    expect(missing.availability_state).toBe("unknown");
    expect(missing.status).toBe("needs_confirmation");

    const invalid = resolvePublicPackage({
      package: packageValue,
      components: [roomComponent],
      priceRules: [baseRule],
      quoteInput: { package_id: "pkg-1", check_in: "2026-09-12", check_out: "2026-09-10", adults: 2, children: 0, rooms: 1, selected_optional_component_keys: [] },
      sources: { roomAvailabilityQuotes: new Map(), motorbikeOfferings: new Map() },
      now,
    });
    expect(invalid.nights).toBe(0);
    expect(invalid.sell_price).toMatchObject({ status: "invalid", total_vnd: null });
    expect(invalid.status).toBe("invalid");
  });

  it("does not quote dates outside the package validity window", () => {
    const quote = resolvePublicPackage({
      package: { ...packageValue, valid_from: "2026-09-11", valid_until: "2026-09-30" },
      components: [roomComponent],
      priceRules: [baseRule],
      quoteInput: { package_id: "pkg-1", check_in: "2026-09-10", check_out: "2026-09-12", adults: 2, children: 0, rooms: 1, selected_optional_component_keys: [] },
      sources: { roomAvailabilityQuotes: new Map([["room-1", availability("live")]]), motorbikeOfferings: new Map() },
      now,
    });
    expect(quote.status).toBe("invalid");
    expect(quote.sell_price).toMatchObject({ status: "invalid", total_vnd: null });
    expect(quote.caveats).toContain("Ngày đã chọn nằm ngoài thời gian áp dụng của gói.");
  });

  it("keeps package cost null when an included cost is missing and computes gross contribution when complete", () => {
    const publicQuote = resolve({ rules: [{ ...baseRule, selected_optional_component_keys: ["bua-sang"], price_vnd: 1_000_000 }], optional: ["bua-sang"] });
    const adminComponents: AdminPackageComponent[] = [
      { ...roomComponent, id: "component-room", component_type: "ROOM", motorbike_offering_id: null, unit_cost_vnd: null, cost_source: null, cost_verified_at: null, cost_valid_until: null, internal_notes: null, created_at: "", updated_at: "" },
      { ...customComponent, id: "component-breakfast", component_type: "CUSTOM", motorbike_offering_id: null, unit_cost_vnd: null, cost_source: null, cost_verified_at: null, cost_valid_until: null, internal_notes: null, created_at: "", updated_at: "" },
    ];
    const roomEconomics = { room_type_id: "room-1", net_cost_total_vnd: 500_000, nightly_lines: [{ commercial_rule_id: "cost-rule-1", commercial_freshness: "verified" }] } as unknown as EconomicsQuote;
    const missing = resolvePrivatePackage({ publicQuote, components: adminComponents, priceRules: [{ ...baseRule, selected_optional_component_keys: ["bua-sang"], price_vnd: 1_000_000 }], roomEconomicsQuotes: new Map([["room-1", roomEconomics]]), now });
    expect(missing.package_cost_vnd).toBeNull();
    expect(missing.gross_contribution_vnd).toBeNull();

    adminComponents[1] = { ...adminComponents[1], unit_cost_vnd: 100_000, cost_source: "owner_confirmation", cost_verified_at: "2026-08-30T05:00:00Z", cost_valid_until: "2026-12-31" };
    const complete = resolvePrivatePackage({ publicQuote, components: adminComponents, priceRules: [{ ...baseRule, selected_optional_component_keys: ["bua-sang"], price_vnd: 1_000_000, rule_id: "package-rule" }], roomEconomicsQuotes: new Map([["room-1", roomEconomics]]), now });
    expect(complete.package_cost_vnd).toBe(600_000);
    expect(complete.gross_contribution_vnd).toBe(400_000);
    expect(complete.gross_margin_bps).toBe(4000);
    expect(complete.component_economics[0].commercial_rule_ids).toEqual(["cost-rule-1"]);

    const staleRoomEconomics = { ...roomEconomics, nightly_lines: [{ commercial_rule_id: "cost-rule-1", commercial_freshness: "reference" }] } as unknown as EconomicsQuote;
    const stale = resolvePrivatePackage({ publicQuote, components: adminComponents, priceRules: [{ ...baseRule, selected_optional_component_keys: ["bua-sang"], price_vnd: 1_000_000 }], roomEconomicsQuotes: new Map([["room-1", staleRoomEconomics]]), now });
    expect(stale.package_cost_vnd).toBeNull();
    expect(stale.component_economics[0]).toMatchObject({ total_cost_vnd: null, missing_cost: true, stale_cost: true });

    const lossQuote = resolve({ rules: [{ ...baseRule, selected_optional_component_keys: ["bua-sang"], price_vnd: 400_000 }], optional: ["bua-sang"] });
    const loss = resolvePrivatePackage({ publicQuote: lossQuote, components: adminComponents, priceRules: [{ ...baseRule, selected_optional_component_keys: ["bua-sang"], price_vnd: 400_000 }], roomEconomicsQuotes: new Map([["room-1", roomEconomics]]), now });
    expect(loss.gross_contribution_vnd).toBe(-200_000);
    expect(loss.gross_margin_bps).toBe(-5000);
    expect(loss.warnings).toContain("negative-contribution");
  });
});
