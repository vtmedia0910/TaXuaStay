import type { CheckoutReadinessDto } from "@/features/checkout/types";
import type { OperationsChangeRequestFact } from "@/features/operations/types";

export const BOOKING_LIFECYCLE_STATUSES = ["submitted", "active", "cancelled", "completed", "expired"] as const;
export const BOOKING_CONFIRMATION_STATUSES = ["pending", "partial", "confirmed", "failed", "cancelled"] as const;
export const ITEM_CONFIRMATION_STATUSES = ["pending", "requested", "partial", "confirmed", "declined", "expired", "cancelled", "not_required"] as const;
export type BookingLifecycleStatus = (typeof BOOKING_LIFECYCLE_STATUSES)[number];
export type BookingConfirmationStatus = (typeof BOOKING_CONFIRMATION_STATUSES)[number];
export type ItemConfirmationStatus = (typeof ITEM_CONFIRMATION_STATUSES)[number];
export type BookingComponentType = "ROOM" | "MOTORBIKE" | "PACKAGE" | "CUSTOM";

export interface BookingSelection {
  type: "ROOM" | "PACKAGE";
  source_id: string;
  quantity?: number;
  optional_component_keys?: string[];
}

export interface MotorbikeBookingSelection {
  type: "MOTORBIKE";
  source_slug: string;
  quantity?: number;
}

export type PublicBookingSelection = BookingSelection | MotorbikeBookingSelection;

export interface BookingRequestReviewItem {
  type: PublicBookingSelection["type"];
  name: string;
  context: string | null;
  priceLabel: string;
  availabilityLabel: string;
}

export interface BookingRequestReview {
  selections: PublicBookingSelection[];
  items: BookingRequestReviewItem[];
  status: "ready" | "invalid" | "unconfigured";
}

export interface PublicBookingStatusItem {
  item_key: string;
  component_type: BookingComponentType;
  display_name: string;
  description: string | null;
  parent_name: string | null;
  quantity: number;
  is_required: boolean;
  counts_toward_booking_total: boolean;
  sell_price_vnd: number | null;
  price_status: "quoted" | "included_in_package" | "unknown" | "conflict";
  availability_status: "recorded_available" | "needs_confirmation" | "unknown" | "unavailable";
  confirmation_status: ItemConfirmationStatus;
  confirmation_mode: "supplier_manual" | "operator_manual" | "internal_manual" | "not_required";
  quoted_at: string;
  verification: {
    room_verified: boolean | null;
    cloud_view_verified: boolean | null;
    road_verified: boolean | null;
    road_grade: "a" | "b" | "c" | "d" | null;
  };
}

export interface PublicBookingStatusDto {
  booking_code: string;
  lifecycle_status: BookingLifecycleStatus;
  confirmation_status: BookingConfirmationStatus;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
  currency: "VND";
  quoted_sell_total_vnd: number | null;
  price_status: "quoted" | "partial" | "unknown" | "conflict";
  quoted_at: string;
  submitted_at: string;
  items: PublicBookingStatusItem[];
  events: Array<{ event_type: string; message: string; created_at: string }>;
  checkout: CheckoutReadinessDto;
}

export interface AdminBookingDto extends Omit<PublicBookingStatusDto, "items" | "events" | "checkout"> {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_zalo: string | null;
  customer_note: string | null;
  internal_note: string | null;
  updated_at: string;
  operations_revision: number;
  last_operational_activity_at: string;
}

export interface AdminBookingItemDto extends Omit<PublicBookingStatusItem, "verification"> {
  id: string;
  booking_id: string;
  parent_booking_item_id: string | null;
  net_cost_vnd: number | null;
  source_snapshot: Record<string, unknown>;
  price_snapshot: Record<string, unknown>;
  availability_snapshot: Record<string, unknown>;
  verification_snapshot: Record<string, unknown>;
  policy_snapshot: Record<string, unknown>;
  operational_status: "active" | "replaced" | "cancelled";
  replacement_for_booking_item_id: string | null;
  replaced_by_booking_item_id: string | null;
  change_request_id: string | null;
  operational_updated_at: string;
  confirmation?: AdminBookingConfirmationDto | null;
}

export interface AdminBookingConfirmationDto {
  id: string;
  booking_item_id: string;
  supplier_id: string | null;
  supplier_contact_id: string | null;
  status: Exclude<ItemConfirmationStatus, "partial" | "not_required">;
  confirmation_mode: "supplier_manual" | "operator_manual" | "internal_manual";
  requested_at: string | null;
  responded_at: string | null;
  expires_at: string | null;
  due_at: string | null;
  last_reminded_at: string | null;
  reminder_count: number;
  overdue_event_at: string | null;
  external_reference: string | null;
  response_note_internal: string | null;
  supplier_snapshot: Record<string, unknown>;
  updated_at: string;
  telegram_channel_id?: string | null;
  telegram_channel_status?: "active" | "disabled" | "error" | null;
}

export interface AdminBookingEventDto {
  id: number;
  booking_id: string;
  booking_item_id: string | null;
  event_type: string;
  public_message: string | null;
  internal_detail: Record<string, unknown>;
  actor_type: "customer" | "staff" | "admin" | "system";
  created_at: string;
}

export interface AdminConfirmationEventDto {
  id: number;
  booking_id: string;
  booking_item_id: string;
  confirmation_id: string;
  previous_status: string;
  next_status: string;
  requested_at_snapshot: string | null;
  due_at_snapshot: string | null;
  responded_at_snapshot: string | null;
  expires_at_snapshot: string | null;
  reminder_count_snapshot: number;
  external_reference_snapshot: string | null;
  response_note_snapshot: string | null;
  reason: string | null;
  actor_type: "staff" | "admin" | "system";
  created_at: string;
}

export interface AdminBookingBundle {
  booking: AdminBookingDto;
  items: AdminBookingItemDto[];
  events: AdminBookingEventDto[];
  changeRequests: OperationsChangeRequestFact[];
  confirmationEvents: AdminConfirmationEventDto[];
}
