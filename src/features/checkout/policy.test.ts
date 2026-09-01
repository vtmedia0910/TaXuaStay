import { describe, expect, it } from "vitest";
import { calculateDepositAmount, CHECKOUT_POLICY_VERSION, resolveCheckoutReadiness } from "@/features/checkout/policy";
import type { CheckoutPolicyInput } from "@/features/checkout/types";

const now = new Date("2026-09-01T08:00:00.000Z");
const base: CheckoutPolicyInput = {
  lifecycleStatus: "active",
  confirmationStatus: "confirmed",
  quote: {
    quote_version: 3,
    quote_status: "valid",
    price_status: "authoritative",
    quoted_at: "2026-09-01T07:00:00.000Z",
    quote_expires_at: "2026-09-02T08:00:00.000Z",
  },
  bookingTotalVnd: 1_000_000,
  depositPolicy: {
    policy_version: 2,
    policy_type: "percentage",
    fixed_amount_vnd: null,
    percentage_bps: 2_500,
    free_cancel_until: "2026-09-01T12:00:00.000Z",
    non_refundable_after: "2026-09-01T12:00:00.000Z",
    manual_policy: null,
    cancellation_terms: "Hủy trước hạn để được hoàn theo chính sách.",
  },
  now,
};

describe("Phase 9 checkout-readiness policy", () => {
  it("separates readiness from Booking and Supplier Confirmation state", () => {
    const ready = resolveCheckoutReadiness(base);
    expect(ready.policy_version).toBe(CHECKOUT_POLICY_VERSION);
    expect(ready.readiness_state).toBe("ready");
    expect(ready.amounts).toEqual({ currency: "VND", booking_total_vnd: 1_000_000, deposit_due_vnd: 250_000, planned_remaining_balance_vnd: 750_000 });
    expect(resolveCheckoutReadiness({ ...base, confirmationStatus: "partial" }).readiness_state).toBe("needs_confirmation");
    expect(resolveCheckoutReadiness({ ...base, confirmationStatus: "failed" }).readiness_state).toBe("blocked");
    expect(resolveCheckoutReadiness({ ...base, lifecycleStatus: "submitted" }).readiness_state).toBe("not_ready");
    expect(resolveCheckoutReadiness({ ...base, lifecycleStatus: "cancelled" }).readiness_state).toBe("blocked");
  });

  it("blocks missing, stale, conflicting, and expired price facts instead of converting them to zero", () => {
    for (const price_status of ["missing", "stale", "conflict"] as const) {
      const result = resolveCheckoutReadiness({ ...base, bookingTotalVnd: price_status === "missing" ? null : base.bookingTotalVnd, quote: { ...base.quote!, price_status } });
      expect(result.readiness_state).toBe("needs_requote");
      expect(result.blockers).toContain(`price_${price_status}`);
      if (price_status === "missing") expect(result.amounts.booking_total_vnd).toBeNull();
    }
    const expired = resolveCheckoutReadiness({ ...base, quote: { ...base.quote!, quote_expires_at: now.toISOString() } });
    expect(expired.readiness_state).toBe("expired");
    expect(expired.blockers).toContain("quote_expired");
  });

  it("calculates provider-neutral deposit amounts deterministically", () => {
    expect(calculateDepositAmount({ policyType: "none", bookingTotalVnd: 999_999 }).amountDueVnd).toBe(0);
    expect(calculateDepositAmount({ policyType: "fixed_amount", bookingTotalVnd: 999_999, fixedAmountVnd: 250_000 }).remainingBalanceVnd).toBe(749_999);
    expect(calculateDepositAmount({ policyType: "percentage", bookingTotalVnd: 999_999, percentageBps: 3_333 }).amountDueVnd).toBe(333_300);
    expect(calculateDepositAmount({ policyType: "full_payment", bookingTotalVnd: 999_999 }).amountDueVnd).toBe(999_999);
    expect(calculateDepositAmount({ policyType: "manual", bookingTotalVnd: 999_999 }).valid).toBe(false);
    expect(calculateDepositAmount({ policyType: "fixed_amount", bookingTotalVnd: 100_000, fixedAmountVnd: 100_001 }).valid).toBe(false);
    expect(calculateDepositAmount({ policyType: "percentage", bookingTotalVnd: 100_000, percentageBps: 10_001 }).valid).toBe(false);
    expect(calculateDepositAmount({ policyType: "none", bookingTotalVnd: null }).amountDueVnd).toBeNull();
  });

  it("blocks contradictory cancellation dates", () => {
    const result = resolveCheckoutReadiness({
      ...base,
      depositPolicy: { ...base.depositPolicy!, free_cancel_until: "2026-09-02T00:00:00.000Z", non_refundable_after: "2026-09-01T00:00:00.000Z" },
    });
    expect(result.readiness_state).toBe("blocked");
    expect(result.blockers).toContain("cancellation_policy_conflict");
  });
});
