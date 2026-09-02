# V2 Phase 13C — Assistant Discovery & Embedded Chat UX

Status: application implementation complete. No database migration. Migrations remain 001–034 Local = Remote.

## Scope

Phase 13C makes the locked Phase 13–13B Assistant discoverable without changing its authority or runtime:

- persistent public `✨ Trợ lý AI` launcher;
- restrained welcome teaser for a first-time or re-eligible browser;
- lazy embedded conversation on desktop and mobile;
- full-screen handoff to `/assistant`;
- deterministic page-aware suggested prompts;
- truthful disabled/not-configured fallback before a customer spends a request.

It does not add a provider, tool, data source, write action, database table, persistent transcript, customer account, Payment behavior, Telegram change, service vertical or Biker integration.

## Discovery policy

The launcher is ordinary client UI. The welcome teaser is shown only when all conditions are true:

1. coarse server readiness is `ready`;
2. the route is eligible;
3. no modal, alert dialog or explicit `data-assistant-discovery="disabled"` surface is active;
4. the teaser has not been seen in the current browser session;
5. the last show/dismiss timestamp is at least five days old;
6. either five seconds have elapsed or the customer has scrolled through 30% of the available document range.

Browser storage contains only the discovery version and timestamps. It stores no prompt, answer, Booking code, opaque token, page data or identity. A version mismatch is treated as no valid record. Dismissal is explicit and does not steal focus.

The launcher and automatic discovery are suppressed on:

- `/assistant`;
- `/admin/**` and auth/login paths;
- `/booking/**`, including My Trip authorization surfaces;
- `/trip-finder`, where an existing sticky multi-step action owns the conversion surface.

Public error boundaries use the explicit suppression marker. Opening another modal also removes an already-visible teaser.

## Embedded experience

Desktop uses a bounded 400px × up-to-640px panel. Mobile uses a 90dvh bottom sheet with internal scrolling, safe-area composer padding and no horizontal overflow. The panel provides:

- minimize;
- close;
- full-screen `/assistant` link;
- Escape-to-close and a bounded focus trap;
- focus return to the launcher;
- a sticky composer that remains inside the panel when the mobile keyboard changes viewport height.

The panel is dynamically imported only after the first open. Closing/minimizing hides it without creating a second conversation engine. `/assistant` and the embedded surface both render `AssistantConversation` and call the same `POST /api/assistant` boundary.

Suggested prompts fill the composer and focus it after a deliberate customer click. They do not submit automatically. Opening the page, seeing/dismissing the teaser, opening/minimizing/closing the panel, choosing a suggestion and following the full-screen link make zero provider calls. Only explicit form submission can call `/api/assistant`.

## Readiness and truthful fallback

The server converts internal runtime state to one coarse public state only:

- `ready`;
- `disabled`;
- `not_configured`;
- `temporarily_unavailable`.

Provider, model, credential, quota, budget and health details are never serialized to the public component. Disabled and not-configured states suppress automatic promotion, disable the composer and offer Trip Finder, Lưu trú and My Trip guidance. Runtime errors remain sanitized by the existing Phase 13 taxonomy.

## Public page context

The browser may submit one strict, allow-listed public routing hint:

- page kind;
- canonical public pathname;
- fixed `ta-xua` destination slug;
- bounded Property, Room, Package or Motorbike slugs when present.

Booking/auth context, cookies, opaque tokens, query strings, arbitrary page data and private identifiers are excluded. Zod rejects additional keys and unsafe path/slug shapes. The code-owned system prompt states that page context is only a navigation hint and cannot prove price, availability, verification, policy or any other business fact. Authoritative answers still require the existing nine read-only tools.

## Locked AI and security boundary

Phase 13C preserves:

- exactly nine existing read-only tools;
- code-owned safety prompt before Admin behavior;
- Gemini/OpenAI/DeepSeek allow-list and no automatic failover;
- Phase 13A Upstash admission, global quotas, budget limits, timeouts and kill switch;
- `true` / `false` / `unknown` semantics;
- Package price authority and deterministic Trip Finder ordering;
- secure Booking code plus opaque HttpOnly cookie for authorized My Trip reads;
- Publishable-key-only Supabase runtime;
- no `service_role`, Supabase Secret key or `NEXT_PUBLIC_` provider credential.

The embedded UI renders plain text and allow-listed source links. It does not move provider logic, keys, raw DTOs or internal diagnostics into the browser.

## QA contract

Automated coverage verifies:

- teaser delay, dismissal, session/version/cooldown policy;
- route and sensitive-context suppression;
- deterministic safe page context and suggestions;
- lazy panel open with no provider call;
- explicit-submit-only network behavior;
- disabled fallback;
- shared conversation/API implementation;
- strict page-context request validation;
- core prompt treatment of page context;
- existing injection, PII redaction, grounding, quota, provider and tool-limit suites.

Responsive browser QA covers 390×844, 393×873, 412×915, 430×932, 768×1024, 1024×768, 1366×768 and 1440×900. Required checks include first viewport, launcher collision, bottom-sheet/panel dimensions, focus, Escape/close/minimize/full-screen actions, safe area, keyboard/composer behavior, console/network errors and horizontal overflow.

## Deployment and phase boundary

There is no migration 035 and no DB push. Temporary Vercel hostname indexing policy remains unchanged. Production paid inference remains disabled until the separate owner-controlled Phase 13B activation gates pass. Phase 13C does not authorize a later phase.
