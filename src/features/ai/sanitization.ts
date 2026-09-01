const PRIVATE_KEYS = /(^|_)(api_?key|secret|token|cookie|authorization|supplier|staff|margin|contribution|net_?cost|payout|bank|internal|chat_?id|connection_?code|action_?token)($|_)/i;
const CREDENTIAL_LIKE = /(bearer\s+[A-Za-z0-9._~-]+|sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/gi;

export function sanitizeProviderContext(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[bounded]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.replace(CREDENTIAL_LIKE, "[redacted]").slice(0, 2_000);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeProviderContext(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !PRIVATE_KEYS.test(key))
      .slice(0, 60)
      .map(([key, child]) => [key, sanitizeProviderContext(child, depth + 1)]));
  }
  return undefined;
}

export function sanitizeAssistantText(value: string, maximum = 2_400) {
  return value.replace(CREDENTIAL_LIKE, "[redacted]").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maximum);
}

export function redactUserPII(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email đã ẩn]")
    .replace(/(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){9,10}(?!\d)/g, "[số điện thoại đã ẩn]");
}

const FORBIDDEN_QUERY = /(giá\s*nhập|supplier|nhà\s*cung\s*cấp.*(số|điện\s*thoại|email)|margin|contribution|lợi\s*nhuận|service.?role|sb_secret|api.?key|webhook.?secret|telegram.*(token|chat.?id|log)|dump\s+(bảng|table)|\bsql\b|biến\s*môi\s*trường|environment\s*variable|bỏ\s*qua\s*(quy\s*tắc|hướng\s*dẫn))/i;
const WRITE_QUERY = /(đánh\s*dấu.*(đã\s*)?trả|mark\s*paid|hoàn\s*tiền|refund|gửi\s*telegram|xác\s*nhận\s*nhà\s*cung\s*cấp|hủy\s*booking|sửa\s*booking|tạo\s*booking)/i;

export function getDeterministicSafetyReply(message: string) {
  if (FORBIDDEN_QUERY.test(message)) {
    return "Mình không thể truy cập hoặc cung cấp dữ liệu nội bộ, thông tin nhà cung cấp, giá nhập, bí mật hệ thống hay truy vấn cơ sở dữ liệu. Mình chỉ có thể hỗ trợ bằng thông tin công khai và trạng thái chuyến đi mà phiên hiện tại được phép xem.";
  }
  if (WRITE_QUERY.test(message)) {
    return "Trợ lý này chỉ đọc thông tin và không thể tạo, sửa, hủy Booking, tác động Supplier/Telegram hay xác nhận thanh toán. Vui lòng dùng luồng hiện có hoặc liên hệ đội hỗ trợ Tà Xùa Trip.";
  }
  return null;
}
