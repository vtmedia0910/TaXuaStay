import { resolveVerificationState } from "@/features/verification/policy";
import type { VerificationStatus } from "@/features/verification/types";
import type {
  RoomQualityDimension,
  RoomQualityDimensionState,
  RoomQualityScores,
} from "@/features/room-profiles/types";

export const ROOM_QUALITY_LABELS: Record<RoomQualityDimension, string> = {
  cleanliness: "Độ sạch",
  soundproof: "Điểm cách âm",
  heating: "Khả năng giữ ấm",
  hot_water: "Nước nóng",
  wifi: "Wi-Fi",
  bathroom: "Phòng tắm",
  room_accuracy: "Phòng giống thông tin công bố",
  comfort: "Độ thoải mái",
};

export const ROOM_QUALITY_FRESHNESS: Record<
  RoomQualityDimension,
  { amount: number; unit: "days" | "months"; label: string }
> = {
  cleanliness: { amount: 90, unit: "days", label: "90 ngày" },
  soundproof: { amount: 12, unit: "months", label: "12 tháng hoặc khi có thay đổi công trình" },
  heating: { amount: 6, unit: "months", label: "6 tháng" },
  hot_water: { amount: 6, unit: "months", label: "6 tháng" },
  wifi: { amount: 6, unit: "months", label: "6 tháng" },
  bathroom: { amount: 12, unit: "months", label: "12 tháng hoặc sau cải tạo" },
  room_accuracy: { amount: 12, unit: "months", label: "12 tháng hoặc sau thay đổi phòng" },
  comfort: { amount: 6, unit: "months", label: "6 tháng" },
};

export const ROOM_QUALITY_RUBRICS: Record<RoomQualityDimension, string> = {
  cleanliness: "0–20 bẩn rõ/mùi mạnh; 30–40 nhiều điểm cần xử lý; 50–60 dùng được nhưng còn lỗi; 70–80 sạch; 90–100 rất sạch và nhất quán. Quan sát bề mặt, chăn ga, bụi, mùi và WC tại thời điểm kiểm tra.",
  soundproof: "0–20 tiếng nói/ồn phòng bên xâm nhập rõ; 30–40 thường gây gián đoạn; 50–60 nghe thấy nhưng nhiều khách vẫn chấp nhận; 70–80 nhìn chung yên; 90–100 cách âm rất tốt.",
  heating: "0–20 lạnh/lùa rõ và thiếu giải pháp; 30–40 giữ ấm yếu; 50–60 đủ trong điều kiện vừa; 70–80 kín gió và sưởi phù hợp; 90–100 giữ ấm rất tốt. Không đo dự báo thời tiết.",
  hot_water: "0–20 thiếu hoặc rất bất ổn; 30–40 chậm/gián đoạn thường xuyên; 50–60 đủ dùng có hạn chế; 70–80 ổn định; 90–100 lên nhanh và duy trì rất tốt trong lần kiểm tra.",
  wifi: "0–20 hầu như không dùng được; 30–40 chập chờn; 50–60 đủ nhu cầu cơ bản; 70–80 ổn định; 90–100 rất ổn định tại phòng. Không công bố Mbps nếu chưa đo.",
  bathroom: "0–20 bất tiện/lỗi rõ; 30–40 nhiều hạn chế; 50–60 dùng được; 70–80 tốt về riêng tư, thoát nước, thông gió và thiết bị; 90–100 rất tốt và đồng bộ.",
  room_accuracy: "0–20 khác đáng kể thông tin công bố; 30–40 nhiều điểm lệch; 50–60 khớp phần chính; 70–80 khớp tốt; 90–100 khớp rất sát về diện tích, giường, WC, ban công, view, nội thất, bố cục và ảnh.",
  comfort: "0–20 rất khó nghỉ; 30–40 nhiều bất tiện; 50–60 chấp nhận được; 70–80 thoải mái; 90–100 rất thoải mái về giường, không gian và ánh sáng, nhưng vẫn tách khỏi các chiều riêng.",
};

export function getRoomQualityLabel(score100: number) {
  if (!Number.isInteger(score100) || score100 < 0 || score100 > 100) {
    throw new RangeError("Room quality score must be an integer from 0 to 100");
  }
  if (score100 >= 90) return "Xuất sắc";
  if (score100 >= 80) return "Rất tốt";
  if (score100 >= 70) return "Tốt";
  if (score100 >= 50) return "Trung bình";
  if (score100 >= 30) return "Yếu";
  return "Kém";
}

export function formatRoomQualityScore(score100: number | null) {
  if (score100 === null) return "Chưa xác minh";
  getRoomQualityLabel(score100);
  return `${(score100 / 10).toFixed(1)} / 10`;
}

function addFreshness(verifiedAt: Date, dimension: RoomQualityDimension) {
  const result = new Date(verifiedAt);
  const policy = ROOM_QUALITY_FRESHNESS[dimension];
  if (policy.unit === "days") {
    result.setUTCDate(result.getUTCDate() + policy.amount);
  } else {
    result.setUTCMonth(result.getUTCMonth() + policy.amount);
  }
  return result;
}

export function resolveRoomQualityDimensionState({
  dimension,
  score,
  verifiedAt,
  expiresAt,
  now = new Date(),
}: {
  dimension: RoomQualityDimension;
  score: number | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  now?: Date;
}): RoomQualityDimensionState {
  if (score === null) return "unknown";
  if (!Number.isInteger(score) || score < 0 || score > 100) return "unknown";
  const verified = verifiedAt ? new Date(verifiedAt) : null;
  const expires = expiresAt ? new Date(expiresAt) : null;
  if (!verified || !expires || !Number.isFinite(verified.getTime()) || !Number.isFinite(expires.getTime())) return "stale";
  if (verified.getTime() > now.getTime() || expires.getTime() <= now.getTime()) return "stale";
  return addFreshness(verified, dimension).getTime() <= now.getTime() ? "stale" : "current";
}

export function resolveRoomQualityLifecycle(
  status: VerificationStatus,
  verifiedAt: string | null,
  expiresAt: string | null,
  now = new Date(),
) {
  return resolveVerificationState(status, verifiedAt, expiresAt, now) === "current"
    ? "current"
    : "not_current";
}

export function hasAnyRoomQualityScore(scores: RoomQualityScores) {
  return Object.values(scores).some((score) => score !== null);
}
