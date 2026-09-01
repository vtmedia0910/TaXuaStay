# V2 Phase 13 — AI Customer Assistant

Status: implemented as an application-only, read-only foundation. No database migration. No provider was owner-configured during implementation, so the live assistant intentionally fails closed and preserves the rest of the site.

## Scope

Phase 13 adds:

- `/assistant`: text-only, mobile-first, noindex customer experience;
- a public floating launcher that is hidden where it could overlap Booking or Trip Finder controls;
- `POST /api/assistant`: the only browser-to-AI boundary;
- a typed `AIProviderAdapter` boundary;
- nine allow-listed, read-only application tools;
- bounded provider/tool orchestration;
- Admin-only `/admin/integrations/ai` diagnostics;
- runtime-only, PII-free counters;
- provider-mock, validation, grounding, security and UI tests.

Phase 13 does not add Payment, Booking mutation, Supplier action, Telegram access, CMS publication, customer accounts, memory, embeddings, files, voice, images, weather data or a new service vertical.

## Request architecture

```text
Browser
  -> POST /api/assistant
  -> strict payload + size validation
  -> per-IP / per-session / global rate limit
  -> deterministic private/write-intent refusal
  -> AIProviderAdapter
  -> bounded allow-listed tool loop
  -> customer-safe DTO + provenance
  -> final plain-text answer
```

The browser never calls a model provider directly. Domain logic depends only on the local adapter contract, not a vendor SDK response type. Provider-specific code may be added later only after the owner selects and configures a provider. An absent, partial or unsupported configuration is not guessed: it returns `AI_NOT_CONFIGURED`.

Server-only environment contract:

```text
AI_PROVIDER
AI_MODEL
AI_API_KEY
```

The current adapter deliberately supports the safe unconfigured state only because no provider credential/provider choice existed at implementation time. `AI_API_KEY` is represented only as present/absent in diagnostics. Its value is never returned, logged, committed, stored in Supabase or sent to the browser.

## Tool allow-list

### `get_room_options`

Uses the existing public room search, price, availability, Cloud View and Road projections. Input is bounded to Tà Xùa, 1–31 nights, 1–20 adults, 0–20 children and 1–10 rooms. Output is at most six customer-safe options. A missing price/tình trạng remains unknown.

### `get_verified_facts`

Uses public Property, Room and verification bundles. It returns public facts, access certainty and current verification only. `true`, `false` and `null` are preserved; `null` is never rewritten as “Không”.

### `get_price`

Calls the Phase 5 public sell-price resolver for the requested room and date range. No commercial economics function, supplier cost, margin or contribution is imported. Missing/conflicting authority returns `totalVnd: null`.

### `get_availability`

Calls the Phase 6 public availability resolver for the exact room, dates and requested quantity. It does not infer availability from room existence, a price or a historic Booking. Unknown remains unknown.

### `get_package`

Uses published Package facts and `getPublicPackageQuote`. The explicit Package sell total remains authoritative. Component prices are not summed and private component economics are excluded.

### `run_trip_finder`

Calls `getTripFinderCandidateSet` and the pure `phase7-trip-finder-v1` resolver. The assistant receives the deterministic recommendations after internal candidate IDs/images are removed. It can explain but cannot replace the ordering or rank by economics.

### `get_booking_public_status`

Calls the existing `getPublicBookingStatus` code-plus-opaque-cookie path and then `buildCustomerTripDashboard`. Wrong/missing authorization returns no Booking facts. The tool has no access to PII, raw snapshots, Supplier data, internal notes or staff events.

### `get_policy`

Reads exact Property check-in/out facts and matching published FAQ items. If the requested public policy is absent, it says so rather than substituting generic hospitality policy.

### `search_public_content`

Searches only the published CMS page allow-list: `home`, `stay`, `verified`, `footer`, and `faq`. Results are bounded to eight chunks and explicitly labeled untrusted text so retrieved content cannot grant permissions or define tools.

No generic database/RPC/query tool exists. No write tool exists.

## Grounding and provenance

Every tool result has:

```ts
{
  status: "known" | "unknown" | "unavailable";
  data: customerSafeDto;
  source: { label; href?; asOf?; reference? };
}
```

A provider response marked `tool_based` is rejected unless at least one approved tool actually ran. A first response without a tool is accepted only as a concise clarification or refusal. Unknown tool names, duplicate call IDs, malformed arguments, empty call sets and more than four tool calls fail with `AI_RESPONSE_INVALID`.

Customers see only the final plain-text answer and compact source labels. Raw tool payloads, tool names, database IDs and chain-of-thought are not rendered.

## Security boundary

- publishable Supabase architecture remains unchanged;
- no `service_role`, Supabase Secret key or privileged browser client;
- no model SQL, schema, arbitrary RPC, arbitrary table query or private RAG;
- no private Booking/Supplier/Operations/Telegram/economics DTO enters provider context;
- nested DTO sanitization removes keys associated with credentials, Supplier, staff, internal notes, economics, Telegram, bank/payout and tokens;
- credential-shaped strings are redacted and output is bounded;
- obvious private-data and write-action injection requests are refused before calling a provider;
- system prompt treats user/CMS/retrieved text as untrusted;
- Booking access remains code + opaque HttpOnly cookie;
- conversation history remains in the browser session and is not persisted server-side.

The endpoint stores no prompt and logs no cookie/token. Runtime counters contain only numeric counts, latency, token usage when supplied and tool-name counts.

## Reliability and cost controls

- request body: maximum 16 KiB;
- current user message: 1,200 characters;
- recent history: at most six messages, each 1,200 characters;
- output: at most 2,400 characters;
- tool calls: at most four per user turn;
- provider call timeout: 12 seconds;
- whole assistant request budget: 15 seconds;
- client network timeout: 20 seconds;
- public rate limits: eight/IP/minute, ten/session/minute, 80/instance/minute;
- rate-limit keys are one-way hashes and are kept only in bounded instance memory;
- availability and authorized Booking reads are not application-cached by the assistant;
- provider failure, timeout, invalid response and tool error fail closed.

Instance-local counters are deliberately non-persistent because Phase 13 does not justify a new PII-bearing observability table. They may reset during serverless rotation and are not a billing ledger.

## Customer experience

The chat is Vietnamese-first and text-only. It includes short deterministic suggested questions, a source-of-truth disclosure, accessible live/loading states, large tap targets, keyboard submission, retry/offline feedback, compact source links and a sticky composer above the safe-area inset. It renders text without HTML/Markdown injection.

When AI is unavailable, the response points to Trip Finder, Lưu trú and instructions for opening My Trip. The site remains otherwise fully usable. `/assistant` is `noindex,nofollow,noarchive`; no transcript URL or sitemap entry exists.

## Admin diagnostics

`/admin/integrations/ai` requires `app_metadata.role = admin`. It shows:

- configured/not configured;
- provider and model names when present;
- credential present/absent, never its value;
- read-only tool count;
- request/success/failure/rate-limit/tool-error counts;
- average latency, token usage when a provider returns it, and last success;
- the runtime-instance limitation.

The canned test link opens only the public assistant and cannot mutate data.

## Error taxonomy

Customer-safe codes are:

- `AI_NOT_CONFIGURED`;
- `AI_PROVIDER_UNAVAILABLE`;
- `AI_RATE_LIMITED`;
- `AI_TOOL_ERROR`;
- `AI_TIMEOUT`;
- `AI_BAD_REQUEST`;
- `AI_RESPONSE_INVALID`.

Provider errors are never forwarded verbatim.

## Test strategy

Normal CI uses fake adapters and never calls a paid provider. Tests cover absent/partial/unsupported configuration, clarification, one/multiple tool calls, timeouts, unknown tools, invalid/over-limit loops, grounding enforcement, private/write injection, tri-state preservation, PII/economics/credential stripping, request bounds, date ranges, Booking-code validation, per-IP/session rate limits, package price authority, Trip Finder reuse, public CMS allow-list, noindex, mobile safe area and Admin role guard.

Existing Phase 5/6/7/8/10 domain tests continue to prove price, Package, Trip Finder and Booking semantics. A future live provider smoke must be owner-enabled and public-read-only; normal `npm test` must never require external AI.

## Production smoke procedure

With no provider configured:

1. open `/assistant` and verify the disclosure, suggestions and composer;
2. send a public-safe question and verify `AI_NOT_CONFIGURED` with product fallbacks;
3. verify no provider network call or credential appears in browser network/console;
4. open `/admin/integrations/ai` while authenticated as Admin and verify the safe unconfigured state;
5. confirm temporary-host robots remain noindex/nofollow.

If the owner later selects a provider, add its isolated adapter and tests, set the three server-only Vercel variables, redeploy, then use only public-safe read smoke questions. Do not test Booking mutation, Payment, Telegram or Supplier data.

## Database and deferred boundaries

Migrations remain 001–033 Local = Remote. Migration 034 was not created and no DB push is required. Phase 12Q remains deferred. Telegram Supplier behavior is unchanged. Real Payment Integration, Bus, Transfer, Add-ons and direct Biker database integration were not started.
