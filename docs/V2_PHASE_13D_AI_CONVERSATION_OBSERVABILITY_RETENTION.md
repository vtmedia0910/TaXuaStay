# V2 Phase 13D — AI Conversation Observability & Retention

Status: application implementation complete; owner infrastructure activation pending. No Supabase migration. Migrations remain 001–034 Local = Remote.

## Scope and boundaries

Phase 13D adds a privacy-minimized, Admin-only observability layer above the existing Phase 13–13C Assistant. It does not change Gemini/OpenAI/DeepSeek adapters, the provider/model registry, Behavior Studio, Prompt Lab, the nine read-only tools, AI write authority, quotas, budgets, kill switch or `true` / `false` / `unknown` semantics.

The transcript store uses a dedicated Upstash Redis database through two server-only variables:

```text
AI_CONVERSATION_REDIS_REST_URL
AI_CONVERSATION_REDIS_REST_TOKEN
```

The application refuses a transcript configuration that reuses either configured quota/budget Redis credential. Secrets are never returned to Admin or browser code. Supabase remains publishable-key-only; Phase 13D adds no table, RLS policy, service-role dependency, Supabase Secret or migration 035.

## Capture and privacy design

`POST /api/assistant` schedules transcript capture with Next.js `after()` only after it has formed the customer response. Store absence, disabled logging, redaction failure and write failure all resolve safely without changing the response. The default config is logging OFF and retention 30 days.

The browser supplies only an allow-listed entry point and an existing random session ID. The server HMAC-hashes that session ID with `AI_IDENTITY_HASH_SALT`; Redis maps the hash to a random opaque conversation UUID. The raw session ID is not persisted, and no cross-session customer profile is created.

Every persisted turn contains only:

- redacted customer-visible message and final assistant-visible answer;
- timestamps and opaque conversation/message IDs;
- entry point, provider/model and runtime/profile revisions;
- token/cost values when authoritative, otherwise `null`;
- latency, normalized result/error code and deduplicated tool names.

It never stores the client-supplied history, raw IP, cookie, Booking access token, system prompt, chain-of-thought, tool arguments/results, provider/DB raw payload, Supplier private data, internal economics, payment data or secrets. Both user and assistant-visible text pass through deterministic email, phone, token/key, password/OTP and payment-number redaction before persistence. Oversized durable content is truncated at 8,000/12,000 characters and marked explicitly; each conversation retains at most 100 messages.

## Redis layout and retention

The dedicated namespace uses separate metadata/message/session keys plus sorted-set indexes by creation/update/status and small daily aggregate hashes. All conversation-specific keys and the opaque session mapping receive a TTL relative to the latest stored activity. Retention presets are 7, 14, 30, 60 or 90 days.

Changing retention affects new writes immediately. Applying it to existing data deletes over-age records in bounded batches and refreshes remaining TTLs. List/detail/summary reads lazily remove expired index references. Manual deletion supports one, selected records (maximum 100), cutoff-based cleanup and delete-all in bounded batches. No path uses `KEYS *`; partial deletion returns structured counts.

## Admin UX

The existing AI Admin area has a local navigation row:

- `/admin/integrations/ai` — Control Center;
- `/admin/integrations/ai/conversations` — cursor-paginated summary/list/filter view;
- `/admin/integrations/ai/conversations/[conversationId]` — chronological redacted detail;
- `/admin/integrations/ai/retention` — logging, TTL and deletion controls.

Every read and Server Action calls `requireAdminUser(["admin"])`; `staff`, anonymous users and Suppliers have no transcript access. Detail content renders as escaped React text. Delete-one/batch/cutoff actions require confirmation; delete-all additionally requires the exact typed phrase `DELETE ALL`. The UI displays credential presence/status only, never a Redis value.

Locked policy indicators are visible but not editable: PII redaction always on, chain-of-thought never stored and raw tool payload never stored. If the dedicated Redis is missing or unavailable, Admin sees an observability-specific state that does not claim customer AI is down.

## Customer transparency

The shared full-page and embedded composer states that conversations may be retained temporarily for support quality and asks customers not to send passwords or payment information. This notice does not claim that review never occurs.

## Owner activation sequence

1. Create a new Upstash Redis database dedicated only to conversation transcripts. Do not reuse the Phase 13A quota/budget database.
2. Add its REST URL and REST token directly in Vercel Production as the two server-only variables above. Never paste them into chat or Admin.
3. Redeploy Production.
4. Sign in as Admin and verify Conversations and Retention show `Configured`.
5. Keep `AI_ENABLED=false`; verify the Admin pages and retention controls without a paid provider call.
6. When customer inference is separately authorized, enable conversation logging explicitly in Retention. It remains OFF after first deployment.
7. Run one controlled non-customer smoke conversation, verify redaction/TTL/metadata, then delete it.

The current temporary hostname noindex/nofollow policy remains unchanged. Production paid inference must not be enabled by this phase.
