import type { AccessCertainty, PublicPropertyDto, RoadAccessGrade } from "@/features/properties/types";
import type {
  CloudViewComponents,
  PublicVerificationBadgeDto,
  PublicRoadVerificationDto,
  VerificationResolvedState,
  VerificationStatus,
  VerificationType,
} from "@/features/verification/types";

export const CLOUD_COMPONENT_LIMITS: Record<keyof CloudViewComponents, number> = {
  direct_valley_points: 30,
  view_width_points: 20,
  obstruction_points: 15,
  view_from_bed_points: 15,
  private_position_points: 10,
  orientation_points: 5,
  evidence_points: 5,
};

export const VERIFICATION_FRESHNESS_MONTHS: Record<VerificationType, number> = {
  property_identity: 12,
  property_location: 12,
  room: 12,
  cloud_view: 12,
  road_access: 6,
  media_360: 12,
  room_quality: 12,
};

export const VERIFICATION_TYPE_LABELS: Record<VerificationType, string> = {
  property_identity: "Danh tính đã kiểm tra",
  property_location: "Vị trí đã kiểm tra",
  room: "Room Verified",
  cloud_view: "Cloud View Verified",
  road_access: "Road Verified",
  media_360: "360° Verified",
  room_quality: "Hồ sơ chất lượng phòng",
};

export const VERIFICATION_STATE_LABELS: Record<VerificationResolvedState, string> = {
  current: "Còn hiệu lực",
  not_yet_valid: "Ngày xác minh chưa có hiệu lực",
  pending: "Chờ kiểm tra",
  verified: "Đã xác minh",
  expired: "Đã hết hạn / cần kiểm tra lại",
  rejected: "Không đạt",
  needs_review: "Cần xem lại",
};

export const CLOUD_VIEW_FROM_BED_LABELS = {
  yes: "Có",
  partial: "Một phần",
  no: "Không",
} as const;

export const VIEWING_POSITION_LABELS = {
  private_balcony: "Ban công riêng",
  private_terrace: "Sân hiên riêng",
  private_window: "Cửa sổ riêng",
  semi_private: "Vị trí bán riêng tư",
  shared: "Khu vực dùng chung",
  none: "Không có vị trí ngắm phù hợp",
} as const;

export const VIEW_DIRECTION_LABELS = {
  N: "Bắc",
  NE: "Đông Bắc",
  E: "Đông",
  SE: "Đông Nam",
  S: "Nam",
  SW: "Tây Nam",
  W: "Tây",
  NW: "Tây Bắc",
  unknown: "Chưa xác nhận",
} as const;

export const ROAD_GRADE_LABELS = {
  a: "A — Dễ tiếp cận",
  b: "B — Cần lưu ý",
  c: "C — Khó tiếp cận",
  d: "D — Ô tô không vào trực tiếp",
} as const;

export const ROAD_SURFACE_LABELS = {
  asphalt: "Nhựa",
  concrete: "Bê tông",
  gravel: "Đá dăm",
  dirt: "Đường đất",
  mixed: "Nhiều loại mặt đường",
  unknown: "Chưa xác nhận",
} as const;

export function calculateCloudViewTotal(components: CloudViewComponents) {
  return (Object.entries(CLOUD_COMPONENT_LIMITS) as Array<[
    keyof CloudViewComponents,
    number,
  ]>).reduce((total, [key, maximum]) => {
    const value = components[key];
    if (!Number.isInteger(value) || value < 0 || value > maximum) {
      throw new RangeError(`${key} must be an integer from 0 to ${maximum}`);
    }
    return total + value;
  }, 0);
}
export function calculateCloudViewScore(components: CloudViewComponents) {
  return calculateCloudViewTotal(components) / 10;
}

export function getCloudViewLabel(score: number) {
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new RangeError("Cloud View score must be between 0 and 10");
  }
  if (score >= 9) return "Xuất sắc";
  if (score >= 8) return "Rất tốt";
  if (score >= 6.5) return "Tốt";
  if (score >= 5) return "Một phần";
  if (score >= 3) return "Chủ yếu ở khu chung";
  return "Không phù hợp nếu mục tiêu là săn mây tại phòng";
}

export function resolveVerificationState(
  status: VerificationStatus,
  verifiedAt: string | null,
  expiresAt: string | null,
  now = new Date(),
): VerificationResolvedState {
  if (status !== "verified") return status;
  const verifiedTime = verifiedAt ? new Date(verifiedAt).getTime() : Number.NaN;
  const expiryTime = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  if (!Number.isFinite(verifiedTime) || !Number.isFinite(expiryTime)) return "expired";
  if (verifiedTime > now.getTime()) return "not_yet_valid";
  if (expiryTime <= now.getTime()) return "expired";
  return "current";
}

export interface VerificationLifecycleSnapshot {
  status: VerificationStatus;
  verified_at: string | null;
  expires_at: string | null;
}

export function resolveVerificationDateSubmission({
  status,
  existing,
  submittedVerifiedAt,
  submittedExpiresAt,
  useCustomDates,
  now = new Date(),
}: {
  status: VerificationStatus;
  existing: VerificationLifecycleSnapshot | null;
  submittedVerifiedAt: string | null;
  submittedExpiresAt: string | null;
  useCustomDates: boolean;
  now?: Date;
}) {
  const existingState = existing
    ? resolveVerificationState(existing.status, existing.verified_at, existing.expires_at, now)
    : null;
  const startsFreshCycle = status === "verified" && existingState !== "current";

  if (startsFreshCycle && !useCustomDates) {
    return { verifiedAt: null, expiresAt: null, startsFreshCycle };
  }

  return {
    verifiedAt: submittedVerifiedAt,
    expiresAt: submittedExpiresAt,
    startsFreshCycle,
  };
}

export function getDefaultVerificationExpiry(type: VerificationType, verifiedAt: Date) {
  const expiry = new Date(verifiedAt);
  expiry.setUTCMonth(expiry.getUTCMonth() + VERIFICATION_FRESHNESS_MONTHS[type]);
  return expiry;
}

export function isVerificationExpiringSoon(
  expiresAt: string | null,
  now = new Date(),
  withinDays = 30,
) {
  if (!expiresAt) return false;
  const remaining = new Date(expiresAt).getTime() - now.getTime();
  return remaining > 0 && remaining <= withinDays * 24 * 60 * 60 * 1000;
}

export function isPropertyVerified(
  badges: Array<Pick<PublicVerificationBadgeDto, "verification_type">>,
) {
  return badges.some((badge) => badge.verification_type === "property_identity")
    && badges.some((badge) => badge.verification_type === "property_location");
}

export function getEffectiveRoadFacts(
  property: Pick<PublicPropertyDto, "road_access_grade" | "car_access" | "motorbike_access" | "parking">,
  road: PublicRoadVerificationDto | null,
): {
  grade: RoadAccessGrade;
  carAccess: AccessCertainty;
  motorbikeAccess: AccessCertainty;
  parking: AccessCertainty;
  source: "verified" | "preliminary";
} {
  if (road) {
    return {
      grade: road.grade,
      carAccess: road.car_access,
      motorbikeAccess: road.motorbike_access,
      parking: road.parking,
      source: "verified",
    };
  }
  return {
    grade: property.road_access_grade,
    carAccess: property.car_access,
    motorbikeAccess: property.motorbike_access,
    parking: property.parking,
    source: "preliminary",
  };
}
