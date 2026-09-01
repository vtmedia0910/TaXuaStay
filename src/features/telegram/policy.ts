import type { TelegramChannelStatus, TelegramOutboxStatus } from "@/features/telegram/types";

export const TELEGRAM_CHANNEL_STATUS_LABELS: Record<TelegramChannelStatus, string> = {
  active: "Đã kết nối",
  disabled: "Đã tắt",
  error: "Cần xử lý",
};

export const TELEGRAM_OUTBOX_STATUS_LABELS: Record<TelegramOutboxStatus, string> = {
  pending: "Đang chờ gửi",
  processing: "Đang gửi",
  sent: "Telegram đã nhận",
  retry: "Chờ thử lại",
  failed: "Gửi thất bại",
  cancelled: "Đã hủy",
};

export const TELEGRAM_ASSIGNMENT_LABELS = {
  primary: "Phụ trách chính",
  backup: "Dự phòng",
  observer: "Theo dõi",
} as const;

export function telegramHealthLabel(input: {
  status: TelegramChannelStatus;
  last_success_at: string | null;
  consecutive_failures: number;
}) {
  if (input.status === "disabled") return "Kênh đã được tắt";
  if (input.status === "error") return "Nhiều lần gửi thất bại — cần kết nối lại hoặc kiểm tra bot";
  if (!input.last_success_at) return "Đã kết nối, chưa có lần gửi được Telegram chấp nhận";
  if (input.consecutive_failures > 0) return `Có ${input.consecutive_failures} lần lỗi liên tiếp`;
  return "Kết nối đang hoạt động";
}
