import type {
  PackageAvailabilityState,
  PackageComponentType,
  PackageConfirmationMode,
  PackageCostSource,
  PackageLifecycleStatus,
  PackagePriceSource,
} from "@/features/packages/types";

export const PACKAGE_POLICY_VERSION = "phase6-package-v1" as const;
export const PACKAGE_PRICE_FRESH_MS = 30 * 24 * 60 * 60 * 1000;
export const PACKAGE_COST_FRESH_MS = 30 * 24 * 60 * 60 * 1000;

export const PACKAGE_LIFECYCLE_LABELS: Record<PackageLifecycleStatus, string> = {
  draft: "Bản nháp",
  published: "Đang công khai",
  paused: "Tạm dừng",
  archived: "Đã lưu trữ",
};

export const PACKAGE_COMPONENT_LABELS: Record<PackageComponentType, string> = {
  ROOM: "Lưu trú",
  MOTORBIKE: "Xe máy",
  BUS: "Xe khách",
  TRANSFER: "Đưa đón",
  ACTIVITY: "Trải nghiệm",
  MEAL: "Bữa ăn",
  GUIDE: "Hướng dẫn viên",
  SERVICE: "Dịch vụ",
  CUSTOM: "Nội dung riêng",
};

export const PACKAGE_CONFIRMATION_LABELS: Record<PackageConfirmationMode, string> = {
  instant: "Xác nhận tức thời",
  manual: "Cần đội ngũ xác nhận",
  external_request: "Gửi yêu cầu qua kênh đối tác",
  unknown: "Chưa xác định cách xác nhận",
};

export const PACKAGE_AVAILABILITY_LABELS: Record<PackageAvailabilityState, string> = {
  recorded_available: "Có dữ liệu phù hợp, vẫn cần xác nhận",
  needs_confirmation: "Cần xác nhận từng dịch vụ",
  unavailable: "Có thành phần tạm không phục vụ",
  unknown: "Chưa đủ dữ liệu tình trạng",
};

export const PACKAGE_PRICE_SOURCE_LABELS: Record<PackagePriceSource, string> = {
  supplier_confirmation: "Nhà cung cấp xác nhận",
  owner_confirmation: "Chủ hệ thống xác nhận",
  contract: "Điều khoản đã ghi nhận",
  admin: "Đội ngũ Tà Xùa Trip xác nhận",
};

export const PACKAGE_COST_SOURCE_LABELS: Record<PackageCostSource, string> = {
  supplier_confirmation: "Nhà cung cấp xác nhận",
  owner_confirmation: "Chủ hệ thống xác nhận",
  contract: "Điều khoản đã ghi nhận",
  admin: "Đội ngũ Tà Xùa Trip ghi nhận",
};

export function formatPackageVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}₫`;
}

export function vietnamDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
