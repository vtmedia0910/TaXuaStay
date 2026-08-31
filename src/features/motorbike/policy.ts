import type {
  MotorbikeAvailabilityState,
  MotorbikeHelmetStatus,
  MotorbikePriceSource,
  MotorbikePublicationStatus,
  MotorbikeTransmissionType,
  MotorbikeVehicleCategory,
  PublicMotorbikeOffering,
} from "@/features/motorbike/types";

export const MOTORBIKE_INTEGRATION_MODE = "manual_reference" as const;
export const MOTORBIKE_PROVIDER_KEY = "taxua_biker" as const;
export const MOTORBIKE_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export const MOTORBIKE_CATEGORY_LABELS: Record<MotorbikeVehicleCategory, string> = {
  motorbike: "Xe máy",
  scooter: "Xe tay ga",
  service: "Dịch vụ xe máy",
};

export const MOTORBIKE_TRANSMISSION_LABELS: Record<MotorbikeTransmissionType, string> = {
  manual_clutch: "Xe côn tay",
  semi_automatic: "Xe số",
  automatic: "Xe tay ga",
  other: "Loại truyền động khác",
};

export const MOTORBIKE_HELMET_LABELS: Record<MotorbikeHelmetStatus, string> = {
  unknown: "Mũ bảo hiểm: Chưa xác nhận",
  yes: "Có mũ bảo hiểm",
  no: "Không kèm mũ bảo hiểm",
};

export const MOTORBIKE_AVAILABILITY_LABELS: Record<MotorbikeAvailabilityState, string> = {
  needs_confirmation: "Cần xác nhận",
  unknown: "Chưa có dữ liệu tức thời",
  unavailable: "Tạm chưa nhận yêu cầu",
};

export const MOTORBIKE_PRICE_SOURCE_LABELS: Record<MotorbikePriceSource, string> = {
  supplier_confirmation: "Nhà cung cấp xác nhận",
  provider_public_reference: "Tham chiếu công khai từ nhà vận hành",
  owner_confirmation: "Chủ hệ thống xác nhận",
};

export const MOTORBIKE_PUBLICATION_LABELS: Record<MotorbikePublicationStatus, string> = {
  draft: "Bản nháp",
  published: "Đang công khai",
  paused: "Tạm dừng",
  archived: "Đã lưu trữ",
};

function validDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function vietnamDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

export function formatVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}₫`;
}

export function resolveMotorbikePublicTruth(offering: PublicMotorbikeOffering, now = new Date()) {
  const checkedAt = validDate(offering.source_checked_at);
  const freshnessMs = checkedAt ? Math.max(0, now.getTime() - checkedAt.getTime()) : Number.POSITIVE_INFINITY;
  const sourceIsStale = freshnessMs > MOTORBIKE_STALE_AFTER_MS;
  const checkedLabel = checkedAt
    ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(checkedAt)
    : null;

  const priceCheckedAt = validDate(offering.price_checked_at);
  const priceIsCurrent = offering.public_price_vnd !== null
    && priceCheckedAt !== null
    && priceCheckedAt.getTime() <= now.getTime()
    && offering.price_valid_until !== null
    && offering.price_valid_until >= vietnamDate(now);

  return {
    availabilityLabel: MOTORBIKE_AVAILABILITY_LABELS[offering.availability_state],
    canRequest: offering.availability_state !== "unavailable",
    confirmationLabel: "Xác nhận thủ công với nhà vận hành",
    sourceIsStale,
    freshnessLabel: sourceIsStale
      ? "Thông tin nguồn cần kiểm tra lại"
      : checkedLabel ? `Nguồn được kiểm tra ${checkedLabel}` : "Chưa có mốc kiểm tra nguồn",
    priceLabel: priceIsCurrent && offering.public_price_vnd !== null
      ? formatVnd(offering.public_price_vnd)
      : "Cần xác nhận giá",
    priceIsCurrent,
    priceNote: priceIsCurrent && priceCheckedAt
      ? `Giá tham khảo được kiểm tra ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" }).format(priceCheckedAt)}; chưa xác nhận còn xe.`
      : "Không hiển thị giá cũ như giá đang áp dụng.",
  };
}
