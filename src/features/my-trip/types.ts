import type { CheckoutReadinessDto } from "@/features/checkout/types";

export type CustomerTripStatusKey =
  | "submitted"
  | "pending_confirmation"
  | "partially_confirmed"
  | "confirmed"
  | "confirmation_failed"
  | "ready_checkout"
  | "needs_requote"
  | "quote_expired"
  | "booking_cancelled"
  | "booking_expired"
  | "booking_completed";

export type CustomerTripTone = "info" | "progress" | "success" | "warning" | "danger" | "neutral";

export interface CustomerTripAction {
  label: string;
  href: string;
  external: boolean;
}

export interface CustomerTripItemDto {
  key: string;
  type: "ROOM" | "MOTORBIKE" | "PACKAGE" | "CUSTOM";
  typeLabel: string;
  title: string;
  parentName: string | null;
  description: string | null;
  quantity: number;
  servicePeriodLabel: string;
  priceLabel: string;
  confirmationLabel: string;
  confirmationTone: CustomerTripTone;
  availabilityLabel: string;
  verificationLabels: string[];
  caveat: string;
  includedInPackage: boolean;
}

export interface CustomerTripTimelineItemDto {
  key: string;
  category: "request" | "confirmation" | "quote" | "readiness" | "completion" | "update";
  message: string;
  createdAt: string;
}

export interface CustomerTripDashboardDto {
  bookingCode: string;
  dateRangeLabel: string;
  durationLabel: string;
  guestSummary: string;
  status: {
    key: CustomerTripStatusKey;
    label: string;
    description: string;
    tone: CustomerTripTone;
  };
  lifecycleLabel: string;
  confirmationLabel: string;
  primaryAction: CustomerTripAction;
  items: CustomerTripItemDto[];
  checkout: CheckoutReadinessDto;
  timeline: CustomerTripTimelineItemDto[];
  supportActions: CustomerTripAction[];
}
