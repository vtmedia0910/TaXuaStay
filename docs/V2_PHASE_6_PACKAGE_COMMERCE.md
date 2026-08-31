# V2 Phase 6 — Package Commerce

## Status and scope

V2 Phase 6 is implemented by migration `202608290023_v2_package_commerce.sql`, the `phase6-package-v1` resolver, public `/packages` routes, and private `/admin/packages` operations.

This phase is a Package Commerce foundation. It deliberately does **not** create Booking, Booking Items, Payment, Deposit, Refund, Settlement, My Trip, Bus Integration, Trip Finder, holds, or inventory decrements. Sending a package request is a non-booking inquiry through an explicitly approved HTTPS channel.

No production Package, component, price, availability, discount, Room, or motorbike row is seeded.

## Domain model

`packages` owns the Package business identity and proposition:

- immutable normalized machine `code`, globally unique `slug`, destination ownership, name, proposition, and description;
- lifecycle `draft → published → paused → archived`;
- inclusive validity dates;
- truthful confirmation mode, approved public request URL, featured flag, stable sort order, controlled CMS hero media, internal notes, and audit ownership.

`package_components` is a generic ordered composition model. Its taxonomy supports `ROOM`, `MOTORBIKE`, `BUS`, `TRANSFER`, `ACTIVITY`, `MEAL`, `GUIDE`, `SERVICE`, and `CUSTOM`, but Phase 6 activates only real sources:

- `ROOM` references one existing `room_types` row in the same Destination and consumes the established Stay pricing, pooled availability, verification, and Commercial Economics domains;
- `MOTORBIKE` references one existing Phase 5 `motorbike_offerings` row and remains within the `manual_reference` boundary;
- `CUSTOM` is controlled manual copy with no live availability, structured verified price, or automatic-confirmation claim.

The database rejects inactive component types and arbitrary/mismatched source identities. Each active component owns a stable component key, required/optional state, positive quantity, deterministic order, confirmation mode, bounded public copy, and private operational notes. ROOM cost cannot be copied into the component row; it must come from existing Commercial Economics. MOTORBIKE and CUSTOM may hold private, dated integer-VND cost snapshots because no equivalent current cost resolver exists for those types.

Publication is guarded in PostgreSQL. A published Package must contain at least one meaningful component, use a non-instant confirmation mode, and contain no inactive or unsupported required structured source. Current validity and public Destination/source truth determine anonymous visibility. Missing Room, media, approved request URL, current price authority, or other operational readiness remains an explicit Admin warning and a truthful degraded public state rather than being silently invented: price becomes `Cần xác nhận giá`, missing request URL exposes no action channel, and missing media uses the established neutral presentation.

## Package sell price

`package_price_rules` is the only Package sell-price authority. A rule owns an explicit integer-VND total Package price, effective dates, optional guest/room/selected-option predicates, priority, source, verification timestamp, validity date, and private notes.

Resolver precedence is deterministic:

1. match the exact Package, complete checkout-exclusive stay, guest/room bounds, and the exact selected optional component-key set;
2. choose highest priority;
3. choose highest predicate specificity;
4. treat equal-priority/equal-specificity winners as a conflict instead of guessing.

A rule is current only when its verification timestamp is not in the future, is no older than 30 days, and its `price_valid_until` covers the final lodging night. Missing, stale, invalid, or conflicting authority returns no public amount and displays `Cần xác nhận giá`. The resolver never sums standalone component sell prices, invents `giá từ`, fabricates a discount, or claims savings.

Price and availability remain separate facts.

## Availability and confirmation

Package availability is an aggregate state, never a boolean:

- ROOM consumes the existing checkout-exclusive pooled room availability resolver;
- MOTORBIKE consumes the published Phase 5 projection and always remains manual confirmation; stale or missing source facts become unknown;
- CUSTOM remains manual/unknown according to its controlled mode.

Required and selected optional components participate in aggregation. Any unavailable included component makes the Package unavailable. Otherwise unknown facts remain unknown, manual facts require confirmation, and only sufficiently current room facts can be recorded as available. Even a recorded-available Package still requires manual or external confirmation; Phase 6 rejects `instant` publication and never represents a hold.

The pure resolver input is Package ID, check-in, check-out, adults, children, requested rooms, and selected optional component keys. Its public DTO contains only Package identity, date/guest context, selected component facts, Package sell-price status, aggregate availability/confirmation, caveats, and a safe request URL. Policy version is `phase6-package-v1`.

## Private economics

The private resolver follows Phase 4 semantics:

- ROOM component cost is the existing accommodation net-cost resolution multiplied by Package quantity;
- MOTORBIKE/CUSTOM cost uses only a complete, current component cost snapshot;
- Package cost is the sum of selected component costs only when every selected component has authoritative current cost;
- a missing cost is `null`, never zero;
- gross contribution is `package sell price - package cost`;
- gross margin basis points is `round(gross contribution × 10000 / sell price)` when sell price is positive.

These are gross contribution diagnostics, not net profit. Component costs, Package cost, contribution, margin, rule IDs, conflicts, Supplier data, Partner data, contract references, internal notes, and audit identities exist only in authenticated Admin/private DTOs.

## Admin operations

Admin-only routes are:

- `/admin/packages`
- `/admin/packages/new`
- `/admin/packages/[id]/edit`

The editor manages Package identity, proposition, lifecycle/confirmation, controlled media, real components, required/optional state, quantity/order, explicit Package price rules, private cost snapshots where allowed, and warnings. One `save_package_commerce` transaction validates and replaces the Package aggregate atomically. Ordinary authenticated `staff` has no Package mutation capability.

Warnings cover missing required Room, inactive sources, paused motorbike source, missing/stale/conflicting Package price, unknown required availability, missing component cost, negative contribution, invalid dates/options, missing image/copy, and a published Package without meaningful components. Preview keeps public and private output visually distinct.

## Public experience

Public server-first routes are:

- `/packages`
- `/packages/[slug]`

Only current published Packages whose Destination and required structured sources pass the database public predicate are visible. Missing controlled media, current price authority, or an approved request channel stays visible only as an explicit degraded state; it is never filled with invented content. List ordering is featured, `sort_order`, then stable recency/identity ordering. Sitemap output contains only public Package URLs.

Mobile is the primary surface. Cards prioritize image, name, proposition, included components, price status, confirmation status, and a truthful detail action. Detail ordering prioritizes hero, proposition, price/status, `Yêu cầu xác nhận gói`, inclusions, component truth, caveats, and next step. `Chọn ngày & số người` opens an accessible keyboard-operable sheet with progressive optional-component selection, visible focus, 44px touch targets, safe-area padding, and reduced-motion support.

There is no `Đặt ngay`, payment, held-place, fake rating/review, fake Offer, or availability claim. With zero published Packages, `/packages` remains useful and truthful, while Homepage/Header/Footer continue to communicate that Combo is not currently available rather than implying commerce exists.

## Security contract

All three tables have RLS. Anonymous users receive:

- column-level SELECT only for the allow-listed `public_packages` view path;
- EXECUTE only on sanitized component and Package-price functions whose output schemas omit private identities and economics;
- no table mutation and no access to private cost, margin, Supplier/Partner facts, external references, internal notes, or audit IDs.

The public view is `security_invoker`. Its eligibility predicate is fixed-search-path and scoped to public resolution. Admin mutation uses a fixed-search-path transactional function that checks `app_metadata.role = admin`; user-editable metadata is never authorization input. CMS media archive protection includes non-archived Packages.

No browser or application runtime uses a service-role key. Tà Xùa Biker remains a separate repository, database, Auth, Storage, secret, customer-data, and operational boundary. Package consumes only the Phase 5 Trip projection and never reads or copies Biker fleet data.

## Operating checklist

Before publishing a real Package:

1. link it to the correct Destination and at least one active published Room in that Destination;
2. use only a published Phase 5 motorbike offering when including motorbike;
3. provide factual proposition/copy and an active CMS hero image;
4. create an explicit current Package price rule for each supported guest/room/option shape;
5. supply authoritative private cost for every selected component needed by economics;
6. select manual or external-request confirmation and an approved HTTPS inquiry URL;
7. review warnings and preview both public truth and private economics;
8. publish without implying Booking, payment, a hold, or automatic confirmation.

V2 Phase 7 remains out of scope and has not been started.
