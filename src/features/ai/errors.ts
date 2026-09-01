import type { AIErrorCode } from "@/features/ai/types";

const PUBLIC_MESSAGES: Record<AIErrorCode, string> = {
  AI_NOT_CONFIGURED: "Trợ lý AI đang tạm chưa khả dụng. Bạn vẫn có thể dùng Tìm chuyến đi, xem Lưu trú hoặc mở My Trip.",
  AI_PROVIDER_UNAVAILABLE: "Mình chưa xác nhận được thông tin này từ hệ thống lúc này. Vui lòng thử lại sau.",
  AI_RATE_LIMITED: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi một chút rồi thử lại.",
  AI_TOOL_ERROR: "Mình chưa xác nhận được thông tin này từ hệ thống lúc này.",
  AI_TIMEOUT: "Hệ thống cần thêm thời gian để kiểm tra. Vui lòng thử lại sau.",
  AI_BAD_REQUEST: "Nội dung gửi lên chưa hợp lệ. Vui lòng rút gọn câu hỏi và thử lại.",
  AI_RESPONSE_INVALID: "Mình chưa thể tạo câu trả lời an toàn từ dữ liệu hiện có.",
};

export class AssistantError extends Error {
  constructor(
    readonly code: AIErrorCode,
    readonly status: number,
    message = PUBLIC_MESSAGES[code],
  ) {
    super(message);
    this.name = "AssistantError";
  }
}

export function getAssistantPublicMessage(code: AIErrorCode) {
  return PUBLIC_MESSAGES[code];
}

export function normalizeAssistantError(error: unknown) {
  if (error instanceof AssistantError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new AssistantError("AI_TIMEOUT", 504);
  }
  return new AssistantError("AI_PROVIDER_UNAVAILABLE", 503);
}
