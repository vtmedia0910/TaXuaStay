import type { CommercialFreshness, CommercialResolverRule, CommercialSource, CommercialPlanStatus } from "@/features/economics/types";
import { RATE_TYPE_PRECEDENCE } from "@/features/pricing/policy";
import type { RateType } from "@/features/pricing/types";

export const ECONOMICS_POLICY_VERSION = "phase4-economics-v1" as const;
export const RECENT_COMMERCIAL_DAYS = 30;

export const COMMERCIAL_STATUS_LABELS: Record<CommercialPlanStatus, string> = {
  draft: "Bản nháp",
  active: "Đang áp dụng",
  paused: "Tạm dừng",
  expired: "Hết hiệu lực",
  archived: "Đã lưu trữ",
};

export const COMMERCIAL_SOURCE_LABELS: Record<CommercialSource, string> = {
  partner: "Nhà cung cấp",
  admin: "Nhân sự Tà Xùa Trip",
  contract: "Thỏa thuận thương mại",
  import: "Dữ liệu nhập",
  reference: "Nguồn tham khảo",
  other: "Nguồn khác",
};

export const COMMERCIAL_FRESHNESS_LABELS: Record<CommercialFreshness, string> = {
  verified: "Đã xác minh",
  recent: "Mới cập nhật",
  reference: "Tham khảo",
  unknown: "Chưa rõ",
};

const TRUSTED_SOURCES = new Set<CommercialSource>(["partner", "admin", "contract"]);
const RECENT_SOURCES = new Set<CommercialSource>(["partner", "admin", "contract", "import"]);
const VIETNAM_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function vietnamBusinessDate(value: Date | string) {
  const instant = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(instant.getTime())) return null;
  const parts = Object.fromEntries(VIETNAM_DATE_FORMATTER.formatToParts(instant).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function commercialVerificationDatesAreConsistent(verifiedAt: string | null, validUntil: string | null) {
  if (!verifiedAt || !validUntil) return true;
  const verifiedDate = vietnamBusinessDate(new Date(`${verifiedAt}+07:00`));
  return verifiedDate !== null && validUntil >= verifiedDate;
}

export function resolveCommercialFreshness(rule: CommercialResolverRule, night: string, now = new Date()): CommercialFreshness {
  if (!rule.verified_at) return "reference";
  const verifiedAt = new Date(rule.verified_at);
  if (Number.isNaN(verifiedAt.getTime()) || verifiedAt > now) return "unknown";
  const today = vietnamBusinessDate(now) ?? "";
  const requiredThrough = night > today ? night : today;
  if (TRUSTED_SOURCES.has(rule.source) && rule.valid_until !== null && rule.valid_until >= requiredThrough) {
    return "verified";
  }
  if (RECENT_SOURCES.has(rule.source) && now.getTime() - verifiedAt.getTime() <= RECENT_COMMERCIAL_DAYS * 86_400_000) {
    return "recent";
  }
  return "reference";
}

export function commercialPriority(rateType: RateType, rulePriority: number, planPriority: number) {
  return [RATE_TYPE_PRECEDENCE[rateType], rulePriority, planPriority] as const;
}
