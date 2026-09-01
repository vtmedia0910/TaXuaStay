# V2 Phase 13A — AI Provider Activation & Cost Hardening

> Historical implementation record: Phase 13B supersedes the single-provider environment contract below. Current provider-specific variables, runtime activation and owner steps are documented in `docs/V2_PHASE_13B_MULTI_PROVIDER_AI_BEHAVIOR_STUDIO.md`. Phase 13A's shared Upstash, budget, timeout and kill-switch controls remain authoritative.

Status: application implementation complete with paid inference disabled by default. Live provider activation remains gated on owner-created server-only Vercel/OpenAI/Upstash configuration, an explicit Admin health check, and a controlled read-only Production smoke. No database migration is used.

## Locked scope

Phase 13A activates the existing Phase 13 architecture; it does not redesign it. The public surfaces remain `/assistant` and `POST /api/assistant`, Admin diagnostics remain `/admin/integrations/ai`, and the existing nine read-only application tools remain the complete allow-list:

1. `get_room_options`
2. `get_verified_facts`
3. `get_price`
4. `get_availability`
5. `get_package`
6. `run_trip_finder`
7. `get_booking_public_status`
8. `get_policy`
9. `search_public_content`

There is no generic database, SQL, RPC, HTTP or browser tool and no Booking, Payment, Telegram, Supplier or CMS mutation tool.

## Provider decision

- provider allow-list: exactly `openai`;
- model allow-list: exactly the immutable snapshot `gpt-5-mini-2025-08-07`;
- API boundary: OpenAI Responses API through `OpenAIResponsesAdapter`;
- integration: direct server-only HTTPS request inside the adapter boundary; no provider SDK enters UI or domain code;
- provider storage request: `store: false`;
- tool calling: function definitions only, no parallel calls, with application-side Zod validation remaining authoritative;
- API key: `AI_API_KEY`, server-only, never returned, logged, stored in Supabase or bundled for the browser.

Unknown provider/model values fail closed. The application never falls back to a moving alias or another provider.

## Request and safety path

```text
Browser
  -> 16 KiB body + strict schema validation
  -> AI_ENABLED / AI_KILL_SWITCH / environment gate
  -> HMAC-derived IP and session identifiers
  -> one atomic shared admission operation
       global + IP + session + daily requests + daily/monthly budget reservation
  -> deterministic private/write/guess refusal
  -> OpenAIResponsesAdapter
  -> bounded read-only tool loop
  -> customer-safe text + public provenance only
  -> shared usage/cost reconciliation
```

Prompts, conversation history, raw IPs, cookies, Booking access tokens and PII are not written to the shared store. Customer conversation state remains browser-session-only. The public API returns only answer text and public source links; token/cost/tool metrics remain server-side aggregates.

## Distributed limiter and budget guard

Phase 13A replaces the Phase 13 instance-memory limiter as the paid-inference authority with Upstash Redis over its server-only REST credentials. A single Lua/EVAL admission operation checks and increments:

- per-IP fixed minute window;
- per-session fixed minute window;
- global fixed minute window;
- daily request ceiling;
- daily budget;
- monthly budget.

Raw identities are HMAC-SHA256-derived with `AI_IDENTITY_HASH_SALT`. Rate keys expire automatically. Daily aggregate buckets retain for three days; monthly buckets retain for forty days. They contain aggregate counters and sanitized error categories only.

Before a provider call, admission reserves `AI_MAX_REQUEST_COST_USD`. Successful usage is reconciled to provider token metadata. If usage or shared reconciliation becomes unavailable, the conservative reservation remains instead of inventing or refunding unknown cost. Exhausted request or budget ceilings block the provider call.

Default bounded controls:

| Control | Default |
|---|---:|
| IP requests/minute | 8 |
| Session requests/minute | 10 |
| Global requests/minute | 80 |
| Requests/day | 200 |
| Daily budget | USD 3 |
| Monthly budget | USD 30 |
| Max conservative reservation/request | USD 0.05 |
| Provider timeout | 12 seconds |
| Total request timeout | 18 seconds |
| Max output | 800 tokens / 3,200 characters |
| Max tool rounds | 4 |
| Max total tool calls | 8 |
| Max repeats of one tool | 3 |

Budget states are deterministic: `normal`, `warning` at 80%, and `exhausted` at 100%. `AI_KILL_SWITCH=true`, `AI_ENABLED=false`, or unauthorized Preview execution blocks inference before any provider call.

## Cost accounting

`src/features/ai/cost.ts` is the single provider-aware cost utility. It normalizes provider-reported input/output tokens for the one approved snapshot. Invalid, missing or unrecognized usage produces `null`; it never produces a fabricated zero. Pricing assumptions must be checked against the provider's official model page before Production activation and updated with tests if the provider changes them.

Shared diagnostics expose aggregate request, success/failure, rate-limit, budget-block, timeout, provider-error, tool-error, token, tool-call, latency and estimated-cost values. No prompt/history analytics or billing ledger is created.

## Admin diagnostics and health check

`/admin/integrations/ai` remains restricted to `app_metadata.role = admin`. It displays only:

- enabled/disabled and kill-switch state;
- provider and exact model;
- credential/shared-store/identity-salt presence, never values;
- adapter and shared-store readiness;
- daily requests/tokens/estimated cost;
- daily/monthly budget state;
- recent sanitized error category;
- provider health status/time/latency;
- tool count and read-only safety assertions.

Loading the page never calls OpenAI. `Kiểm tra provider` is an explicit Admin Server Action using one fixed minimal prompt with no customer, Booking or business data. It is timeout-bounded, goes through the same shared quota/budget admission, records only sanitized status/usage, and is blocked by the kill switch and Preview policy.

## Environment contract

All variables below are server-only unless already named public for unrelated site configuration:

```text
AI_PROVIDER=openai
AI_MODEL=gpt-5-mini-2025-08-07
AI_API_KEY=<owner enters in Vercel>
AI_ENABLED=false
AI_KILL_SWITCH=false
AI_ALLOW_PREVIEW=false
AI_IDENTITY_HASH_SALT=<owner-generated random value>
UPSTASH_REDIS_REST_URL=<owner enters in Vercel>
UPSTASH_REDIS_REST_TOKEN=<owner enters in Vercel>
```

Operational limits are represented in `.env.example`. None may use a `NEXT_PUBLIC_` prefix. Preview remains disabled unless the owner deliberately provides isolated Preview credentials and explicitly opts in.

## Owner activation checklist

1. Create/connect one Upstash Redis database for this Vercel project and Production environment.
2. Add the exact server-only `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` variables in Vercel; do not paste values into chat or docs.
3. Add server-only `AI_API_KEY`, `AI_PROVIDER=openai`, `AI_MODEL=gpt-5-mini-2025-08-07`, and a strong random `AI_IDENTITY_HASH_SALT`.
4. Review the daily request and daily/monthly USD ceilings. Keep `AI_ENABLED=false` and `AI_KILL_SWITCH=false`.
5. Redeploy Production and sign in as Admin.
6. Confirm diagnostics show the exact provider/model, configured credential, connected shared store and safe Disabled state.
7. Click `Kiểm tra provider` once. Confirm `connected`, bounded latency, token accounting and a small estimated cost.
8. Only after health is green, set `AI_ENABLED=true` and redeploy.
9. Run only the controlled read-only smoke prompts from the authoritative Phase 13A specification. Inspect network, latency, usage, cost and fallback behavior.
10. Keep `AI_KILL_SWITCH=true` as the immediate operational stop mechanism if spend, provider health or safety behavior is unexpected.

The owner must never provide credential values in chat. The application does not manage Vercel secrets.

## Testing and deployment boundary

Automated tests use mock providers and fake Redis behavior only; CI never needs a live key or billable call. Coverage includes config/allow-list states, normal and tool responses, usage, malformed output, 429/5xx/timeout, loop ceilings, prompt/tool-result injection, strict public payloads, HMAC identity, shared atomic dimensions, reset/TTL, budget states, kill switch, public response headers and Admin boundaries.

Migrations remain 001–033 Local = Remote. Migration 034 is not created and no database push is needed. AI activation does not add a service role, Supabase Secret key, privileged browser client, persistent conversation table, Payment behavior or any new service vertical.
