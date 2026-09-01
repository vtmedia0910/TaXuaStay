# V2 Phase 12H — Telegram Production Setup & Diagnostics Hardening

## Scope

Phase 12H is an application-only operational hardening pass. It adds live, sanitized Telegram bot and webhook diagnostics to `/admin/integrations/telegram`; it does not change migration 033, Supplier mappings, Confirmation, Operations, outbox, callbacks or RLS. Migrations remain `001–033` Local = Remote.

## Vercel-only secret boundary

`TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` remain server-only Vercel environment variables. Admin shows only `Configured` or `Missing`. It never renders, returns, stores, masks, logs or sends either value to the browser. There is no Admin secret form and no Vercel secret-management API integration.

The Telegram API client remains guarded by `server-only`, uses a bounded timeout and converts Telegram failures into allow-listed error categories. It never logs Telegram API URLs, raw response bodies, tokens or webhook secrets.

## Telegram System diagnostics

The Telegram System card runs safe `getMe` and `getWebhookInfo` checks and shows:

- current bot username, display name and numeric bot ID;
- Bot Token/Webhook Secret configured state;
- Telegram API reachability;
- current and expected webhook URL;
- URL and `allowed_updates` match status;
- pending update count, maximum connections and sanitized last webhook error;
- an explainable health state and check time.

`Kiểm tra lại` is Admin-only and read-only. Invalid/revoked tokens, unavailable Telegram, malformed responses and webhook mismatches are reported with safe generic messages; the token and raw Telegram response never enter a Server Action result.

## Production webhook origin and repair

The expected endpoint is derived server-side from Vercel's stable `VERCEL_PROJECT_PRODUCTION_URL`, then fixed to:

`https://<project-production-host>/api/integrations/telegram/webhook`

This does not change `NEXT_PUBLIC_SITE_URL`, the canonical SEO policy or temporary-hostname noindex behavior. Preview can inspect diagnostics against the Production target but cannot install or replace the webhook. `Cài / sửa webhook` is enabled only when `VERCEL_ENV=production` and the stable Production origin is valid.

The Admin-only repair flow validates the current server-only Bot Token and a Webhook Secret matching `^[A-Za-z0-9_-]{1,256}$`, verifies the current bot with `getMe`, then calls `setWebhook` with only:

- the expected Production webhook URL;
- the current server-only `secret_token`;
- `allowed_updates = ["message", "callback_query"]`.

Routine repair never sends `drop_pending_updates=true`. The system immediately calls `getWebhookInfo` again and reports success only when both URL and allowed updates match.

## Bot rotation and Supplier mapping preservation

Bot identity is live, not stored. After Vercel receives another valid Bot Token and Production is redeployed, `getMe` immediately displays the new bot. Existing `Supplier ↔ telegram_chat_id` rows, staff assignments, delivery history and outbox facts are untouched.

Owner rotation workflow:

1. Create or revoke the token in the verified `@BotFather` conversation.
2. Update server-only `TELEGRAM_BOT_TOKEN` in Vercel Production. Rotate `TELEGRAM_WEBHOOK_SECRET` only when desired or required.
3. Redeploy Production and open `/admin/integrations/telegram`.
4. Confirm that the displayed `@bot_username` is the intended new bot.
5. Use `Cài / sửa webhook` if Telegram System does not show Ready.
6. Confirm the expected/current URL and allowed updates match.
7. Add the new bot to every existing active Supplier group, validate it, then remove the old bot.

If an existing private group keeps the same chat ID, no `/connect` is required. A new unconnected group still follows `Generate code → /connect <code>`.

## Onboarding and `/connect` troubleshooting

Unconnected Supplier cards show the live verified bot username. If `getMe` is unhealthy, Admin refuses to present a bot username as trustworthy and asks staff to fix Telegram System first.

Connection-code security remains unchanged: Supplier-bound, SHA-256 hash only at rest, single-use and 30-minute expiry. Rejected `/connect` commands remain intentionally supplier-safe. Because Phase 12 requires all outbound group messages to use the database outbox, an invalid code cannot safely create a message without a known Supplier/channel mapping; Phase 12H therefore does not bypass the outbox with a direct Telegram send or add anonymous database access. If a recognizable command is silent, staff should check the displayed current bot, private group, exact code and expiry, then generate one replacement code rather than repeatedly creating codes.

Connected groups keep `/status` and `/help`. Their responses expose only mapping health and generic command guidance, never Supplier UUIDs or database internals.

## Regression boundaries

Phase 12H does not change Supplier chat mappings, staff assignments, webhook secret verification, callback ownership/revision checks, update dedupe, outbox retry/idempotency, Booking Confirmation, Phase 11 Operations, My Trip, RLS or the Publishable-key-only Supabase architecture. It adds no service-role, Supabase Secret key, Biker dependency, AI, Payment, Bus, Transfer or Add-ons domain.
