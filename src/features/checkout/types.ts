import type { BookingConfirmationStatus, BookingLifecycleStatus } from "@/features/bookings/types";

export const CHECKOUT_READINESS_STATES = ["not_ready", "needs_confirmation", "needs_requote", "ready", "expired", "blocked"] as const;
export const QUOTE_STATUSES = ["valid", "expired", "superseded", "needs_requote"] as const;
export const QUOTE_PRICE_STATUSES = ["authoritative", "missing", "stale", "conflict"] as const;
export const DEPOSIT_POLICY_TYPES = ["none", "fixed_amount", "percentage", "full_payment", "manual"] as const;
export const CHECKOUT_SESSION_STATUSES = ["draft", "ready", "expired", "cancelled", "consumed"] as const;

export type CheckoutReadinessState = (typeof CHECKOUT_READINESS_STATES)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type QuotePriceStatus = (typeof QUOTE_PRICE_STATUSES)[number];
export type DepositPolicyType = (typeof DEPOSIT_POLICY_TYPES)[number];
export type CheckoutSessionStatus = (typeof CHECKOUT_SESSION_STATUSES)[number];

export interface CheckoutQuoteSummary {
  quote_version: number;
  quote_status: QuoteStatus;
  price_status: QuotePriceStatus;
  quoted_at: string;
  quote_expires_at: string | null;
}
export interface CheckoutDepositPolicySummary {
  policy_version: number;
  policy_type: DepositPolicyType;
  fixed_amount_vnd: number | null;
  percentage_bps: number | null;
  free_cancel_until: string | null;
  non_refundable_after: string | null;
  manual_policy: string | null;
  cancellation_terms: string | null;
}

export interface CheckoutSessionSummary {
  checkout_session_id: string;
  quote_version: number;
  status: CheckoutSessionStatus;
  amount_due_vnd: number;
  expires_at: string;
  provider_state: "unconfigured";
}

export interface CheckoutReadinessDto {
  policy_version: "phase9-checkout-readiness-v1";
  readiness_state: CheckoutReadinessState;
  blockers: string[];
  quote: CheckoutQuoteSummary | null;
  amounts: {
    currency: "VND";
    booking_total_vnd: number | null;
    deposit_due_vnd: number | null;
    planned_remaining_balance_vnd: number | null;
  };
  deposit_policy: CheckoutDepositPolicySummary | null;
  checkout_session: CheckoutSessionSummary | null;
  provider_state: "unconfigured";
}

export interface CheckoutPolicyInput {
  lifecycleStatus: BookingLifecycleStatus;
  confirmationStatus: BookingConfirmationStatus;
  quote: CheckoutQuoteSummary | null;
  bookingTotalVnd: number | null;
  depositPolicy: CheckoutDepositPolicySummary | null;
  now: Date;
}

export interface AdminBookingQuote extends CheckoutQuoteSummary {
  id: string;
  booking_id: string;
  booking_total_vnd: number | null;
  currency: "VND";
  is_current: boolean;
  reason: string;
  superseded_at: string | null;
  expired_at: string | null;
  created_at: string;
}

export interface AdminDepositPolicy extends CheckoutDepositPolicySummary {
  id: string;
  booking_id: string;
  status: "active" | "superseded";
  is_current: boolean;
  created_at: string;
  superseded_at: string | null;
}

export interface AdminCheckoutSession extends CheckoutSessionSummary {
  booking_id: string;
  quote_id: string;
  deposit_policy_id: string;
  deposit_policy_version: number;
  booking_total_vnd: number;
  planned_remaining_balance_vnd: number;
  currency: "VND";
  readiness_policy_version: "phase9-checkout-readiness-v1";
  invalidated_at: string | null;
  invalidation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminCheckoutBundle {
  readiness: CheckoutReadinessDto;
  quotes: AdminBookingQuote[];
  policies: AdminDepositPolicy[];
  sessions: AdminCheckoutSession[];
}
