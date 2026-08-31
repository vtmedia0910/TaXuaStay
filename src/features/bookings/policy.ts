import type { BookingConfirmationStatus, BookingLifecycleStatus, ItemConfirmationStatus } from "@/features/bookings/types";

export const BOOKING_LIFECYCLE_LABELS: Record<BookingLifecycleStatus, string> = {
  submitted: "Đã nhận yêu cầu",
  active: "Đang xử lý",
  cancelled: "Đã hủy",
  completed: "Đã hoàn tất",
  expired: "Đã hết hiệu lực",
};

export const BOOKING_CONFIRMATION_LABELS: Record<BookingConfirmationStatus, string> = {
  pending: "Chờ xác nhận dịch vụ",
  partial: "Đã xác nhận một phần",
  confirmed: "Các dịch vụ bắt buộc đã xác nhận",
  failed: "Có dịch vụ không thể xác nhận",
  cancelled: "Đã hủy",
};

export const ITEM_CONFIRMATION_LABELS: Record<ItemConfirmationStatus, string> = {
  pending: "Chưa gửi xác nhận",
  requested: "Đang chờ phản hồi",
  partial: "Xác nhận một phần",
  confirmed: "Đã xác nhận",
  declined: "Không thể xác nhận",
  expired: "Xác nhận hết hiệu lực",
  cancelled: "Đã hủy",
  not_required: "Theo dõi ở từng dịch vụ",
};

export function formatBookingVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}₫`;
}
