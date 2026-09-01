import { describe, expect, it } from "vitest";
import type { PublicBookingStatusDto } from "@/features/bookings/types";
import type { CheckoutReadinessDto, CheckoutReadinessState } from "@/features/checkout/types";
import type { PublicSiteSettings } from "@/features/settings/types";
import { buildCustomerTripDashboard, countTripNights, deriveCustomerTripStatus } from "@/features/my-trip/policy";

const siteSettings: PublicSiteSettings = {
  id: "main",
  site_name: "Tà Xùa Trip",
  tagline: "Đi thật. Biết trước.",
  hotline: null,
  zalo_url: null,
  facebook_url: null,
  tiktok_url: null,
  address: null,
  google_maps_url: null,
  announcement: null,
  announcement_enabled: false,
  hero_title: "",
  hero_subtitle: "",
  updated_at: null,
};

const checkoutBase: CheckoutReadinessDto = {
  policy_version: "phase9-checkout-readiness-v1",
  readiness_state: "not_ready",
  blockers: ["booking_not_active"],
  quote: null,
  amounts: { currency: "VND", booking_total_vnd: null, deposit_due_vnd: null, planned_remaining_balance_vnd: null },
  deposit_policy: null,
  checkout_session: null,
  provider_state: "unconfigured",
};

function status(lifecycle: PublicBookingStatusDto["lifecycle_status"], confirmation: PublicBookingStatusDto["confirmation_status"], readiness: CheckoutReadinessState) {
  return deriveCustomerTripStatus({ lifecycle_status: lifecycle, confirmation_status: confirmation, checkout: { ...checkoutBase, readiness_state: readiness } });
}

function bookingFixture(): PublicBookingStatusDto {
  return {
    booking_code: "TX-20260901-ABC123",
    lifecycle_status: "active",
    confirmation_status: "partial",
    check_in: "2026-09-10",
    check_out: "2026-09-12",
    adults: 2,
    children: 0,
    rooms: 1,
    currency: "VND",
    quoted_sell_total_vnd: null,
    price_status: "unknown",
    quoted_at: "2026-09-01T01:00:00Z",
    submitted_at: "2026-09-01T01:00:00Z",
    items: [
      {
        item_key: "room-1",
        component_type: "ROOM",
        display_name: "Phòng Mây",
        description: "Snapshot mô tả phòng.",
        parent_name: "Nhà Mây",
        quantity: 1,
        is_required: true,
        counts_toward_booking_total: true,
        sell_price_vnd: null,
        price_status: "unknown",
        availability_status: "needs_confirmation",
        confirmation_status: "requested",
        confirmation_mode: "supplier_manual",
        quoted_at: "2026-09-01T01:00:00Z",
        verification: { room_verified: true, cloud_view_verified: true, road_verified: true, road_grade: "b" },
      },
      {
        item_key: "package-1-bike",
        component_type: "MOTORBIKE",
        display_name: "Xe số",
        description: null,
        parent_name: null,
        quantity: 1,
        is_required: true,
        counts_toward_booking_total: false,
        sell_price_vnd: null,
        price_status: "included_in_package",
        availability_status: "needs_confirmation",
        confirmation_status: "confirmed",
        confirmation_mode: "operator_manual",
        quoted_at: "2026-09-01T01:00:00Z",
        verification: { room_verified: null, cloud_view_verified: null, road_verified: null, road_grade: null },
      },
    ],
    events: [
      { event_type: "booking_submitted", message: "Đã nhận yêu cầu chuyến đi.", created_at: "2026-09-01T01:00:00Z" },
      { event_type: "supplier_confirmation_confirmed", message: "Một dịch vụ đã được xác nhận.", created_at: "2026-09-01T02:00:00Z" },
    ],
    checkout: { ...checkoutBase, readiness_state: "needs_confirmation", blockers: ["confirmation_incomplete"] },
  };
}

describe("Phase 10 customer trip policy", () => {
  it("maps every supported Booking/Confirmation/Readiness customer state without a second state machine", () => {
    expect(status("submitted", "pending", "not_ready")).toBe("submitted");
    expect(status("active", "pending", "needs_confirmation")).toBe("pending_confirmation");
    expect(status("active", "partial", "needs_confirmation")).toBe("partially_confirmed");
    expect(status("active", "confirmed", "not_ready")).toBe("confirmed");
    expect(status("active", "failed", "blocked")).toBe("confirmation_failed");
    expect(status("active", "confirmed", "ready")).toBe("ready_checkout");
    expect(status("active", "confirmed", "needs_requote")).toBe("needs_requote");
    expect(status("active", "confirmed", "expired")).toBe("quote_expired");
    expect(status("cancelled", "cancelled", "blocked")).toBe("booking_cancelled");
    expect(status("expired", "pending", "blocked")).toBe("booking_expired");
    expect(status("completed", "confirmed", "blocked")).toBe("booking_completed");
  });

  it("keeps missing price unknown and Package children included rather than zero or double-counted", () => {
    const trip = buildCustomerTripDashboard(bookingFixture(), siteSettings);
    expect(trip.items[0]?.priceLabel).toBe("Cần xác nhận giá");
    expect(trip.items[1]?.priceLabel).toBe("Đã bao gồm trong giá gói");
    expect(trip.items[0]?.verificationLabels).toEqual([
      "Phòng đã được xác minh",
      "Cloud View đã thẩm định",
      "Đường vào đã thẩm định · B — Cần lưu ý",
    ]);
    expect(trip.items[1]?.verificationLabels).toEqual([]);
    expect(trip.items.map((item) => item.priceLabel)).not.toContain("0₫");
    expect(trip.durationLabel).toBe("2 đêm");
    expect(countTripNights("2026-09-10", "2026-09-12")).toBe(2);
  });

  it("preserves unknown verification separately from an explicit not-verified snapshot", () => {
    const fixture = bookingFixture();
    fixture.items[0]!.verification = { room_verified: null, cloud_view_verified: null, road_verified: null, road_grade: null };
    expect(buildCustomerTripDashboard(fixture, siteSettings).items[0]?.verificationLabels).toEqual(["Thông tin xác minh chưa được ghi nhận đầy đủ"]);

    fixture.items[0]!.verification = { room_verified: false, cloud_view_verified: false, road_verified: false, road_grade: null };
    expect(buildCustomerTripDashboard(fixture, siteSettings).items[0]?.verificationLabels).toEqual(["Chưa có xác minh còn hiệu lực tại lúc gửi yêu cầu"]);
  });

  it("creates a customer-safe newest-first timeline and only configured support actions", () => {
    const trip = buildCustomerTripDashboard(bookingFixture(), {
      ...siteSettings,
      hotline: "0212 345 6789",
      zalo_url: "https://zalo.me/example",
      facebook_url: null,
    });
    expect(trip.timeline.map((event) => event.message)).toEqual(["Một dịch vụ đã được xác nhận.", "Đã nhận yêu cầu chuyến đi."]);
    expect(trip.timeline[0]).toMatchObject({ category: "confirmation" });
    expect(trip.supportActions.map((action) => action.href)).toEqual(["https://zalo.me/example", "tel:02123456789"]);
    expect(JSON.stringify(trip)).not.toMatch(/customer_name|customer_phone|supplier_contact|net_cost|margin|contribution|internal_note|actor_user_id|access_token/i);
  });
});
