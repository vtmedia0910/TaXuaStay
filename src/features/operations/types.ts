import type { BookingConfirmationStatus, BookingLifecycleStatus } from "@/features/bookings/types";
import type { CheckoutReadinessDto } from "@/features/checkout/types";

export const OPERATIONS_POLICY_VERSION = "phase11-operations-v1" as const;
export const OPERATIONS_PRIORITY_VERSION = "phase11-operations-priority-v1" as const;

export const ATTENTION_REASONS = [
  "confirmation_pending",
  "confirmation_overdue",
  "confirmation_declined",
  "confirmation_expired",
  "quote_expiring",
  "quote_expired",
  "needs_requote",
  "checkout_blocked",
  "booking_stuck",
  "booking_change_requested",
  "replacement_required",
  "missing_price",
  "missing_supplier_mapping",
  "data_conflict",
  "supplier_discussion",
] as const;

export const PRIORITY_BUCKETS = ["urgent", "high", "normal", "low"] as const;
export const NEXT_ACTIONS = [
  "REQUEST_CONFIRMATION",
  "FOLLOW_UP_CONFIRMATION",
  "REPLACE_ITEM",
  "REQUOTE",
  "REVIEW_CHANGE",
  "RESOLVE_DATA",
  "READY_NO_ACTION",
  "CLOSE_COMPLETED",
] as const;

export type AttentionReason = (typeof ATTENTION_REASONS)[number];
export type PriorityBucket = (typeof PRIORITY_BUCKETS)[number];
export type OperationsNextAction = (typeof NEXT_ACTIONS)[number];
export type BookingChangeType = "dates" | "guest_count" | "room_quantity" | "replace_item";
export type BookingChangeStatus = "requested" | "reviewing" | "approved" | "applied" | "rejected" | "cancelled";

export interface OperationsConfirmationFact {
  id: string;
  status: "pending" | "requested" | "confirmed" | "declined" | "expired" | "cancelled";
  requested_at: string | null;
  due_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  last_reminded_at: string | null;
  reminder_count: number;
  updated_at: string;
  has_supplier: boolean;
}

export interface OperationsItemFact {
  id: string;
  item_key: string;
  component_type: "ROOM" | "MOTORBIKE" | "PACKAGE" | "CUSTOM";
  display_name: string;
  parent_name: string | null;
  quantity: number;
  is_required: boolean;
  counts_toward_booking_total: boolean;
  price_status: "quoted" | "included_in_package" | "unknown" | "conflict";
  availability_status: "recorded_available" | "needs_confirmation" | "unknown" | "unavailable";
  confirmation_status: string;
  confirmation_mode: string;
  source_room_type_id: string | null;
  source_motorbike_offering_id: string | null;
  source_package_id: string | null;
  operational_status: "active" | "replaced" | "cancelled";
  replacement_for_booking_item_id: string | null;
  replaced_by_booking_item_id: string | null;
  supplier_name: string | null;
  confirmation: OperationsConfirmationFact | null;
}

export interface OperationsChangeRequestFact {
  id: string;
  change_code: string;
  change_type: BookingChangeType;
  status: BookingChangeStatus;
  request_payload: Record<string, unknown>;
  customer_reason: string | null;
  internal_note: string | null;
  booking_revision_at_request: number;
  resolution_snapshot: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
}

export interface OperationsQuoteFact {
  id: string;
  quote_version: number;
  quote_status: "valid" | "expired" | "superseded" | "needs_requote";
  price_status: "authoritative" | "missing" | "stale" | "conflict";
  booking_total_vnd: number | null;
  quoted_at: string;
  quote_expires_at: string | null;
}

export interface OperationsBookingFact {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  lifecycle_status: BookingLifecycleStatus;
  confirmation_status: BookingConfirmationStatus;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
  price_status: "quoted" | "partial" | "unknown" | "conflict";
  submitted_at: string;
  updated_at: string;
  operations_revision: number;
  last_operational_activity_at: string;
  items: OperationsItemFact[];
  change_requests: OperationsChangeRequestFact[];
  current_quote: OperationsQuoteFact | null;
  checkout: CheckoutReadinessDto;
  has_open_telegram_discussion?: boolean;
}

export interface AdminOperationsFeed {
  policy_version: typeof OPERATIONS_POLICY_VERSION;
  priority_policy_version: typeof OPERATIONS_PRIORITY_VERSION;
  total_bookings: number;
  truncated: boolean;
  bookings: OperationsBookingFact[];
}

export interface DataHealthIssue {
  category: "booking" | "confirmation" | "quote" | "checkout" | "supplier" | "data_health" | "security_config";
  code: string;
  label: string;
  entity_type: string;
  entity_id: string;
  entity_label: string;
  path: string;
  fingerprint: string;
}

export interface AdminDataHealthFeed {
  policy_version: "phase11-data-health-v1";
  total_issues: number;
  truncated: boolean;
  issues: DataHealthIssue[];
}

export interface ConfirmationAgingSummary {
  requested_count: number;
  overdue_count: number;
  oldest_requested_at: string | null;
  earliest_due_at: string | null;
  max_age_minutes: number | null;
}

export interface BookingOperationsDecision {
  booking: OperationsBookingFact;
  attention_reasons: AttentionReason[];
  priority_bucket: PriorityBucket;
  next_action: OperationsNextAction;
  deadline_at: string | null;
  confirmation_aging: ConfirmationAgingSummary;
}

export interface OperationsMetrics {
  bookings_created: number;
  bookings_needing_attention: number;
  pending_confirmations: number;
  overdue_confirmations: number;
  quote_expiring_count: number;
  replacement_required_count: number;
  average_confirmation_response_minutes: number | null;
  decline_count: number;
  decline_rate_percent: number | null;
  requote_count: number;
  needs_requote_count: number;
  checkout_ready_count: number;
  completed_count: number;
}

export interface OperationsView {
  decisions: BookingOperationsDecision[];
  page_items: BookingOperationsDecision[];
  total_filtered: number;
  page: number;
  page_size: number;
  page_count: number;
  urgent_count: number;
  metrics: OperationsMetrics;
  source_total: number;
  source_truncated: boolean;
}
