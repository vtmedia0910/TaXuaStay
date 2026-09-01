import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type {
  TelegramActionType,
  TelegramBotIdentity,
  TelegramClaimedOutbox,
  TelegramSafeErrorCode,
  TelegramSystemDiagnostics,
  TelegramSystemHealth,
  TelegramWebhookDiagnostics,
} from "@/features/telegram/types";

interface TelegramApiEnvelope {
  ok?: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number; migrate_to_chat_id?: number };
}

type TelegramFetch = typeof fetch;
type TelegramEnvironment = Record<string, string | undefined>;
type TelegramMethod = "getMe" | "getWebhookInfo" | "setWebhook" | "sendMessage" | "answerCallbackQuery";

const TELEGRAM_ALLOWED_UPDATES = ["message", "callback_query"] as const;
const TELEGRAM_WEBHOOK_PATH = "/api/integrations/telegram/webhook";
const WEBHOOK_SECRET_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

interface TelegramApiCallResult {
  status: number;
  body: TelegramApiEnvelope;
  networkError: boolean;
}

interface TelegramInstallResult {
  ok: boolean;
  errorCode: TelegramSafeErrorCode | null;
  errorMessage: string | null;
  diagnostics: TelegramSystemDiagnostics;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizedTelegramText(value: unknown, maximum = 240) {
  if (typeof value !== "string") return null;
  const compact = value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\b\d{5,}:[A-Za-z0-9_-]{20,}\b/g, "[redacted]")
    .replace(/https:\/\/api\.telegram\.org\/bot[^/\s]+/gi, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
  return compact ? compact.slice(0, maximum) : null;
}

function safeWebhookUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hostname.toLowerCase() === "api.telegram.org") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function safeFailure(
  result: TelegramApiCallResult,
  fallback: TelegramSafeErrorCode = "telegram_rejected",
): { errorCode: TelegramSafeErrorCode; errorMessage: string } {
  if (result.networkError) return { errorCode: "telegram_unreachable", errorMessage: "Không thể kết nối Telegram lúc này." };
  if (result.status === 401 || result.body.error_code === 401) {
    return { errorCode: "bot_token_invalid", errorMessage: "Bot Token không hợp lệ hoặc đã bị thu hồi." };
  }
  if (result.status >= 500 || (result.body.error_code ?? 0) >= 500) {
    return { errorCode: "telegram_unreachable", errorMessage: "Telegram tạm thời không phản hồi." };
  }
  return {
    errorCode: fallback,
    errorMessage: fallback === "malformed_response"
      ? "Telegram trả về dữ liệu không đúng định dạng mong đợi."
      : "Telegram từ chối yêu cầu. Hãy kiểm tra cấu hình bot.",
  };
}

export function getTelegramDeploymentPolicy(environment: TelegramEnvironment = process.env) {
  const rawEnvironment = environment.VERCEL_ENV?.trim().toLocaleLowerCase("en");
  const deploymentEnvironment = rawEnvironment === "production" || rawEnvironment === "preview" || rawEnvironment === "development"
    ? rawEnvironment
    : "unknown";
  const productionHost = environment.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  let expectedWebhookUrl: string | null = null;
  if (productionHost) {
    try {
      const origin = new URL(/^https:\/\//i.test(productionHost) ? productionHost : `https://${productionHost}`);
      if (origin.protocol === "https:" && !origin.username && !origin.password) {
        expectedWebhookUrl = new URL(TELEGRAM_WEBHOOK_PATH, `${origin.origin}/`).toString();
      }
    } catch {
      expectedWebhookUrl = null;
    }
  }
  return {
    deploymentEnvironment,
    productionInstallEnabled: deploymentEnvironment === "production" && Boolean(expectedWebhookUrl),
    expectedWebhookUrl,
  } as const;
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

async function callTelegramApi(
  method: TelegramMethod,
  payload: Record<string, unknown> = {},
  fetchImpl: TelegramFetch = fetch,
): Promise<TelegramApiCallResult> {
  const token = serverSecret("TELEGRAM_BOT_TOKEN");
  if (!token) return {
    status: 503,
    body: { ok: false, error_code: 503, description: "not configured" } satisfies TelegramApiEnvelope,
    networkError: false,
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });
    let body: TelegramApiEnvelope = {};
    try { body = await response.json() as TelegramApiEnvelope; } catch { body = {}; }
    return { status: response.status, body, networkError: false };
  } catch {
    return {
      status: 503,
      body: { ok: false, error_code: 503, description: "network unavailable" } satisfies TelegramApiEnvelope,
      networkError: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getTelegramBotIdentity(fetchImpl: TelegramFetch = fetch): Promise<TelegramBotIdentity> {
  if (!serverSecret("TELEGRAM_BOT_TOKEN")) return {
    configured: false,
    reachable: false,
    botId: null,
    username: null,
    displayName: null,
    errorCode: "bot_token_missing",
    errorMessage: "Bot Token chưa được cấu hình trong Vercel.",
  };
  const response = await callTelegramApi("getMe", {}, fetchImpl);
  if (!response.body.ok) {
    const failure = safeFailure(response);
    return { configured: true, reachable: false, botId: null, username: null, displayName: null, ...failure };
  }
  const result = response.body.result;
  if (!isRecord(result) || result.is_bot !== true || typeof result.id !== "number" || !Number.isSafeInteger(result.id)
    || typeof result.first_name !== "string") {
    const failure = safeFailure(response, "malformed_response");
    return { configured: true, reachable: false, botId: null, username: null, displayName: null, ...failure };
  }
  return {
    configured: true,
    reachable: true,
    botId: result.id,
    username: typeof result.username === "string" ? sanitizedTelegramText(result.username, 64) : null,
    displayName: sanitizedTelegramText(result.first_name, 128),
    errorCode: null,
    errorMessage: null,
  };
}

export async function getTelegramWebhookDiagnostics(
  expectedUrl: string | null,
  fetchImpl: TelegramFetch = fetch,
): Promise<TelegramWebhookDiagnostics> {
  const empty = {
    reachable: false,
    installed: false,
    currentUrl: null,
    expectedUrl,
    matchesExpectedUrl: false,
    allowedUpdates: [],
    allowedUpdatesMatch: false,
    pendingUpdateCount: 0,
    lastErrorDate: null,
    lastErrorMessage: null,
    maxConnections: null,
  } satisfies Omit<TelegramWebhookDiagnostics, "errorCode" | "errorMessage">;
  if (!serverSecret("TELEGRAM_BOT_TOKEN")) return {
    ...empty,
    errorCode: "bot_token_missing",
    errorMessage: "Không thể kiểm tra webhook khi Bot Token còn thiếu.",
  };
  const response = await callTelegramApi("getWebhookInfo", {}, fetchImpl);
  if (!response.body.ok) return { ...empty, ...safeFailure(response) };
  const result = response.body.result;
  if (!isRecord(result)) return { ...empty, ...safeFailure(response, "malformed_response") };
  const currentUrl = safeWebhookUrl(result.url);
  const allowedUpdates = Array.isArray(result.allowed_updates)
    ? result.allowed_updates.flatMap((value) => typeof value === "string" ? [value.slice(0, 64)] : []).slice(0, 32)
    : [];
  const allowedSet = new Set(allowedUpdates);
  const allowedUpdatesMatch = allowedSet.size === TELEGRAM_ALLOWED_UPDATES.length
    && TELEGRAM_ALLOWED_UPDATES.every((value) => allowedSet.has(value));
  const pendingUpdateCount = typeof result.pending_update_count === "number" && Number.isSafeInteger(result.pending_update_count)
    ? Math.max(0, result.pending_update_count)
    : 0;
  const lastErrorTimestamp = typeof result.last_error_date === "number" && Number.isSafeInteger(result.last_error_date)
    ? result.last_error_date * 1000
    : null;
  return {
    reachable: true,
    installed: Boolean(currentUrl),
    currentUrl,
    expectedUrl,
    matchesExpectedUrl: Boolean(currentUrl && expectedUrl && currentUrl === expectedUrl),
    allowedUpdates,
    allowedUpdatesMatch,
    pendingUpdateCount,
    lastErrorDate: lastErrorTimestamp ? new Date(lastErrorTimestamp).toISOString() : null,
    lastErrorMessage: sanitizedTelegramText(result.last_error_message),
    maxConnections: typeof result.max_connections === "number" && Number.isSafeInteger(result.max_connections)
      ? result.max_connections : null,
    errorCode: null,
    errorMessage: null,
  };
}

function resolveSystemHealth(
  configured: ReturnType<typeof telegramServerConfigStatus>,
  bot: TelegramBotIdentity,
  webhook: TelegramWebhookDiagnostics,
  now: number,
): TelegramSystemHealth {
  if (!configured.botTokenConfigured || !configured.webhookSecretConfigured) return "missing_config";
  if (bot.errorCode === "bot_token_invalid") return "bot_invalid";
  if (!bot.reachable || !webhook.reachable) return "telegram_error";
  if (!webhook.installed) return "webhook_missing";
  if (!webhook.matchesExpectedUrl) return "webhook_mismatch";
  if (!webhook.allowedUpdatesMatch) return "allowed_updates_mismatch";
  const lastErrorTime = webhook.lastErrorDate ? Date.parse(webhook.lastErrorDate) : Number.NaN;
  if (Number.isFinite(lastErrorTime) && now - lastErrorTime < 24 * 60 * 60 * 1000) return "telegram_error";
  if (webhook.pendingUpdateCount > 0) return "pending_updates_attention";
  return "ready";
}

export async function getTelegramSystemDiagnostics(options: {
  fetchImpl?: TelegramFetch;
  environment?: TelegramEnvironment;
  now?: number;
} = {}): Promise<TelegramSystemDiagnostics> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const policy = getTelegramDeploymentPolicy(options.environment ?? process.env);
  const configured = telegramServerConfigStatus();
  const [bot, webhook] = await Promise.all([
    getTelegramBotIdentity(fetchImpl),
    getTelegramWebhookDiagnostics(policy.expectedWebhookUrl, fetchImpl),
  ]);
  const now = options.now ?? Date.now();
  return {
    ...configured,
    ...policy,
    bot,
    webhook,
    health: resolveSystemHealth(configured, bot, webhook, now),
    checkedAt: new Date(now).toISOString(),
  };
}

export async function installTelegramWebhook(options: {
  fetchImpl?: TelegramFetch;
  environment?: TelegramEnvironment;
} = {}): Promise<TelegramInstallResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const environment = options.environment ?? process.env;
  const policy = getTelegramDeploymentPolicy(environment);
  const initial = await getTelegramSystemDiagnostics({ fetchImpl, environment });
  const failure = async (errorCode: TelegramSafeErrorCode, errorMessage: string): Promise<TelegramInstallResult> => ({
    ok: false,
    errorCode,
    errorMessage,
    diagnostics: initial,
  });
  if (policy.deploymentEnvironment !== "production") {
    return failure("preview_install_disabled", "Webhook installation disabled in Preview.");
  }
  if (!policy.expectedWebhookUrl) return failure("production_origin_missing", "Không xác định được Production webhook URL an toàn.");
  if (!serverSecret("TELEGRAM_BOT_TOKEN")) return failure("bot_token_missing", "Bot Token chưa được cấu hình trong Vercel.");
  const webhookSecret = serverSecret("TELEGRAM_WEBHOOK_SECRET");
  if (!webhookSecret) return failure("webhook_secret_missing", "Webhook Secret chưa được cấu hình trong Vercel.");
  if (!WEBHOOK_SECRET_PATTERN.test(webhookSecret)) {
    return failure("webhook_secret_invalid", "Webhook Secret có ký tự Telegram không hỗ trợ. Hãy tạo secret mới trong Vercel rồi redeploy.");
  }
  if (!initial.bot.reachable) return failure(initial.bot.errorCode ?? "unknown", initial.bot.errorMessage ?? "Không xác minh được bot hiện tại.");
  const response = await callTelegramApi("setWebhook", {
    url: policy.expectedWebhookUrl,
    secret_token: webhookSecret,
    allowed_updates: [...TELEGRAM_ALLOWED_UPDATES],
  }, fetchImpl);
  if (!response.body.ok || response.body.result !== true) {
    const safe = safeFailure(response, response.body.ok ? "malformed_response" : "telegram_rejected");
    return failure(safe.errorCode, safe.errorMessage);
  }
  const diagnostics = await getTelegramSystemDiagnostics({ fetchImpl, environment });
  if (!diagnostics.webhook.matchesExpectedUrl || !diagnostics.webhook.allowedUpdatesMatch) return {
    ok: false,
    errorCode: "post_install_verification_failed",
    errorMessage: "Telegram đã nhận yêu cầu nhưng trạng thái webhook sau cài đặt chưa khớp.",
    diagnostics,
  };
  return { ok: true, errorCode: null, errorMessage: null, diagnostics };
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
  const messageId = body.ok && isRecord(body.result) && typeof body.result.message_id === "number"
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
