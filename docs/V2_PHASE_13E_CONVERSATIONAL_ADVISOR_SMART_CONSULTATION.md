# V2 Phase 13E — Conversational Advisor & Smart Consultation

Status: application implementation complete. No Supabase migration. Migrations remain 001–034 Local = Remote; migration 035 does not exist.

## Scope

Phase 13E upgrades the existing read-only Assistant into a bounded conversational travel advisor. It adds deterministic social handling, temporary session preferences, consultation stages, one next-best question, contextual option references, concise comparison guidance and dynamic suggested replies. It does not create a second AI runtime, a customer profile or a new transcript store.

The locked Phase 13–13D boundary remains unchanged:

- exactly nine existing read-only business tools;
- Gemini, OpenAI and DeepSeek adapters and allow-lists unchanged;
- Phase 13A shared admission, quotas, budgets, timeouts and kill switch unchanged;
- deterministic Trip Finder ordering remains authoritative;
- Package price authority and `true` / `false` / `unknown` semantics remain unchanged;
- no Booking, Payment, Supplier, Telegram or CMS mutation;
- no generic SQL, RPC, HTTP, browser or database tool;
- Publishable-key-only Supabase runtime, with no service role or Supabase Secret key.

## Deterministic social router

The API classifies only conservative, pure greeting, thanks, goodbye, identity and capability messages as social turns. These turns return fixed Vietnamese answers before runtime resolution, provider creation and the Phase 13A Upstash admission/budget operation. They therefore use zero provider calls, zero tool calls and zero paid tokens.

Mixed messages such as `Chào bạn, tìm phòng săn mây cho 2 người` and adversarial text containing a greeting do not enter this fast path. They continue through the existing grounded runtime. Requests to book, hold, cancel or pay receive deterministic read-only guidance to the existing public flow and never become an AI write action.

## Advisor Session State

`phase13e-v1` is a strict Zod allow-list sent by the browser and revalidated by the server on every request. It may contain only:

- Tà Xùa destination, check-in/out, guest and room counts;
- bounded min/max budget and per-night/trip unit;
- transport mode and road tolerance;
- nullable cloud-view, quiet, private-room and couple preferences plus bounded priority tags;
- consultation stage, last intent and already-asked fields;
- at most five customer-safe option references, with the active UI/provider path using at most three.

Option references contain only a public kind, public slug, display label and optional last-seen public price pointer. They are conversation pointers, not current business truth. Facts must be re-resolved through the existing tools. A changed constraint clears the stale candidate set; an explicit contextual reference may remain selected only as a pointer for revalidation.

The browser stores this bounded state in `sessionStorage`. It stores no name, phone, email, raw transcript, IP, cookie, Booking access token, Supplier/private ID, internal economics or long-term profile. `Bắt đầu lại` clears visible history, preferences and option references without touching cookies, auth, My Trip authorization or retained Phase 13D records.

## Consultation policy

The code-owned stage model is:

```text
DISCOVER → UNDERSTAND → NARROW → COMPARE → RECOMMEND → DECIDE → NEXT_ACTION
```

The server deterministically extracts explicit dates, party/room counts, common budget expressions, transport, road tolerance and a small preference allow-list. A newer explicit customer correction wins. Stage and the next question are derived in code; the provider cannot replace the state machine.

An explicit flexible-budget correction clears the earlier min/max/unit rather than silently retaining an obsolete ceiling. Like other constraint changes, it invalidates recent candidate pointers so the next grounded turn re-evaluates them.

Next-best-question priority depends on intent. Recommendation starts with guests, then priority, budget, transport/road and dates. Availability starts with dates, then guests and target. Road advice starts with target and transport. At most one primary clarification is supplied to the model, and a field already asked or known is not asked again.

When the provider returns a clarification turn, the customer-visible question is aligned to that code-selected Next Best Question before response and best-effort transcript capture. Provider wording therefore cannot make the visible question disagree with the stored `askedFields` state or the suggested-reply chips.

Ordinal and contextual phrases such as `cái thứ 2`, `phòng đó` and `cái rẻ hơn` resolve only against the bounded recent public references. Missing, tied or out-of-range context stays ambiguous and produces one clarification rather than a guess.

## Advisor prompt and response

The immutable compile order is code-owned core safety, product grounding, Admin Behavior Profile, Phase 13E advisor rules, then tool rules. Per-request session/page context is appended as explicitly untrusted context. The advisor is instructed to:

1. answer the current question;
2. add one useful advisory insight;
3. suggest one non-pushy next step when helpful.

It favors two or three options, explains trade-offs from tool facts, keeps unknown explicit and uses short mobile-friendly paragraphs. The public response adds only an allow-listed advisor state patch, stage and up to three suggested replies. It exposes no internal intent/debug trace, chain-of-thought or raw tool payload.

## Behavior Studio

The existing Behavior Studio now offers `Điền mẫu cố vấn`. It fills a reviewed travel-advisor persona into the current form only. It does not save, run Prompt Lab, activate a runtime or change Production inference. Admin must review and deliberately save a DRAFT, test it and activate it through the existing Phase 13B gates.

## Phase 13D and cost behavior

Grounded turns retain the existing Phase 13D best-effort redacted capture and the existing Phase 13A paid-admission path. Advisor state is not added to transcript storage. Pure deterministic social/action turns do not create a provider/runtime transcript record and do not touch the paid quota/budget Redis. No conversation storage design or retention behavior is introduced.

## QA and boundaries

Automated coverage includes social and mixed routing, state extraction/correction, strict PII rejection, question dedupe, stage progression, contextual references, three-option bounding, route admission bypass, grounded-runtime continuation, UI state/suggestions/reset, prompt ordering and the unchanged provider/tool safety suites.

Production remains subject to the current owner-controlled `AI_ENABLED`, ACTIVE runtime, provider health, Prompt Lab and kill-switch gates. Deployment does not activate customer inference. Browser QA must cover the canonical eight viewports and verify safe-area composer behavior, no horizontal overflow and no unexpected console/network errors.

Explicit exclusions remain real Payment, AI write tools, long-term customer profiling, new service verticals and direct Tà Xùa Biker access.
