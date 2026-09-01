import { describe, expect, it } from "vitest";
import { buildOperationsView, resolveBookingOperations } from "@/features/operations/policy";
import type { OperationsBookingFact } from "@/features/operations/types";

const now = new Date("2026-09-01T08:00:00.000Z");

function booking(overrides: Partial<OperationsBookingFact> = {}): OperationsBookingFact {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    booking_code: "TX-20260901-ABC123",
    customer_name: "Nguyễn An",
    customer_phone: "0900000000",
    lifecycle_status: "active",
    confirmation_status: "pending",
    check_in: "2026-09-05",
    check_out: "2026-09-07",
    adults: 2,
    children: 0,
    rooms: 1,
    price_status: "quoted",
    submitted_at: "2026-09-01T01:00:00.000Z",
    updated_at: "2026-09-01T01:00:00.000Z",
    operations_revision: 2,
    last_operational_activity_at: "2026-09-01T01:00:00.000Z",
    items: [{
      id: "20000000-0000-4000-8000-000000000001",
      item_key: "room-1",
      component_type: "ROOM",
      display_name: "Phòng Mây",
      parent_name: "Nhà Mây",
      quantity: 1,
      is_required: true,
      counts_toward_booking_total: true,
      price_status: "quoted",
      availability_status: "needs_confirmation",
      confirmation_status: "requested",
      confirmation_mode: "supplier_manual",
      source_room_type_id: "30000000-0000-4000-8000-000000000001",
      source_motorbike_offering_id: null,
      source_package_id: null,
      operational_status: "active",
      replacement_for_booking_item_id: null,
      replaced_by_booking_item_id: null,
      supplier_name: "Nhà Mây",
      confirmation: {
        id: "40000000-0000-4000-8000-000000000001",
        status: "requested",
        requested_at: "2026-09-01T02:00:00.000Z",
        due_at: "2026-09-01T06:00:00.000Z",
        responded_at: null,
        expires_at: null,
        last_reminded_at: null,
        reminder_count: 0,
        updated_at: "2026-09-01T02:00:00.000Z",
        has_supplier: true,
      },
    }],
    change_requests: [],
    current_quote: {
      id: "50000000-0000-4000-8000-000000000001",
      quote_version: 1,
      quote_status: "valid",
      price_status: "authoritative",
      booking_total_vnd: 1_000_000,
      quoted_at: "2026-09-01T02:00:00.000Z",
      quote_expires_at: "2026-09-02T08:00:00.000Z",
    },
    checkout: {
      policy_version: "phase9-checkout-readiness-v1",
      readiness_state: "needs_confirmation",
      blockers: ["supplier_confirmation_pending"],
      quote: null,
      amounts: { currency: "VND", booking_total_vnd: 1_000_000, deposit_due_vnd: null, planned_remaining_balance_vnd: null },
      deposit_policy: null,
      checkout_session: null,
      provider_state: "unconfigured",
    },
    ...overrides,
  };
}

describe("Phase 11 deterministic Operations policy", () => {
  it("derives overdue attention, urgency, deadline, aging, and next action from real timestamps", () => {
    const result = resolveBookingOperations(booking(), now);
    expect(result.attention_reasons).toEqual(expect.arrayContaining(["confirmation_pending", "confirmation_overdue"]));
    expect(result.priority_bucket).toBe("high");
    expect(result.next_action).toBe("FOLLOW_UP_CONFIRMATION");
    expect(result.deadline_at).toBe("2026-09-01T06:00:00.000Z");
    expect(result.confirmation_aging).toMatchObject({ requested_count: 1, overdue_count: 1, max_age_minutes: 360 });
  });

  it("puts declined replacement and data conflict into the urgent bucket without economics", () => {
    const base = booking();
    const result = resolveBookingOperations(booking({
      price_status: "conflict",
      confirmation_status: "failed",
      items: [{ ...base.items[0], confirmation_status: "declined", confirmation: { ...base.items[0].confirmation!, status: "declined", responded_at: now.toISOString() } }],
    }), now);
    expect(result.attention_reasons).toEqual(expect.arrayContaining(["confirmation_declined", "replacement_required", "data_conflict"]));
    expect(result.priority_bucket).toBe("urgent");
    expect(result.next_action).toBe("REPLACE_ITEM");
  });

  it("does not treat an unknown supplier fact as a false availability fact", () => {
    const base = booking();
    const result = resolveBookingOperations(booking({
      items: [{ ...base.items[0], confirmation_mode: "internal_manual", supplier_name: null, confirmation: { ...base.items[0].confirmation!, has_supplier: false } }],
    }), now);
    expect(result.attention_reasons).toContain("missing_supplier_mapping");
    expect(result.attention_reasons).not.toContain("confirmation_declined");
    expect(result.attention_reasons).not.toContain("data_conflict");
  });

  it("keeps terminal Bookings out of the active attention queue", () => {
    const result = resolveBookingOperations(booking({ lifecycle_status: "completed", current_quote: null }), now);
    expect(result.attention_reasons).toEqual([]);
    expect(result.priority_bucket).toBe("low");
    expect(result.next_action).toBe("CLOSE_COMPLETED");
    expect(result.confirmation_aging.requested_count).toBe(0);
  });

  it("filters, searches, sorts, paginates, and calculates only factual metrics", () => {
    const second = booking({ id: "10000000-0000-4000-8000-000000000002", booking_code: "TX-20260902-XYZ999", customer_name: "Lê Bình", customer_phone: "0911111111", items: [], confirmation_status: "confirmed", lifecycle_status: "completed", submitted_at: "2026-09-02T01:00:00.000Z", current_quote: null });
    const view = buildOperationsView([booking(), second], { q: "nhà mây", view: "overdue", pageSize: 1 }, now);
    expect(view.total_filtered).toBe(1);
    expect(view.page_items[0].booking.booking_code).toBe("TX-20260901-ABC123");
    expect(view.metrics).toMatchObject({ bookings_created: 2, pending_confirmations: 1, overdue_confirmations: 1, completed_count: 1 });
    expect(Object.keys(view.metrics)).not.toEqual(expect.arrayContaining(["margin", "contribution", "supplier_tier", "partner_tier"]));
  });
});
