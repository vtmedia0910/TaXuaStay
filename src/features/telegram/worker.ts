import "server-only";

import { sendTelegramOutboxMessage, telegramServerConfigStatus } from "@/features/telegram/bot";
import type { TelegramClaimedOutbox, TelegramWorkerSummary } from "@/features/telegram/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function processTelegramOutbox(limit = 10): Promise<TelegramWorkerSummary> {
  const summary: TelegramWorkerSummary = { claimed: 0, sent: 0, retry: 0, failed: 0, skipped: 0 };
  const client = await createServerSupabaseClient();
  if (!client || !telegramServerConfigStatus().botTokenConfigured) return { ...summary, skipped: 1 };
  const { data, error } = await client.rpc("claim_telegram_outbox", { target_limit: limit });
  if (error) throw new Error("Không thể claim Telegram outbox.");
  const claims = (data ?? []) as unknown as TelegramClaimedOutbox[];
  summary.claimed = claims.length;
  for (const claim of claims) {
    const delivery = await sendTelegramOutboxMessage(claim);
    const { data: completion, error: completionError } = await client.rpc("complete_telegram_outbox", {
      target_outbox_id: claim.outbox_id,
      target_claim_token: claim.claim_token,
      target_accepted: delivery.accepted,
      target_telegram_message_id: delivery.messageId,
      target_response_code: delivery.responseCode,
      target_error_code: delivery.errorCode,
      target_response_summary: delivery.responseSummary,
      target_retryable: delivery.retryable,
      target_retry_after_seconds: delivery.retryAfterSeconds,
      target_migrate_to_chat_id: delivery.migrateToChatId,
    });
    if (completionError) { summary.failed += 1; continue; }
    const outcome = completion && typeof completion === "object" && "outcome" in completion ? String(completion.outcome) : "failed";
    if (outcome === "sent") summary.sent += 1;
    else if (outcome === "retry") summary.retry += 1;
    else if (outcome === "stale_claim") summary.skipped += 1;
    else summary.failed += 1;
  }
  return summary;
}
