import type { AvailabilityQuote, AvailabilityState, InventorySource } from "@/features/availability/types";

export const AVAILABILITY_POLICY_VERSION = "phase6-v1" as const;
export const MAX_AVAILABILITY_STAY_NIGHTS = 31;
export const MAX_INVENTORY_BULK_DATES = 365;
export const LIVE_AVAILABILITY_HOURS = 6;
export const VERIFIED_TODAY_HOURS = 24;

export const INVENTORY_SOURCE_LABELS: Record<InventorySource, string> = {
  partner: "Nơi lưu trú cập nhật",
  admin: "Nhân sự Tà Xùa Stay xác nhận",
  booking_engine: "Hệ thống đặt phòng cập nhật",
  import: "Dữ liệu nhập",
};

export const AVAILABILITY_STATE_LABELS: Record<AvailabilityState, string> = {
  live: "Còn phòng",
  verified_today: "Còn phòng · xác nhận hôm nay",
  needs_confirmation: "Cần xác nhận lại",
  unknown: "Chưa có dữ liệu tình trạng phòng",
  sold_out: "Hết phòng",
};

export const AVAILABILITY_STATE_RANK: Record<AvailabilityState, number> = {
  live: 5,
  verified_today: 4,
  needs_confirmation: 3,
  unknown: 2,
  sold_out: 1,
};

export function availabilityFreshnessState(verifiedAt: string, now = new Date()): Exclude<AvailabilityState, "sold_out"> {
  const verified = new Date(verifiedAt);
  const ageMs = now.getTime() - verified.getTime();
  if (Number.isNaN(verified.getTime()) || ageMs < 0) return "unknown";
  const ageHours = ageMs / 3_600_000;
  if (ageHours < LIVE_AVAILABILITY_HOURS) return "live";
  if (ageHours <= VERIFIED_TODAY_HOURS) return "verified_today";
  return "needs_confirmation";
}

export function formatAvailabilitySummary(quote: AvailabilityQuote | null | undefined) {
  if (!quote) return "Chọn ngày để xem tình trạng phòng";
  if (quote.state !== "live") return AVAILABILITY_STATE_LABELS[quote.state];
  const age = quote.oldest_verification_age_hours;
  if (age === null || age < 1) return "Còn phòng · cập nhật chưa đầy 1 giờ trước";
  return `Còn phòng · cập nhật ${Math.floor(age)} giờ trước`;
}

export function isCurrentlyAvailable(state: AvailabilityState) {
  return state === "live" || state === "verified_today";
}
