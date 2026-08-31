# V2 Phase 7 — Trip Finder

## Status and boundary

V2 Phase 7 implements the public `/trip-finder` decision-support experience and the pure code policy `phase7-trip-finder-v1`. It required **no database migration**: migrations `202608290001` through `202608290023` remain immutable and Local = Remote.

Trip Finder composes existing public truth from Stay, verification, Room Quality, Road access, pricing, pooled availability, Motorbike and Package Commerce. It adds no Booking, Booking Item, hold, Payment, Checkout, My Trip, Bus Integration, customer profile or production seed data.

## Pre-audit

The implementation began at repository `vtmedia0910/TaXuaStay`, branch `main`, clean baseline `fb00defed59fc1ceae9ea3a5ba1a0a215c632aa1`. `origin` pointed only to TaXuaStay and Supabase reported migrations 001–023 Local = Remote.

Production public reads returned zero Property, Room Type, inventory, rate plan/rule, verification, Motorbike offering and Package rows. The empty-result experience is therefore a first-class state. No sample candidate, price, availability, score, review or rating was added.

The previous search ranking was room-only and used factual capacity, verification, media completeness and availability. No multi-domain recommendation engine existed. The locked Hero remains a room search; Phase 7 changes only the global `Tìm chuyến đi` navigation destination and does not redesign the accepted Desktop/Mobile Hero.

## Public route and progressive flow

`/trip-finder` is the single canonical route. The first phone screen gives context and one `BẮT ĐẦU` action. Five progressive screens collect seven meaningful decisions:

1. lodging dates;
2. adults, children and requested rooms;
3. trip style;
4. view priority;
5. road-access need;
6. preference for current verification/Room Quality facts;
7. Package, Motorbike and budget preferences.

Every step is a semantic GET form. Non-sensitive state is encoded in a normalized query string, so browser Back/Forward, refresh and sharing preserve the decision context without an account, cookie, local storage or traveler profile. The page never collects name, email or phone in Phase 7.

The flow is server-first and uses no new client bundle. Controls meet the 44 px touch target baseline; the primary action is 56 px, uses safe-area bottom padding on phone, retains visible focus and native keyboard behavior, and does not depend on hover.

## Hard constraints and preferences

The resolver keeps these concepts separate.

Definite hard failures remove a candidate:

- known insufficient room capacity;
- current recorded sold-out/unavailable state;
- `car_access = no` when the traveler requires car access;
- a standalone Motorbike option when Motorbike was not requested;
- a Package whose existing resolver says the selected date/guest context is invalid.

Unknown is never rewritten as false. Unknown capacity, access or availability remains eligible only as a conditional result with an explicit caveat. A `car_access = unknown` candidate is therefore not described as inaccessible and is not placed in `Phù hợp nhất`.

Preferences influence order and explanation but do not silently remove candidates:

- couple/family/group/slow trip style;
- Cloud View, view from bed, mountain or valley preference;
- motorbike-access preference;
- current Room Quality dimensions;
- current verification preference;
- Package/Motorbike composition preference;
- complete-price or bounded-budget preference.

Budget bounds are preferences, not a hard checkout ceiling. Missing price remains null and is never converted to zero. Individual Room + Motorbike composition is never summed into a fabricated Package price.

## Deterministic policy

The pure resolver in `src/features/trip-finder/resolver.ts` uses a code-versioned, deterministic policy. Internal weights exist only to create stable order; no score, confidence percentage or AI label enters the public DTO or UI.

Tie-breaking is stable by candidate kind and public candidate ID. At most three options are returned and grouped as:

- **Phù hợp nhất** — supported hard facts and selected preferences align without conditional blockers;
- **Đáng cân nhắc** — valid, but one or more preferences or confirmation modes require a trade-off;
- **Phù hợp nếu...** — a required fact remains unknown or needs confirmation.

If no candidate survives definite hard constraints, the resolver returns explicit changes the traveler may choose. It never reruns itself with relaxed constraints behind the scenes.

The resolver has no input or import for net cost, contribution, margin, commission, Supplier tier, Partner tier or contract status. Those private commercial facts cannot change eligibility, score, group or tie-breaking.

## Candidate sources

### Stay and rooms

The bounded room pool reads up to 200 public Room Types through existing RLS and the explicit room/property projection. A larger result is treated as an operational error rather than silently recommending from an incomplete pool. Media, amenities, current Cloud/Road facts, Phase 5 price quotes and Phase 6 availability quotes are loaded in fixed batches. Current Room Quality and Room verification are loaded from their existing public views.

Room candidates use actual capacity, bathroom, balcony, basic view, current Cloud View/view-from-bed, current Road facts with preliminary fallback, current Room Quality dimensions, price confidence and pooled availability. Physical `room_types.quantity` is not sent to the public card.

### Package

Package candidates use `public_packages`, sanitized component/price functions and the existing `phase6-package-v1` resolver. Only explicit Package totals are shown. Required Room components reuse the corresponding room facts for capacity, road, view, quality and verification context. Package availability and manual/external confirmation remain separate from price.

### Motorbike

Motorbike candidates use the existing `manual_reference` adapter and `public_motorbike_offerings`. A listed option never means live availability. Source freshness, current optional price and manual confirmation remain as defined by Phase 5.

### Individual composition

When Motorbike is requested, Trip Finder may combine a real room candidate with a real public Motorbike option. The composition retains each service's actions and truth states. It does not create a Package row, combined price, hold, booking or cross-system confirmation.

## Explainable public DTO

The public resolver output is allow-listed to:

- public identity, candidate kind and presentation image;
- result group;
- factual reasons;
- trade-offs;
- explicitly unknown facts;
- public verification labels;
- price label/state and public amount when authoritative;
- availability and confirmation state;
- truthful next actions;
- `phase7-trip-finder-v1`.

It contains no raw database row, internal score, rule ID, Supplier/Partner identity, tier, cost, margin, commercial note, audit ID or customer identity.

The available actions are `XEM PHÒNG`, `XEM GÓI`, `XEM XE` and, only when an existing approved request channel permits it, `YÊU CẦU XÁC NHẬN`. None means booking or payment.

## Empty, loading and error behavior

Zero production candidates produce a useful empty result with the source status, saved traveler context and deliberate alternatives. Loading has an accessible status. A route error preserves query state in the URL and offers retry or Stay discovery. Partial source failure is disclosed; successful sources may still produce results, but no placeholder fills a failed source.

## SEO and discoverability

The landing canonical is `/trip-finder`. The landing can be indexed only when the established final-brand-domain policy permits indexing. Any query/step/result state requests `noindex,follow`; the stricter temporary-host `noindex,nofollow` policy continues to win on the technical Vercel hostname.

Only `/trip-finder` is added to the sitemap. Preference combinations are not emitted. No Offer, rating, review, AI, price or availability structured data is generated.

Global Desktop/Mobile `Tìm chuyến đi` actions and the Footer now open `/trip-finder`. The locked Hero's `TÌM PHÒNG PHÙ HỢP` form still submits to `/stay` and retains its established room-search behavior.

## Security and performance

All runtime reads use `createPublicSupabaseClient()` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. There is no legacy anon fallback, service-role client, Supabase Secret key, private economics read, Biker request, Biker credential or Biker database access.

Data is server-rendered with bounded result counts and fixed-batch queries. The browser receives only the sanitized recommendation DTO. No analytics SDK, AI service, polling loop, large UI dependency or persisted behavioral profile was added.

## Verification checklist

- policy tests cover hard constraints, preferences, unknown semantics, Cloud/Room Quality/Road/verification signals, missing price, unknown availability, Package confirmation, manual Motorbike, deterministic ties, policy version, DTO allow-listing, commercial-bias exclusion and no-result relaxation;
- public UI tests cover the landing, progressive form, canonical/noindex behavior, explainable result, caveat, truthful action, empty/error behavior, locked Hero regression and public-client security boundary;
- completion gates passed on 2026-09-01: lint, typecheck, 76 test files / 419 tests, and the Next.js 16.3.2 production build including dynamic `/trip-finder`;
- browser QA covered 390×844, 393×873, 412×915, 430×932, 768×1024, 1024×768, 1366×768 and 1440×900 for the real empty production state, plus the five-step flow, URL Back/Forward state, touch targets, horizontal overflow, canonical metadata and locked Hero regression. Explainable cards were inspected with a temporary local-only fixture, which was removed before quality gates and commit;
- Supabase migrations 001–023 were Local = Remote before completion; no migration or database push was performed;
- production verification covers `/trip-finder`, public routes, Admin auth guards and temporary-host noindex/nofollow after deployment.

## Explicit scope stop

Phase 7 creates no Booking, Payment, Checkout, My Trip, Bus Integration, Trip Operations or later-phase capability. No later V2 phase is included.
