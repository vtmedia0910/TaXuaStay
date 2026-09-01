import type { PublicBookingStatusDto, PublicBookingStatusItem } from "@/features/bookings/types";
import { BOOKING_CONFIRMATION_LABELS, BOOKING_LIFECYCLE_LABELS, ITEM_CONFIRMATION_LABELS, formatBookingVnd } from "@/features/bookings/policy";
import type { PublicSiteSettings } from "@/features/settings/types";
import type {
  CustomerTripAction,
  CustomerTripDashboardDto,
  CustomerTripStatusKey,
  CustomerTripTone,
} from "@/features/my-trip/types";
import { ROAD_GRADE_LABELS } from "@/features/verification/policy";

const STATUS_CONTENT: Record<CustomerTripStatusKey, { label: string; description: string; tone: CustomerTripTone }> = {
  submitted: { label: "Đã nhận yêu cầu", description: "Đội ngũ đang kiểm tra các dịch vụ trong chuyến đi.", tone: "info" },
  pending_confirmation: { label: "Đang chờ xác nhận dịch vụ", description: "Một hoặc nhiều dịch vụ vẫn đang chờ phản hồi.", tone: "progress" },
  partially_confirmed: { label: "Đã xác nhận một phần", description: "Một số dịch vụ đã xác nhận; phần còn lại vẫn đang được xử lý.", tone: "progress" },
  confirmed: { label: "Các dịch vụ chính đã xác nhận", description: "Dịch vụ bắt buộc đã xác nhận; điều kiện tiếp theo vẫn được kiểm tra riêng.", tone: "success" },
  confirmation_failed: { label: "Có dịch vụ không thể xác nhận", description: "Đội ngũ cần hỗ trợ bạn kiểm tra phương án tiếp theo.", tone: "danger" },
  ready_checkout: { label: "Sẵn sàng cho bước thanh toán", description: "Điều kiện đã đủ, nhưng thanh toán trực tuyến hiện chưa được kết nối.", tone: "success" },
  needs_requote: { label: "Cần cập nhật báo giá", description: "Giá hiện tại thiếu, cũ hoặc có xung đột và cần được kiểm tra lại.", tone: "warning" },
  quote_expired: { label: "Báo giá đã hết hiệu lực", description: "Cần kiểm tra báo giá mới trước khi tiếp tục.", tone: "warning" },
  booking_cancelled: { label: "Chuyến đi đã hủy", description: "Yêu cầu này không còn được xử lý như một chuyến đi đang hoạt động.", tone: "neutral" },
  booking_expired: { label: "Yêu cầu đã hết hiệu lực", description: "Liên hệ hỗ trợ nếu bạn muốn kiểm tra một phương án mới.", tone: "neutral" },
  booking_completed: { label: "Chuyến đi đã hoàn tất", description: "Thông tin bên dưới được giữ lại như lịch sử của chuyến đi.", tone: "success" },
};

const TYPE_LABELS: Record<PublicBookingStatusItem["component_type"], string> = {
  ROOM: "Phòng lưu trú",
  MOTORBIKE: "Xe máy",
  PACKAGE: "Gói chuyến đi",
  CUSTOM: "Dịch vụ trong chuyến",
};

const AVAILABILITY_LABELS: Record<PublicBookingStatusItem["availability_status"], string> = {
  recorded_available: "Đã ghi nhận tình trạng tại lúc gửi yêu cầu",
  needs_confirmation: "Cần xác nhận tình trạng",
  unknown: "Chưa có dữ liệu tình trạng",
  unavailable: "Nguồn ghi nhận không thể phục vụ",
};

function dateFromYmd(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatCustomerTripDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(dateFromYmd(value));
}

export function countTripNights(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((dateFromYmd(checkOut).getTime() - dateFromYmd(checkIn).getTime()) / 86_400_000));
}

export function deriveCustomerTripStatus(booking: Pick<PublicBookingStatusDto, "lifecycle_status" | "confirmation_status" | "checkout">): CustomerTripStatusKey {
  if (booking.lifecycle_status === "cancelled") return "booking_cancelled";
  if (booking.lifecycle_status === "expired") return "booking_expired";
  if (booking.lifecycle_status === "completed") return "booking_completed";
  if (booking.confirmation_status === "failed" || booking.confirmation_status === "cancelled") return "confirmation_failed";
  if (booking.checkout.readiness_state === "expired") return "quote_expired";
  if (booking.checkout.readiness_state === "needs_requote") return "needs_requote";
  if (booking.checkout.readiness_state === "ready") return "ready_checkout";
  if (booking.confirmation_status === "partial") return "partially_confirmed";
  if (booking.confirmation_status === "confirmed") return "confirmed";
  if (booking.lifecycle_status === "submitted") return "submitted";
  return "pending_confirmation";
}

function buildSupportActions(settings: PublicSiteSettings): CustomerTripAction[] {
  const actions: CustomerTripAction[] = [];
  if (settings.zalo_url?.startsWith("https://")) actions.push({ label: "Nhắn Zalo", href: settings.zalo_url, external: true });
  const phone = settings.hotline?.replace(/[^+\d]/g, "");
  if (phone && phone.replace(/\D/g, "").length >= 6) actions.push({ label: "Gọi hỗ trợ", href: `tel:${phone}`, external: true });
  if (settings.facebook_url?.startsWith("https://")) actions.push({ label: "Nhắn Facebook", href: settings.facebook_url, external: true });
  return actions;
}

function primaryAction(status: CustomerTripStatusKey, supportActions: CustomerTripAction[]): CustomerTripAction {
  if (["booking_cancelled", "booking_expired", "confirmation_failed"].includes(status) && supportActions[0]) return { ...supportActions[0], label: "LIÊN HỆ HỖ TRỢ" };
  if (["needs_requote", "quote_expired"].includes(status)) return { label: "KIỂM TRA BÁO GIÁ", href: "#trip-quote", external: false };
  if (status === "ready_checkout") return { label: "XEM BƯỚC TIẾP THEO", href: "#trip-payment-readiness", external: false };
  if (status === "booking_completed") return { label: "XEM LỊCH SỬ CHUYẾN ĐI", href: "#trip-timeline", external: false };
  return { label: "XEM TỪNG DỊCH VỤ", href: "#trip-components", external: false };
}

function confirmationTone(status: PublicBookingStatusItem["confirmation_status"]): CustomerTripTone {
  if (status === "confirmed") return "success";
  if (["declined", "expired", "cancelled"].includes(status)) return "danger";
  if (status === "not_required") return "neutral";
  return "progress";
}

function itemCaveat(item: PublicBookingStatusItem) {
  if (item.component_type === "MOTORBIKE") return "Xe máy được xác nhận thủ công; tình trạng không được cập nhật theo thời gian thực.";
  if (item.component_type === "PACKAGE") return "Giá gói là tổng giá có thẩm quyền; các dịch vụ con không được cộng thêm lần nữa.";
  if (item.component_type === "ROOM") return item.availability_status === "recorded_available"
    ? "Tình trạng được lưu tại thời điểm gửi yêu cầu và vẫn cần nhà cung cấp xác nhận."
    : "Tình trạng phòng chưa phải giữ chỗ hoặc xác nhận cuối cùng.";
  return "Dịch vụ này được đội ngũ kiểm tra và xác nhận thủ công.";
}

function verificationLabels(item: PublicBookingStatusItem) {
  if (item.component_type !== "ROOM") return [];
  const labels: string[] = [];
  if (item.verification.room_verified === true) labels.push("Phòng đã được xác minh");
  if (item.verification.cloud_view_verified === true) labels.push("Cloud View đã thẩm định");
  if (item.verification.road_verified === true) labels.push(`Đường vào đã thẩm định${item.verification.road_grade ? ` · ${ROAD_GRADE_LABELS[item.verification.road_grade]}` : ""}`);
  if (labels.length) return labels;

  const states = [item.verification.room_verified, item.verification.cloud_view_verified, item.verification.road_verified];
  return states.every((state) => state === false)
    ? ["Chưa có xác minh còn hiệu lực tại lúc gửi yêu cầu"]
    : ["Thông tin xác minh chưa được ghi nhận đầy đủ"];
}

function timelineCategory(eventType: string) {
  if (eventType === "booking_submitted") return "request" as const;
  if (eventType.includes("confirmation")) return "confirmation" as const;
  if (eventType.includes("quote") || eventType.includes("deposit")) return "quote" as const;
  if (eventType.includes("checkout")) return "readiness" as const;
  if (eventType.includes("completed") || eventType.includes("cancelled") || eventType.includes("expired")) return "completion" as const;
  return "update" as const;
}

export function buildCustomerTripDashboard(booking: PublicBookingStatusDto, settings: PublicSiteSettings): CustomerTripDashboardDto {
  const statusKey = deriveCustomerTripStatus(booking);
  const nights = countTripNights(booking.check_in, booking.check_out);
  const supportActions = buildSupportActions(settings);
  return {
    bookingCode: booking.booking_code,
    dateRangeLabel: `${formatCustomerTripDate(booking.check_in)} – ${formatCustomerTripDate(booking.check_out)}`,
    durationLabel: nights > 0 ? `${nights} đêm` : "Chưa xác định thời lượng",
    guestSummary: `${booking.adults} người lớn${booking.children ? ` · ${booking.children} trẻ em` : ""} · ${booking.rooms} phòng`,
    status: { key: statusKey, ...STATUS_CONTENT[statusKey] },
    lifecycleLabel: BOOKING_LIFECYCLE_LABELS[booking.lifecycle_status],
    confirmationLabel: BOOKING_CONFIRMATION_LABELS[booking.confirmation_status],
    primaryAction: primaryAction(statusKey, supportActions),
    items: booking.items.map((item) => ({
      key: item.item_key,
      type: item.component_type,
      typeLabel: TYPE_LABELS[item.component_type],
      title: item.display_name,
      parentName: item.parent_name,
      description: item.description,
      quantity: item.quantity,
      servicePeriodLabel: `${formatCustomerTripDate(booking.check_in)} – ${formatCustomerTripDate(booking.check_out)}`,
      priceLabel: item.price_status === "included_in_package" || item.counts_toward_booking_total === false
        ? "Đã bao gồm trong giá gói"
        : item.sell_price_vnd === null ? "Cần xác nhận giá" : formatBookingVnd(item.sell_price_vnd),
      confirmationLabel: ITEM_CONFIRMATION_LABELS[item.confirmation_status],
      confirmationTone: confirmationTone(item.confirmation_status),
      availabilityLabel: AVAILABILITY_LABELS[item.availability_status],
      verificationLabels: verificationLabels(item),
      caveat: itemCaveat(item),
      includedInPackage: item.price_status === "included_in_package" || item.counts_toward_booking_total === false,
    })),
    checkout: booking.checkout,
    timeline: booking.events
      .filter((event) => typeof event.message === "string" && event.message.trim().length > 0)
      .slice(-50)
      .reverse()
      .map((event, index) => ({ key: `${event.created_at}-${index}`, category: timelineCategory(event.event_type), message: event.message, createdAt: event.created_at })),
    supportActions,
  };
}
