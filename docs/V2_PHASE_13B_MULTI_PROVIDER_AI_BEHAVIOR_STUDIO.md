# V2 Phase 13B — Multi-Provider AI Runtime & AI Behavior Studio

Status: implementation complete with customer inference disabled by default. Migration 034 stores only versioned runtime/profile/health/audit metadata. It seeds one safe DRAFT profile, no ACTIVE runtime, no credential and no inference.

## Locked safety boundary

Phase 13B changes provider selection and behavior operations, not application authority. The assistant still has exactly these nine customer-safe, read-only tools:

1. `get_room_options`
2. `get_verified_facts`
3. `get_price`
4. `get_availability`
5. `get_package`
6. `run_trip_finder`
7. `get_booking_public_status`
8. `get_policy`
9. `search_public_content`

There is no generic SQL, RPC, HTTP, browser or database tool and no Booking, Payment, Supplier, Telegram or CMS mutation tool. Package totals, deterministic Trip Finder results, secure My Trip projection and application DTOs remain authoritative. `unknown` is never rewritten as `false`; absent prices remain null. The code-owned core prompt, tool grounding, privacy rules and injection refusal compile before the Admin behavior layer and cannot be edited from Admin.

## Provider registry

The registry is code-owned. Admin may select only a provider/model pair present in this allow-list:

| Provider | Model | Tool support | Activation |
| --- | --- | --- | --- |
| Gemini | `gemini-2.5-flash` | Function calling adapter | Allowed after gates pass |
| OpenAI | `gpt-5-mini-2025-08-07` | Responses function calling | Allowed after gates pass |
| DeepSeek | `deepseek-v4-flash` | Chat-completions tool calling | Allowed after gates pass |

Each adapter uses one fixed vendor endpoint, normalizes text/tool calls/usage, rejects malformed output and maps credentials, unsupported models, 429, timeout and 5xx failures to sanitized application errors. There is no arbitrary model ID, base URL, OpenAI-compatible gateway or automatic failover. A missing credential for the selected provider cannot fall back to another configured provider.

Provider usage is reconciled through the existing shared Upstash controls. When a provider has no reviewed exact price in the code registry, cost displays `unavailable` rather than a fabricated zero; conservative request reservation still limits spend.

## Environment contract

Provider credentials remain server-only in Vercel:

```text
GEMINI_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
AI_ENABLED=false
AI_KILL_SWITCH=false
AI_ALLOW_PREVIEW=false
AI_IDENTITY_HASH_SALT=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

The former generic `AI_PROVIDER`, `AI_MODEL` and `AI_API_KEY` runtime contract is superseded. Provider/model now come from the active immutable runtime revision; a provider-specific key comes only from its fixed server environment variable. Admin and browser receive only `Configured` or `Missing`, never a value, suffix, raw provider response or secret history.

## Migration 034

`202609020034_v2_ai_runtime_and_behavior_studio.sql` adds:

- `ai_assistant_profiles`: structured, versioned DRAFT/ACTIVE/ARCHIVED profiles;
- `ai_runtime_settings`: immutable provider/model/profile DRAFT/ACTIVE/SUPERSEDED revisions;
- `ai_provider_health_checks`: explicit, sanitized health metadata;
- `ai_runtime_audit_events`: append-only lifecycle metadata without prompts, answers or PII.

All four tables have RLS. Anonymous users have no table read/write grants. Authenticated reads are limited by `is_admin()` policies; mutation is through fixed-search-path, Admin-checked transaction functions only. Runtime activation requires a DRAFT with Prompt Lab PASS and a matching CONNECTED health result not older than 24 hours. Rollback creates a new revision and reads the current Vercel credential; it never restores a secret. Advisory transaction locks and unique partial indexes prevent concurrent active revisions.

The public assistant server resolves only the fixed `get_active_ai_runtime()` projection using the existing Publishable-key architecture. This projection exposes the active provider/model and compiled behavior inputs needed by the server route, not table access, credentials, core safety prompt, actor IDs, health history, audit metadata, prompts or conversations. With no ACTIVE runtime it returns no row.

## AI Control Center

`/admin/integrations/ai` is Admin-only and mobile responsive. Page load performs no provider request. It shows:

- current active revision and hard environment gates;
- the code-owned provider/model registry;
- credential presence only;
- explicit per-provider health and latency;
- shared request/token/tool/error/cost diagnostics;
- a versioned runtime DRAFT editor;
- Prompt Lab result, source, usage, latency and safe code;
- Behavior Studio profiles;
- activation history, rollback and runtime disable actions.

Activation is blocked unless the selected pair is allow-listed, the provider credential/shared store/identity salt are configured, environment policy permits execution, kill switch is off, health is current and Prompt Lab passed. `AI_ENABLED=false` remains the final customer master gate even after an Admin activates metadata.

## Behavior Studio and Prompt Lab

Profiles version these structured fields: role, persona, tone, verbosity, answer style, language policy, sales policy, uncertainty policy and custom instructions. Deterministic validation enforces lengths/enums, rejects control characters, secret-shaped text and explicit attempts to bypass tools, reveal credentials, fabricate facts or enable mutations.

Saving creates a DRAFT revision; activation archives the previous active profile only inside the same runtime transaction. Prompt Lab always tests a selected DRAFT revision and its exact profile revision. It uses the same timeouts, tool ceilings, shared admission, quotas and budget reservation as customer inference. It stores only PASS/FAIL, sanitized result code, revision, actor and timestamp—not the raw prompt, answer, history or source payload.

## Production activation sequence

Deployment itself must leave customer inference off. The owner later:

1. configures the selected provider key directly in Vercel Production (Gemini is the preferred first controlled test), plus the existing Upstash and identity-salt variables;
2. keeps `AI_ENABLED=false`, redeploys, signs in as Admin and confirms only the selected credential shows `Configured`;
3. runs that provider's explicit health check;
4. saves/reviews a Behavior Profile and runtime DRAFT;
5. runs Prompt Lab with safe read-only questions and reviews sources, tool calls, latency and usage;
6. activates the passing runtime revision;
7. performs an owner-authorized controlled smoke; and only then
8. explicitly authorizes `AI_ENABLED=true` and redeploys.

Never paste provider/Upstash secrets into chat, source, Supabase, Admin or logs. Preview remains fail-closed unless explicitly configured with isolated credentials. `AI_KILL_SWITCH=true` is the immediate stop.

## Explicit exclusions

Phase 13B adds no persistent conversation history, model training, vector database, private corpus, automatic failover, AI write action, AI Customer account, Payment/provider integration or new service vertical. It does not access Tà Xùa Biker.
