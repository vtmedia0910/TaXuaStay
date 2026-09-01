import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type { TelegramActionType, TelegramClaimedOutbox } from "@/features/telegram/types";

interface TelegramApiEnvelope {
  ok?: boolean;
  result?: { message_id?: number } | boolean;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}
export interface TelegramDeliveryResult {
  accepted: boolean;
  messageId: number | null;
  responseCode: number;
  errorCode: string | null;
  responseSummary: string | null;
  retryable: boolean;
  retryAfterSeconds: number | null;
  migrateToChatId: number | null;
}

type TelegramButton = { text: string; callback_data: string };

function serverSecret(name: "TELEGRAM_BOT_TOKEN" | "TELEGRAM_WEBHOOK_SECRET") {
  const value = process.env[name]?.trim();
  return value || null;
}

export function telegramServerConfigStatus() {
  return {
    botTokenConfigured: Boolean(serverSecret("TELEGRAM_BOT_TOKEN")),
    webhookSecretConfigured: Boolean(serverSecret("TELEGRAM_WEBHOOK_SECRET")),
  };
}

export function verifyTelegramWebhookSecret(candidate: string | null) {
  const expected = serverSecret("TELEGRAM_WEBHOOK_SECRET");
  if (!expected || !candidate) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const candidateHash = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expectedHash, candidateHash);
}

export function hashTelegramCallbackQueryId(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sanitizedFailure(status: number, body: TelegramApiEnvelope): Omit<TelegramDeliveryResult, "accepted" | "messageId" | "responseCode"> {
  const errorCode = body.error_code ?? status;
  if (errorCode === 429) return {
    errorCode: "telegram_rate_limited",
    responseSummary: "Telegram yêu cầu chờ trước khi gửi lại.",
    retryable: true,
    retryAfterSeconds: body.parameters?.retry_after ?? 30,
    migrateToChatId: body.parameters?.migrate_to_chat_id ?? null,
  };
  if (errorCode === 403) return {
    errorCode: "telegram_forbidden",
    responseSummary: "Bot không còn quyền gửi vào nhóm.",
    retryable: false,
    retryAfterSeconds: null,
    migrateToChatId: body.parameters?.migrate_to_chat_id ?? null,
  };
  if (errorCode >= 500) return {
    errorCode: "telegram_server_error",
    responseSummary: "Telegram tạm thời không nhận được yêu cầu.",
    retryable: true,
    retryAfterSeconds: 30,
    migrateToChatId: body.parameters?.migrate_to_chat_id ?? null,
  };
  const description = body.description?.toLocaleLowerCase("en") ?? "";
  return {
    errorCode: description.includes("chat not found") ? "telegram_chat_not_found" : "telegram_request_rejected",
    responseSummary: description.includes("chat not found")
      ? "Telegram không tìm thấy nhóm đã kết nối."
      : "Telegram từ chối yêu cầu gửi.",
    retryable: Boolean(body.parameters?.migrate_to_chat_id),
    retryAfterSeconds: body.parameters?.migrate_to_chat_id ? 15 : null,
    migrateToChatId: body.parameters?.migrate_to_chat_id ?? null,
  };
}

async function callTelegramApi(method: "sendMessage" | "answerCallbackQuery", payload: Record<string, unknown>) {
  const token = serverSecret("TELEGRAM_BOT_TOKEN");
  if (!token) return {
    status: 503,
    body: { ok: false, error_code: 503, description: "not configured" } satisfies TelegramApiEnvelope,
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    let body: TelegramApiEnvelope = {};
    try { body = await response.json() as TelegramApiEnvelope; } catch { body = {}; }
    return { status: response.status, body };
  } catch {
    return {
      status: 503,
      body: { ok: false, error_code: 503, description: "network unavailable" } satisfies TelegramApiEnvelope,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function safeText(value: unknown, fallback: string, maximum = 300) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maximum) : fallback;
}

function buildConfirmationMessage(claim: TelegramClaimedOutbox) {
  const payload = claim.payload;
  const party = payload.party && typeof payload.party === "object" && !Array.isArray(payload.party)
    ? payload.party as Record<string, unknown> : {};
  const followUp = claim.message_type === "confirmation_follow_up";
  const lines = [
    followUp ? "🔔 NHẮC LẠI XÁC NHẬN DỊCH VỤ" : "📌 YÊU CẦU XÁC NHẬN DỊCH VỤ",
    `Mã chuyến đi: ${safeText(payload.booking_code, "Không xác định", 40)}`,
    `Dịch vụ: ${safeText(payload.item_name, "Dịch vụ", 200)}`,
  ];
  if (typeof payload.parent_name === "string" && payload.parent_name.trim()) lines.push(`Thuộc gói: ${safeText(payload.parent_name, "", 200)}`);
  lines.push(
    `Thời gian: ${safeText(payload.service_from, "?")} → ${safeText(payload.service_until, "?")}`,
    `Số lượng: ${typeof payload.quantity === "number" ? payload.quantity : "?"}`,
    `Khách: ${typeof party.adults === "number" ? party.adults : "?"} người lớn · ${typeof party.children === "number" ? party.children : 0} trẻ em`,
    "Vui lòng chọn một phản hồi bên dưới. Thông tin trong Tà Xùa Trip là dữ liệu có thẩm quyền.",
  );
  const tokens = payload.callback_tokens && typeof payload.callback_tokens === "object" && !Array.isArray(payload.callback_tokens)
    ? payload.callback_tokens as Record<string, unknown> : {};
  const actions: Array<[TelegramActionType, string]> = [
    ["CONFIRM", "✅ Xác nhận"],
    ["DECLINE", "❌ Từ chối"],
    ["NEED_DISCUSSION", "💬 Cần trao đổi"],
  ];
  const buttons = actions.flatMap(([action, label]) => {
    const token = tokens[action];
    return typeof token === "string" && /^[a-f0-9]{48}$/.test(token)
      ? [{ text: label, callback_data: `txa:${token}` } satisfies TelegramButton]
      : [];
  });
  return { text: lines.join("\n"), buttons };
}

export function buildTelegramOutboxMessage(claim: TelegramClaimedOutbox) {
  if (claim.message_type === "confirmation_request" || claim.message_type === "confirmation_follow_up") {
    return buildConfirmationMessage(claim);
  }
  if (claim.message_type === "connection_ack") return {
    text: `✅ Nhóm đã kết nối với ${safeText(claim.payload.supplier_name, "nhà cung cấp", 160)} trên Tà Xùa Trip.\nDữ liệu vận hành trong hệ thống vẫn là nguồn có thẩm quyền.`,
    buttons: [] as TelegramButton[],
  };
  if (claim.message_type === "test") return {
    text: `✅ Tin kiểm tra Tà Xùa Trip cho ${safeText(claim.payload.supplier_name, "nhà cung cấp", 160)}.\nTelegram đã nhận tin không đồng nghĩa mọi thành viên đã đọc.`,
    buttons: [] as TelegramButton[],
  };
  const command = claim.payload.command;
  return {
    text: command === "help"
      ? "Tà Xùa Trip Bot\n/connect <mã>: kết nối nhóm bằng mã một lần\n/status: kiểm tra mapping hiện tại\n/help: xem hướng dẫn\nCác nút xác nhận chỉ áp dụng cho đúng dịch vụ và có thời hạn."
      : `✅ Nhóm đang kết nối với ${safeText(claim.payload.supplier_name, "nhà cung cấp", 160)}.\nTrạng thái kênh: hoạt động.`,
    buttons: [] as TelegramButton[],
  };
}

export async function sendTelegramOutboxMessage(claim: TelegramClaimedOutbox): Promise<TelegramDeliveryResult> {
  const message = buildTelegramOutboxMessage(claim);
  if ((claim.message_type === "confirmation_request" || claim.message_type === "confirmation_follow_up") && message.buttons.length !== 3) {
    return {
      accepted: false, messageId: null, responseCode: 422,
      errorCode: "invalid_callback_payload", responseSummary: "Outbox thiếu callback capability hợp lệ.",
      retryable: false, retryAfterSeconds: null, migrateToChatId: null,
    };
  }
  const { status, body } = await callTelegramApi("sendMessage", {
    chat_id: claim.chat_id,
    text: message.text.slice(0, 4096),
    disable_web_page_preview: true,
    ...(message.buttons.length ? { reply_markup: { inline_keyboard: message.buttons.map((button) => [button]) } } : {}),
  });
  const messageId = body.ok && typeof body.result === "object" && typeof body.result.message_id === "number"
    ? body.result.message_id : null;
  if (body.ok && messageId) return {
    accepted: true, messageId, responseCode: status, errorCode: null,
    responseSummary: null, retryable: false, retryAfterSeconds: null, migrateToChatId: null,
  };
  return { accepted: false, messageId: null, responseCode: status, ...sanitizedFailure(status, body) };
}

export async function answerTelegramCallback(callbackQueryId: string, text: string) {
  await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text.slice(0, 180),
    show_alert: false,
    cache_time: 0,
  });
}
