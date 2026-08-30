import type { PriceConfidence, PriceSource, PublicRateRuleDto, RateType } from "@/features/pricing/types";

export const PRICE_POLICY_VERSION = "phase5-v1" as const;
export const MAX_PRICE_QUOTE_NIGHTS = 31;
export const RECENT_PRICE_DAYS = 30;

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  weekday: "Ngày thường (Thứ Hai–Thứ Năm)",
  weekend: "Cuối tuần (Thứ Sáu–Chủ Nhật)",
  peak: "Cao điểm",
  holiday: "Ngày lễ",
  override: "Giá điều chỉnh riêng",
};

export const PRICE_CONFIDENCE_LABELS: Record<PriceConfidence, string> = {
  verified: "Giá đã xác minh",
  recent: "Giá cập nhật gần đây",
  reference: "Giá tham khảo",
  unknown: "Chưa có giá đủ rõ ràng",
};

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  partner: "Đối tác lưu trú",
  admin: "Nhân sự Tà Xùa Trip",
  contract: "Thỏa thuận giá",
  import: "Dữ liệu nhập",
  reference: "Nguồn tham khảo",
  other: "Nguồn khác",
};

export const RATE_TYPE_PRECEDENCE: Record<RateType, number> = {
  weekday: 1,
  weekend: 2,
  peak: 3,
  holiday: 4,
  override: 5,
};

const TRUSTED_VERIFIED_SOURCES = new Set<PriceSource>(["partner", "admin", "contract"]);
const RECENT_SOURCES = new Set<PriceSource>(["partner", "admin", "contract", "import"]);
const HAS_TIME_ZONE = /(Z|[+-]\d{2}:\d{2})$/i;
const VIETNAM_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

export function formatLodgingDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00.000Z`));
}

export function vietnamCalendarDate(value: string | Date) {
  const instant = typeof value === "string"
    ? new Date(HAS_TIME_ZONE.test(value) ? value : `${value}+07:00`)
    : value;
  if (Number.isNaN(instant.getTime())) return null;

  const parts = VIETNAM_DATE_FORMATTER.formatToParts(instant);
  const calendarParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${calendarParts.year}-${calendarParts.month}-${calendarParts.day}`;
}

export function vietnamDate(now = new Date()) {
  return vietnamCalendarDate(now) ?? "";
}

export function priceVerificationDatesAreConsistent(
  verifiedAt: string | null,
  validUntil: string | null,
) {
  if (!verifiedAt || !validUntil) return true;
  const verifiedDate = vietnamCalendarDate(verifiedAt);
  return verifiedDate !== null && validUntil >= verifiedDate;
}

export function resolvePriceConfidence(
  rule: PublicRateRuleDto,
  night: string,
  now = new Date(),
): PriceConfidence {
  if (!rule.price_verified_at) return "reference";
  const verifiedAt = new Date(rule.price_verified_at);
  if (Number.isNaN(verifiedAt.getTime()) || verifiedAt > now) return "reference";

  const today = vietnamDate(now);
  const mustRemainValidThrough = night > today ? night : today;
  if (
    TRUSTED_VERIFIED_SOURCES.has(rule.source)
    && rule.price_valid_until !== null
    && rule.price_valid_until >= mustRemainValidThrough
  ) {
    return "verified";
  }

  const ageMs = now.getTime() - verifiedAt.getTime();
  if (RECENT_SOURCES.has(rule.source) && ageMs <= RECENT_PRICE_DAYS * 86_400_000) return "recent";
  return "reference";
}

export function worseConfidence(left: PriceConfidence, right: PriceConfidence): PriceConfidence {
  const order: Record<PriceConfidence, number> = { verified: 3, recent: 2, reference: 1, unknown: 0 };
  return order[left] <= order[right] ? left : right;
}
