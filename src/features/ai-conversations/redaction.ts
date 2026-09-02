const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE = /(?<!\d)(?:\+?84|0)(?:[\s.-]*\d){8,10}(?!\d)/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b/g;
const PROVIDER_KEY = /\b(?:sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{24,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]{16,})\b/g;
const BOOKING_TOKEN = /\b(?:booking[_\s-]*(?:access[_\s-]*)?token|mã\s+truy\s+cập)\s*[:=]\s*[A-Za-z0-9._~-]{12,}\b/gi;
const OPAQUE_BOOKING_TOKEN = /\b[A-Za-z0-9_-]{43}\b/g;
const BOOKING_CODE = /\bTX-\d{8}-[A-Z0-9]{6}\b/g;
const PASSWORD_OR_OTP = /\b(password|mật\s*khẩu|otp|one[-\s]?time\s+password)\s*[:=]\s*([^\s,;]+)/gi;
const PAYMENT_CARD = /(?<!\d)(?:\d[ -]*?){13,19}(?!\d)/g;
const LONG_SECRET = /\b[A-Za-z0-9_-]{48,}\b/g;

export function redactAIConversationText(value: string) {
  return value
    .replace(EMAIL, "[EMAIL_REDACTED]")
    .replace(PHONE, "[PHONE_REDACTED]")
    .replace(BEARER, "[TOKEN_REDACTED]")
    .replace(JWT, "[TOKEN_REDACTED]")
    .replace(PROVIDER_KEY, "[SECRET_REDACTED]")
    .replace(BOOKING_TOKEN, "booking token: [TOKEN_REDACTED]")
    .replace(OPAQUE_BOOKING_TOKEN, "[TOKEN_REDACTED]")
    .replace(BOOKING_CODE, "[BOOKING_CODE_REDACTED]")
    .replace(PASSWORD_OR_OTP, (_match, label: string) => `${label}: [SECRET_REDACTED]`)
    .replace(PAYMENT_CARD, "[PAYMENT_REDACTED]")
    .replace(LONG_SECRET, "[SECRET_REDACTED]");
}
