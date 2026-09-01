import {
  ATTENTION_REASONS,
  type AttentionReason,
  type BookingOperationsDecision,
  type OperationsBookingFact,
  type OperationsMetrics,
  type OperationsNextAction,
  type OperationsView,
  type PriorityBucket,
} from "@/features/operations/types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const ATTENTION_REASON_LABELS: Record<AttentionReason, string> = {
  confirmation_pending: "Chờ gửi / chờ phản hồi xác nhận",
  confirmation_overdue: "Confirmation quá hạn nội bộ",
  confirmation_declined: "Dịch vụ bị từ chối",
  confirmation_expired: "Xác nhận đã hết hiệu lực",
  quote_expiring: "Báo giá sắp hết hiệu lực",
  quote_expired: "Báo giá đã hết hiệu lực",
  needs_requote: "Cần báo giá lại",
  checkout_blocked: "Checkout readiness bị chặn",
  booking_stuck: "Booking bị kẹt",
  booking_change_requested: "Có yêu cầu thay đổi đang mở",
  replacement_required: "Cần thay thế dịch vụ",
  missing_price: "Thiếu giá",
  missing_supplier_mapping: "Thiếu đầu mối Supplier",
  data_conflict: "Dữ liệu xung đột",
};

export const PRIORITY_LABELS: Record<PriorityBucket, string> = {
  urgent: "Khẩn cấp",
  high: "Ưu tiên cao",
  normal: "Bình thường",
  low: "Theo dõi",
};

export const NEXT_ACTION_LABELS: Record<OperationsNextAction, string> = {
  REQUEST_CONFIRMATION: "Gửi yêu cầu xác nhận",
  FOLLOW_UP_CONFIRMATION: "Theo dõi Supplier",
  REPLACE_ITEM: "Xử lý thay thế dịch vụ",
  REQUOTE: "Tạo lại báo giá",
  REVIEW_CHANGE: "Xem yêu cầu thay đổi",
  RESOLVE_DATA: "Bổ sung / xử lý dữ liệu",
  READY_NO_ACTION: "Theo dõi — chưa có thao tác cần làm",
  CLOSE_COMPLETED: "Đóng hồ sơ đã hoàn tất",
};

function validDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function pushReason(target: Set<AttentionReason>, value: AttentionReason) {
  target.add(value);
}

export function resolveBookingOperations(booking: OperationsBookingFact, now = new Date()): BookingOperationsDecision {
  const isTerminal = ["cancelled", "completed", "expired"].includes(booking.lifecycle_status);
  const reasons = new Set<AttentionReason>();
  const activeItems = booking.items.filter((item) => item.operational_status === "active");
  const confirmations = activeItems.flatMap((item) => item.confirmation ? [item.confirmation] : []);
  const requested = confirmations.filter((item) => item.status === "requested");
  const pending = confirmations.filter((item) => item.status === "pending" || item.status === "requested");
  const overdue = requested.filter((item) => {
    const due = validDate(item.due_at);
    return due !== null && due.getTime() <= now.getTime();
  });
  const declined = activeItems.some((item) => item.confirmation_status === "declined");
  const confirmationExpired = activeItems.some((item) => item.confirmation_status === "expired");
  const openChanges = booking.change_requests.filter((item) => ["requested", "reviewing", "approved"].includes(item.status));
  const quoteExpiry = validDate(booking.current_quote?.quote_expires_at);
  const checkIn = validDate(`${booking.check_in}T00:00:00+07:00`);
  const submittedAt = validDate(booking.submitted_at);
  const tripDistance = checkIn ? checkIn.getTime() - now.getTime() : Number.POSITIVE_INFINITY;

  if (isTerminal) {
    return {
      booking,
      attention_reasons: [],
      priority_bucket: "low",
      next_action: "CLOSE_COMPLETED",
      deadline_at: null,
      confirmation_aging: {
        requested_count: 0,
        overdue_count: 0,
        oldest_requested_at: null,
        earliest_due_at: null,
        max_age_minutes: null,
      },
    };
  }

  if (pending.length) pushReason(reasons, "confirmation_pending");
  if (overdue.length) pushReason(reasons, "confirmation_overdue");
  if (declined) pushReason(reasons, "confirmation_declined");
  if (confirmationExpired) pushReason(reasons, "confirmation_expired");
  if (declined || confirmationExpired) pushReason(reasons, "replacement_required");
  if (openChanges.length) pushReason(reasons, "booking_change_requested");

  if (booking.current_quote?.quote_status === "expired" || (booking.current_quote?.quote_status === "valid" && quoteExpiry && quoteExpiry <= now)) {
    pushReason(reasons, "quote_expired");
  } else if (booking.current_quote?.quote_status === "valid" && quoteExpiry && quoteExpiry.getTime() - now.getTime() <= 6 * HOUR) {
    pushReason(reasons, "quote_expiring");
  }
  if (!booking.current_quote || booking.checkout.readiness_state === "needs_requote" || booking.current_quote.quote_status === "needs_requote") pushReason(reasons, "needs_requote");
  if (booking.checkout.readiness_state === "blocked") pushReason(reasons, "checkout_blocked");
  if (activeItems.some((item) => item.counts_toward_booking_total && item.price_status === "unknown")) pushReason(reasons, "missing_price");
  if (booking.price_status === "conflict" || activeItems.some((item) => item.price_status === "conflict") || booking.current_quote?.price_status === "conflict") pushReason(reasons, "data_conflict");
  if (activeItems.some((item) => item.component_type === "ROOM" && item.confirmation_mode === "internal_manual" && !item.confirmation?.has_supplier)) pushReason(reasons, "missing_supplier_mapping");

  const submittedAge = submittedAt ? now.getTime() - submittedAt.getTime() : 0;
  if ((booking.lifecycle_status === "submitted" && submittedAge >= 2 * HOUR && !requested.length)
    || (booking.lifecycle_status === "active" && pending.length > 0 && submittedAge >= DAY)
    || (booking.lifecycle_status === "active" && booking.current_quote?.quote_status === "expired")
    || (booking.lifecycle_status === "active" && booking.checkout.readiness_state === "ready" && booking.checkout.checkout_session?.status === "expired")
    || (booking.lifecycle_status === "active" && booking.confirmation_status === "failed" && !openChanges.length)) {
    pushReason(reasons, "booking_stuck");
  }

  const orderedReasons = ATTENTION_REASONS.filter((reason) => reasons.has(reason));
  const maxOverdueMs = overdue.reduce((maximum, item) => {
    const due = validDate(item.due_at);
    return due ? Math.max(maximum, now.getTime() - due.getTime()) : maximum;
  }, 0);
  let priority: PriorityBucket = orderedReasons.length ? "normal" : "low";
  if (declined || confirmationExpired || reasons.has("data_conflict") || maxOverdueMs >= 12 * HOUR || (orderedReasons.length > 0 && tripDistance <= DAY)) priority = "urgent";
  else if (reasons.has("confirmation_overdue") || reasons.has("needs_requote") || reasons.has("booking_stuck") || reasons.has("booking_change_requested") || (orderedReasons.length > 0 && tripDistance <= 3 * DAY)) priority = "high";

  let nextAction: OperationsNextAction;
  if (reasons.has("booking_change_requested")) nextAction = "REVIEW_CHANGE";
  else if (reasons.has("replacement_required")) nextAction = "REPLACE_ITEM";
  else if (reasons.has("data_conflict") || reasons.has("missing_price") || reasons.has("missing_supplier_mapping")) nextAction = "RESOLVE_DATA";
  else if (reasons.has("confirmation_overdue")) nextAction = "FOLLOW_UP_CONFIRMATION";
  else if (activeItems.some((item) => item.confirmation_status === "pending")) nextAction = "REQUEST_CONFIRMATION";
  else if (reasons.has("needs_requote") || reasons.has("quote_expired") || reasons.has("quote_expiring")) nextAction = "REQUOTE";
  else nextAction = "READY_NO_ACTION";

  const deadlineCandidates = [quoteExpiry, checkIn, ...requested.map((item) => validDate(item.due_at))]
    .filter((value): value is Date => value !== null)
    .sort((left, right) => left.getTime() - right.getTime());
  const requestDates = requested.map((item) => validDate(item.requested_at)).filter((value): value is Date => value !== null);
  const oldestRequest = requestDates.sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
  const earliestDue = requested.map((item) => validDate(item.due_at)).filter((value): value is Date => value !== null).sort((left, right) => left.getTime() - right.getTime())[0] ?? null;

  return {
    booking,
    attention_reasons: orderedReasons,
    priority_bucket: priority,
    next_action: nextAction,
    deadline_at: deadlineCandidates[0]?.toISOString() ?? null,
    confirmation_aging: {
      requested_count: requested.length,
      overdue_count: overdue.length,
      oldest_requested_at: oldestRequest?.toISOString() ?? null,
      earliest_due_at: earliestDue?.toISOString() ?? null,
      max_age_minutes: oldestRequest ? Math.max(0, Math.floor((now.getTime() - oldestRequest.getTime()) / 60_000)) : null,
    },
  };
}

function priorityRank(value: PriorityBucket) {
  return { urgent: 0, high: 1, normal: 2, low: 3 }[value];
}

export interface OperationsFilters {
  q?: string;
  view?: string;
  priority?: PriorityBucket | "";
  reason?: AttentionReason | "";
  sort?: "priority" | "oldest_pending" | "trip_date" | "quote_expiry" | "newest";
  page?: number;
  pageSize?: number;
}

function matchesView(decision: BookingOperationsDecision, view: string | undefined) {
  if (!view || view === "all") return true;
  const reasons = decision.attention_reasons;
  if (view === "needs_attention") return reasons.length > 0;
  if (view === "pending") return reasons.includes("confirmation_pending");
  if (view === "overdue") return reasons.includes("confirmation_overdue");
  if (view === "needs_requote") return reasons.includes("needs_requote") || reasons.includes("quote_expired");
  if (view === "quote_expiring") return reasons.includes("quote_expiring");
  if (view === "declined") return reasons.includes("confirmation_declined");
  if (view === "replacement") return reasons.includes("replacement_required");
  if (view === "checkout_blocked") return reasons.includes("checkout_blocked");
  if (view === "ready") return decision.booking.checkout.readiness_state === "ready";
  if (view === "cancelled") return decision.booking.lifecycle_status === "cancelled";
  if (view === "completed") return decision.booking.lifecycle_status === "completed";
  return true;
}

export function buildOperationsView(bookings: OperationsBookingFact[], filters: OperationsFilters = {}, now = new Date()): OperationsView {
  const decisions = bookings.map((booking) => resolveBookingOperations(booking, now));
  const needle = filters.q?.trim().toLocaleLowerCase("vi") ?? "";
  const filtered = decisions.filter((decision) => {
    const booking = decision.booking;
    const searchable = [booking.booking_code, booking.customer_name, booking.customer_phone, booking.check_in, booking.check_out,
      ...booking.items.flatMap((item) => [item.display_name, item.parent_name ?? "", item.supplier_name ?? ""])]
      .join(" ").toLocaleLowerCase("vi");
    return (!needle || searchable.includes(needle))
      && (!filters.priority || decision.priority_bucket === filters.priority)
      && (!filters.reason || decision.attention_reasons.includes(filters.reason))
      && matchesView(decision, filters.view);
  });
  const sort = filters.sort ?? "priority";
  filtered.sort((left, right) => {
    if (sort === "oldest_pending") return (left.confirmation_aging.oldest_requested_at ?? "9999").localeCompare(right.confirmation_aging.oldest_requested_at ?? "9999");
    if (sort === "trip_date") return left.booking.check_in.localeCompare(right.booking.check_in);
    if (sort === "quote_expiry") return (left.booking.current_quote?.quote_expires_at ?? "9999").localeCompare(right.booking.current_quote?.quote_expires_at ?? "9999");
    if (sort === "newest") return right.booking.submitted_at.localeCompare(left.booking.submitted_at);
    return priorityRank(left.priority_bucket) - priorityRank(right.priority_bucket)
      || (left.deadline_at ?? "9999").localeCompare(right.deadline_at ?? "9999")
      || left.booking.submitted_at.localeCompare(right.booking.submitted_at);
  });
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 50);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(filters.page ?? 1, 1), pageCount);
  const responseDurations = bookings.flatMap((booking) => booking.items.flatMap((item) => {
    const confirmation = item.confirmation;
    if (!confirmation?.requested_at || !confirmation.responded_at) return [];
    const start = validDate(confirmation.requested_at); const end = validDate(confirmation.responded_at);
    return start && end && end >= start ? [(end.getTime() - start.getTime()) / 60_000] : [];
  }));
  const activeBookings = bookings.filter((booking) => !["cancelled", "completed", "expired"].includes(booking.lifecycle_status));
  const confirmationRows = activeBookings.flatMap((booking) => booking.items.flatMap((item) => item.confirmation ? [item.confirmation] : []));
  const resolvedConfirmationRows = confirmationRows.filter((item) => ["confirmed", "declined"].includes(item.status));
  const declineCount = resolvedConfirmationRows.filter((item) => item.status === "declined").length;
  const requoteCount = bookings.reduce((total, booking) => total + Math.max(0, (booking.current_quote?.quote_version ?? 1) - 1), 0);
  const metrics: OperationsMetrics = {
    bookings_created: bookings.length,
    bookings_needing_attention: decisions.filter((item) => item.attention_reasons.length > 0).length,
    pending_confirmations: confirmationRows.filter((item) => ["pending", "requested"].includes(item.status)).length,
    overdue_confirmations: decisions.reduce((total, item) => total + item.confirmation_aging.overdue_count, 0),
    quote_expiring_count: decisions.filter((item) => item.attention_reasons.includes("quote_expiring")).length,
    replacement_required_count: decisions.filter((item) => item.attention_reasons.includes("replacement_required")).length,
    average_confirmation_response_minutes: responseDurations.length ? Math.round(responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length) : null,
    decline_count: declineCount,
    decline_rate_percent: resolvedConfirmationRows.length ? Math.round((declineCount * 10_000) / resolvedConfirmationRows.length) / 100 : null,
    requote_count: requoteCount,
    needs_requote_count: decisions.filter((item) => item.attention_reasons.includes("needs_requote") || item.attention_reasons.includes("quote_expired")).length,
    checkout_ready_count: bookings.filter((item) => item.checkout.readiness_state === "ready").length,
    completed_count: bookings.filter((item) => item.lifecycle_status === "completed").length,
  };
  return {
    decisions,
    page_items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total_filtered: filtered.length,
    page,page_size:pageSize,page_count:pageCount,
    urgent_count: decisions.filter((item) => item.priority_bucket === "urgent" && item.attention_reasons.length > 0).length,
    metrics,source_total:bookings.length,source_truncated:false,
  };
}
