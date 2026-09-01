import type {
  CheckoutDepositPolicySummary,
  CheckoutPolicyInput,
  CheckoutReadinessDto,
  CheckoutReadinessState,
  DepositPolicyType,
} from "@/features/checkout/types";

export const CHECKOUT_POLICY_VERSION = "phase9-checkout-readiness-v1" as const;

export const CHECKOUT_READINESS_LABELS: Record<CheckoutReadinessState, string> = {
  not_ready: "Chưa sẵn sàng cho bước thanh toán",
  needs_confirmation: "Đang chờ xác nhận dịch vụ",
  needs_requote: "Cần cập nhật báo giá",
  ready: "Sẵn sàng cho bước thanh toán",
  expired: "Thông tin thanh toán đã hết hiệu lực",
  blocked: "Chưa thể tiếp tục",
};

export const DEPOSIT_POLICY_LABELS: Record<DepositPolicyType, string> = {
  none: "Không cần thanh toán trước",
  fixed_amount: "Số tiền cố định",
  percentage: "Theo tỷ lệ phần trăm",
  full_payment: "Thanh toán toàn bộ",
  manual: "Cần đội ngũ xác định thủ công",
};

export const CHECKOUT_BLOCKER_LABELS: Record<string, string> = {
  booking_terminal: "Yêu cầu chuyến đi đã kết thúc hoặc bị hủy.",
  booking_not_active: "Đội ngũ chưa bắt đầu xử lý yêu cầu chuyến đi.",
  confirmation_failed: "Có dịch vụ không thể xác nhận.",
  confirmation_incomplete: "Các dịch vụ đã chọn chưa được xác nhận đầy đủ.",
  quote_missing: "Chưa có báo giá cho chuyến đi.",
  quote_expired: "Báo giá đã hết hiệu lực.",
  quote_needs_requote: "Báo giá cần được kiểm tra lại.",
  price_missing: "Một dịch vụ chưa có giá xác nhận.",
  price_stale: "Một dịch vụ có giá đã cũ.",
  price_conflict: "Có nhiều nguồn giá đang xung đột.",
  total_unknown: "Chưa xác định được tổng giá trị chuyến đi.",
  deposit_policy_missing: "Chưa có chính sách thanh toán trước.",
  deposit_manual_policy: "Số tiền cần thanh toán trước phải được đội ngũ xác định.",
  deposit_invalid_fixed_amount: "Số tiền cố định không hợp lệ so với tổng giá trị.",
  deposit_invalid_percentage: "Tỷ lệ thanh toán trước không hợp lệ.",
  cancellation_policy_conflict: "Mốc thời gian của chính sách hủy đang xung đột.",
};

export function calculateDepositAmount(input: {
  policyType: DepositPolicyType;
  bookingTotalVnd: number | null;
  fixedAmountVnd?: number | null;
  percentageBps?: number | null;
}) {
  const total = input.bookingTotalVnd;
  if (total === null || !Number.isSafeInteger(total) || total < 0) return { valid: false as const, amountDueVnd: null, remainingBalanceVnd: null, blocker: "missing_total" };
  let due: number;
  switch (input.policyType) {
    case "none": due = 0; break;
    case "fixed_amount": {
      const amount = input.fixedAmountVnd;
      if (amount === null || amount === undefined || !Number.isSafeInteger(amount) || amount < 0 || amount > total) return { valid: false as const, amountDueVnd: null, remainingBalanceVnd: null, blocker: "invalid_fixed_amount" };
      due = amount; break;
    }
    case "percentage": {
      const bps = input.percentageBps;
      if (bps === null || bps === undefined || !Number.isInteger(bps) || bps < 1 || bps > 10_000) return { valid: false as const, amountDueVnd: null, remainingBalanceVnd: null, blocker: "invalid_percentage" };
      due = Math.round((total * bps) / 10_000); break;
    }
    case "full_payment": due = total; break;
    case "manual": return { valid: false as const, amountDueVnd: null, remainingBalanceVnd: null, blocker: "manual_policy" };
  }
  return { valid: true as const, amountDueVnd: due, remainingBalanceVnd: total - due, blocker: null };
}
function policyBlockers(policy: CheckoutDepositPolicySummary | null, total: number | null) {
  if (!policy) return { blockers: ["deposit_policy_missing"], deposit: null };
  const deposit = calculateDepositAmount({ policyType: policy.policy_type, bookingTotalVnd: total, fixedAmountVnd: policy.fixed_amount_vnd, percentageBps: policy.percentage_bps });
  const blockers = deposit.valid ? [] : [`deposit_${deposit.blocker}`];
  if (policy.free_cancel_until && policy.non_refundable_after && new Date(policy.free_cancel_until) > new Date(policy.non_refundable_after)) blockers.push("cancellation_policy_conflict");
  return { blockers, deposit };
}

export function resolveCheckoutReadiness(input: CheckoutPolicyInput): CheckoutReadinessDto {
  const blockers: string[] = [];
  if (input.lifecycleStatus !== "active") blockers.push(["cancelled", "completed", "expired"].includes(input.lifecycleStatus) ? "booking_terminal" : "booking_not_active");
  if (["failed", "cancelled"].includes(input.confirmationStatus)) blockers.push("confirmation_failed");
  else if (input.confirmationStatus !== "confirmed") blockers.push("confirmation_incomplete");
  if (!input.quote) blockers.push("quote_missing");
  else if (input.quote.quote_status === "expired" || (input.quote.quote_status === "valid" && input.quote.quote_expires_at && new Date(input.quote.quote_expires_at) <= input.now)) blockers.push("quote_expired");
  else if (input.quote.quote_status !== "valid") blockers.push("quote_needs_requote");
  if (input.quote && input.quote.price_status !== "authoritative") blockers.push(`price_${input.quote.price_status}`);
  if (input.bookingTotalVnd === null) blockers.push("total_unknown");
  const policy = policyBlockers(input.depositPolicy, input.bookingTotalVnd);
  blockers.push(...policy.blockers);
  const state: CheckoutReadinessState = blockers.some((value) => ["booking_terminal", "confirmation_failed", "cancellation_policy_conflict", "deposit_invalid_fixed_amount", "deposit_invalid_percentage"].includes(value))
    ? "blocked"
    : blockers.includes("quote_expired") ? "expired"
      : blockers.some((value) => ["quote_missing", "quote_needs_requote", "price_missing", "price_stale", "price_conflict", "total_unknown"].includes(value)) ? "needs_requote"
        : blockers.includes("confirmation_incomplete") ? "needs_confirmation"
          : blockers.length ? "not_ready" : "ready";
  return {
    policy_version: CHECKOUT_POLICY_VERSION,
    readiness_state: state,
    blockers,
    quote: input.quote,
    amounts: {
      currency: "VND",
      booking_total_vnd: input.bookingTotalVnd,
      deposit_due_vnd: policy.deposit?.valid ? policy.deposit.amountDueVnd : null,
      planned_remaining_balance_vnd: policy.deposit?.valid ? policy.deposit.remainingBalanceVnd : null,
    },
    deposit_policy: input.depositPolicy,
    checkout_session: null,
    provider_state: "unconfigured",
  };
}
