# V2 Phase 12 — Supplier Communication Automation + Telegram Integration

## Scope and authority

Phase 12 adds a communication transport around the existing Supplier Confirmation and Phase 11 Operations truth. It does not add another confirmation lifecycle. Booking, Booking Item, `booking_item_confirmations`, Booking aggregate status and append-only events remain authoritative. Telegram acceptance means only that the Telegram API accepted a message; it is not proof that a person read it.

The architecture uses one shared Tà Xùa Trip bot and one private Telegram group per Supplier operations team. Each group contains the relevant Supplier people, assigned Tà Xùa Trip staff and the shared bot. An optional internal Operations group was not implemented in this phase because `/admin/operations` remains the authoritative alert queue.

## Database and RLS

Additive migration `202609010033_v2_supplier_telegram_integration.sql` adds:

- `supplier_communication_channels`: one primary active/error Telegram group mapping per Supplier, with health facts;
- `supplier_operations_assignments`: existing Auth staff/admin assignments to a Supplier;
- `telegram_connection_codes`: hash-only, one-time, 30-minute onboarding capabilities;
- `communication_outbox`: deduplicated bounded-delivery work;
- `telegram_update_receipts`: minimal `update_id` dedupe, without raw updates;
- `telegram_actions`: opaque callback capabilities bound to Supplier, channel, Booking, Booking Item, Confirmation, revision and expiry;
- `communication_delivery_logs`: sanitized append-only attempts.

All seven tables have RLS enabled. Anonymous direct access is denied. Authenticated table access is read-only and requires `app_metadata.role` `admin` or `staff`; secret-bearing columns such as connection hashes, outbox payloads, action token hashes and response snapshots are excluded from authenticated SELECT grants. Mutations use narrow fixed-search-path RPCs. Anonymous execution exists only for capability-scoped onboarding/command/callback RPCs; it never grants direct Booking or integration-table access.

## Admin operations

`/admin/integrations/telegram` is mobile-first and provides Supplier search/filter, connection status, channel health, assigned staff, one-time onboarding, delivery state, sanitized errors, explicit outbox processing, Admin-only disable/reconnect controls and an Admin-only test action guarded by explicit owner authorization. Supplier detail links to the relevant integration card.

Booking detail offers explicit initial dispatch or follow-up only when the Booking Item is active, the Confirmation is pending/requested and an active primary Supplier group exists. The dispatch RPC validates Confirmation `updated_at` and Phase 11 `operations_revision`, transitions/reuses the existing confirmation function in the same transaction, creates short-lived callback actions and enqueues one Supplier-scoped message. The network send occurs only after the database transaction commits.

`NEED_DISCUSSION` leaves Confirmation requested, appends supplier audit/events and appears as `supplier_discussion` in Phase 11 Operations with a follow-up next action. Staff resolve it on Booking detail with a revision-guarded audited action. Data Health derives concrete missing-channel, missing-assignment, channel-error and failed-delivery issues; it creates no fake score.

## Onboarding and webhook

Admin/Staff generates a code that is shown once in the browser and stored only as SHA-256 in the database. The Supplier group runs `/connect <code>`. The webhook accepts only group/supergroup chats, checks `X-Telegram-Bot-Api-Secret-Token`, consumes the code once, binds the group chat automatically and sends an acknowledgement through the outbox. `/status` and `/help` are the only other commands.

The route is `POST /api/integrations/telegram/webhook`. It does not log request bodies, tokens, callback data or Telegram responses. `update_id` is deduplicated. Callback data is an opaque random capability, never a Booking/Supplier ID. `CONFIRM`, `DECLINE` and `NEED_DISCUSSION` validate active channel/chat ownership, Supplier ownership, action expiry, active Booking Item, live Confirmation state, expected Confirmation timestamp and Phase 11 Booking revision. Duplicate and stale callbacks are idempotent and return generic supplier-safe feedback.

## Outbox and failure semantics

Outbound messages are `pending → processing → sent`, `retry` or `failed`; disable can cancel queued work. The authenticated worker claims 1–25 rows with `FOR UPDATE SKIP LOCKED`, a five-minute stale-claim recovery, per-row UUID claim token and a maximum of 1–5 attempts. Dedupe keys and Telegram `update_id` prevent duplicate logical work. Retry is exponential and bounded, respects Telegram `retry_after`, and handles supergroup chat migration. Repeated terminal failures mark channel health `error`. Telegram callback capabilities are removed from terminal outbox payloads.

## Privacy and boundaries

Supplier messages contain only Booking code, the relevant Booking Item snapshot name/parent, service dates, quantity and aggregate party counts. They exclude customer name, phone, email, Zalo, customer notes, unrelated items/Suppliers, Supplier private contacts, staff IDs, internal notes, net cost, margin, contribution and Partner tier. Each chat is mapped to exactly one Supplier.

`TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` are server-only Vercel variables. They are not in the database, browser bundle, logs or documentation values. Normal Supabase runtime still uses only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; there is no legacy anon fallback, service-role client, Supabase Secret key or privileged browser client.

Motorbike remains manual/reference and no Tà Xùa Biker database/API is accessed. No Payment, payment-received state, QR/link, payment webhook, paid/refund/payout/settlement, AI Customer Assistant, Bus, Transfer or Add-on domain is added.

## Owner setup

1. In Telegram, open the verified `@BotFather`, run `/newbot`, choose the display name and username, and keep the returned token private. Do not paste it into chat, Git, docs or a client variable.
2. In Vercel project `taxuaslay1`, add `TELEGRAM_BOT_TOKEN` to Production and Preview as a sensitive server-only variable.
3. Generate a random webhook secret (recommended at least 32 random bytes encoded URL-safe) and add it as server-only `TELEGRAM_WEBHOOK_SECRET` to Production and Preview. It is not the Bot Token.
4. Redeploy. Set the webhook from a trusted local terminal using environment variables, not literal credentials in a committed script. The target URL is `https://<deployed-domain>/api/integrations/telegram/webhook`; call Telegram `setWebhook` with `secret_token` equal to `TELEGRAM_WEBHOOK_SECRET` and `allowed_updates` containing `message` and `callback_query`. Verify with `getWebhookInfo` that the URL is correct and there is no recent error.
5. Keep BotFather privacy mode enabled; commands and inline callbacks still reach the bot. Do not grant unnecessary group-admin permissions—the bot needs to send its own messages only.
6. For each Supplier, create one private group. Add only that Supplier's operational people, assigned Tà Xùa Trip staff and the shared bot.
7. In `/admin/integrations/telegram`, assign primary/backup staff and generate a one-time code.
8. In the correct private group run `/connect <code>` before its displayed expiry. Confirm Admin shows `Đã kết nối` and the expected group title.
9. Do not use the test action until the owner explicitly authorizes a real message to that group. When authorized, open the guarded section, verify the Supplier/group, send exactly one test and confirm `Telegram đã nhận` or inspect the sanitized failure.
10. Reconnect by generating a new code as Admin and running it in the replacement group. Disable the old channel explicitly when it must stop receiving work.

Production currently must remain safely deployable even if Telegram variables are absent: Admin shows unconfigured status, public routes continue working and no message is sent.
