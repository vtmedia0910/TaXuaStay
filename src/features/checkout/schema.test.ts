import { describe, expect, it } from "vitest";
import { cancelCheckoutSchema, checkoutDraftSchema, depositPolicySchema, requoteBookingSchema } from "@/features/checkout/schema";

const booking_id = "11111111-1111-4111-8111-111111111111";

describe("Phase 9 checkout operation validation", () => {
  it("validates bounded requote and checkout draft identifiers", () => {
    expect(requoteBookingSchema.safeParse({ booking_id, reason: "Giá nguồn đã đổi" }).success).toBe(true);
    expect(requoteBookingSchema.safeParse({ booking_id: "booking", reason: "x" }).success).toBe(false);
    expect(checkoutDraftSchema.safeParse({ booking_id }).success).toBe(true);
    expect(cancelCheckoutSchema.safeParse({ booking_id, checkout_session_id: "22222222-2222-4222-8222-222222222222", reason: "Tạo báo giá mới" }).success).toBe(true);
  });

  it("requires values that match the selected deposit policy", () => {
    expect(depositPolicySchema.safeParse({ booking_id, policy_type: "none", fixed_amount_vnd: "", percentage_bps: "", free_cancel_until: "", non_refundable_after: "", manual_policy: "", cancellation_terms: "" }).success).toBe(true);
    expect(depositPolicySchema.safeParse({ booking_id, policy_type: "fixed_amount", fixed_amount_vnd: "250000", percentage_bps: "" }).success).toBe(true);
    expect(depositPolicySchema.safeParse({ booking_id, policy_type: "fixed_amount", fixed_amount_vnd: "" }).success).toBe(false);
    expect(depositPolicySchema.safeParse({ booking_id, policy_type: "percentage", percentage_bps: "2500" }).success).toBe(true);
    expect(depositPolicySchema.safeParse({ booking_id, policy_type: "percentage", percentage_bps: "0" }).success).toBe(false);
  });

  it("rejects conflicting cancellation timestamps", () => {
    const parsed = depositPolicySchema.safeParse({
      booking_id,
      policy_type: "none",
      fixed_amount_vnd: "",
      percentage_bps: "",
      free_cancel_until: "2026-09-02T10:00",
      non_refundable_after: "2026-09-01T10:00",
      manual_policy: "",
      cancellation_terms: "",
    });
    expect(parsed.success).toBe(false);
  });
});
