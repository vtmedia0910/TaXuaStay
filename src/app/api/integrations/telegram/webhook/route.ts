import {
  answerTelegramCallback,
  hashTelegramCallbackQueryId,
  sendTelegramOutboxMessage,
  verifyTelegramWebhookSecret,
} from "@/features/telegram/bot";
import type { TelegramClaimedOutbox } from "@/features/telegram/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number; type?: string; title?: string };
  };
  callback_query?: {
    id?: string;
    data?: string;
    message?: { message_id?: number; chat?: { id?: number; type?: string } };
  };
}

function outcomeRow(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function deliverWebhookReply(
  client: NonNullable<ReturnType<typeof createPublicSupabaseClient>>,
  outboxId: string,
  updateId: number,
  chatId: number,
) {
  const { data: claimData } = await client.rpc("claim_telegram_webhook_reply", {
    target_outbox_id: outboxId,
    target_update_id: updateId,
    target_chat_id: chatId,
  });
  const claim = outcomeRow(claimData) as unknown as TelegramClaimedOutbox;
  if (!claim.outbox_id || !claim.claim_token) return;
  const delivery = await sendTelegramOutboxMessage(claim);
  await client.rpc("complete_telegram_webhook_reply", {
    target_outbox_id: claim.outbox_id,
    target_claim_token: claim.claim_token,
    target_accepted: delivery.accepted,
    target_telegram_message_id: delivery.messageId,
    target_response_code: delivery.responseCode,
    target_error_code: delivery.errorCode,
    target_response_summary: delivery.responseSummary,
  });
}

export async function POST(request: Request) {
  if (!verifyTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if (!request.headers.get("content-type")?.toLocaleLowerCase("en").includes("application/json")) {
    return Response.json({ ok: false }, { status: 415 });
  }
  let update: TelegramUpdate;
  try { update = await request.json() as TelegramUpdate; } catch { return Response.json({ ok: false }, { status: 400 }); }
  const updateId = update.update_id;
  if (!Number.isSafeInteger(updateId) || Number(updateId) < 1) return Response.json({ ok: true });
  const validUpdateId = Number(updateId);
  const client = createPublicSupabaseClient();
  if (!client) return Response.json({ ok: false }, { status: 503 });

  const callback = update.callback_query;
  if (callback?.id && callback.data && callback.message?.chat?.id && callback.message.message_id) {
    const match = /^txa:([a-f0-9]{48})$/.exec(callback.data);
    if (!match) { await answerTelegramCallback(callback.id, "Thao tác không hợp lệ."); return Response.json({ ok: true }); }
    const { data } = await client.rpc("process_telegram_supplier_callback", {
      target_update_id: validUpdateId,
      target_chat_id: callback.message.chat.id,
      target_callback_query_hash: hashTelegramCallbackQueryId(callback.id),
      target_action_token: match[1],
      target_message_id: callback.message.message_id,
    });
    const result = outcomeRow(data);
    await answerTelegramCallback(callback.id, typeof result.message === "string" ? result.message : "Không thể xử lý phản hồi.");
    return Response.json({ ok: true });
  }

  const message = update.message;
  const chatId = message?.chat?.id;
  const chatType = message?.chat?.type;
  const text = message?.text?.trim() ?? "";
  if (!chatId || !Number.isSafeInteger(chatId) || !["group", "supergroup"].includes(chatType ?? "")) return Response.json({ ok: true });
  const connect = /^\/connect(?:@[A-Za-z0-9_]+)?\s+(TXC-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4})$/i.exec(text);
  if (connect) {
    const { data } = await client.rpc("connect_supplier_telegram_group", {
      target_code: connect[1], target_update_id: validUpdateId, target_chat_id: chatId,
      target_chat_type: chatType, target_chat_title: message?.chat?.title ?? null,
    });
    const result = outcomeRow(data);
    if (typeof result.outbox_id === "string") await deliverWebhookReply(client, result.outbox_id, validUpdateId, chatId);
    return Response.json({ ok: true });
  }
  const commandMatch = /^\/(status|help)(?:@[A-Za-z0-9_]+)?$/i.exec(text);
  if (commandMatch) {
    const { data } = await client.rpc("queue_telegram_command_reply", {
      target_update_id: validUpdateId, target_chat_id: chatId, target_command: commandMatch[1].toLocaleLowerCase("en"),
    });
    const result = outcomeRow(data);
    if (typeof result.outbox_id === "string") await deliverWebhookReply(client, result.outbox_id, validUpdateId, chatId);
  }
  return Response.json({ ok: true });
}
