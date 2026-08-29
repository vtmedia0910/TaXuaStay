# Tà Xùa Stay architecture

## System boundary

Tà Xùa Stay is an independent verified accommodation application evolving toward a Verified Local Travel Commerce / Travel Operating System for Tà Xùa. The present implementation remains accommodation-heavy; the V2 target is a roadmap, not a claim that travel-commerce features already exist.

Stay must have separate infrastructure:

- GitHub repository
- Supabase project, PostgreSQL database, Auth, and Storage
- Vercel project
- environment variables and secrets
- staff accounts, operations, and customer data

No production database or customer data is shared with Biker.

## Source of truth and phase numbering

`docs/TA_XUA_STAY_CODEX_MASTER_PLAN.md` contains Master Plan V2 and is the sole canonical roadmap. It supersedes the former accommodation-oriented 11-phase plan. Migrations 001–008 and the existing `PHASE_1` through `PHASE_6` documents remain immutable/factual records of the **Legacy Foundation Completed**.

New work uses a separate numbering sequence: **V2 Phase 1**, **V2 Phase 2**, and so on. An old Phase 1 is never the same thing as V2 Phase 1.

## Currently implemented — legacy foundation completed

The current repository actually implements:

- site settings, Supabase Auth, `admin`/`staff` authorization, and the protected Admin shell;
- properties, `room_types`, amenities, and evidence-aware property/room-type media;
- verification lifecycle, Cloud View, Road Verified, verification evidence, and the 360 viewer;
- room-type rate plans/rules, deterministic integer-VND pricing, and price confidence;
- pooled room-type inventory, freshness-aware availability, and Admin bulk updates;
- room-first public search, intent landing pages, metadata, sitemap, robots, and temporary-host indexing safety.

There is currently no Destination domain, physical/exact-room identity, supplier or partner domain, generic services, package commerce, unified trip booking, booking items, payment, bus inventory, supplier confirmation workflow, or Trip Dashboard.

## V2 target architecture — not implemented yet

The accommodation hierarchy will evolve additively:

```text
Destination
    ↓
Property
    ↓
Room Type (commercial / pooled category)
    ↓
Physical Room (stable Room ID / exact unit)
```

The future Travel Commerce flow is:

```text
Destination
    ↓
Supplier / Partner / Services
    ↓
Package
    ↓
Booking
    ↓
Booking Items
    ↓
Supplier Confirmation
    ↓
Trip Operations / Trip Dashboard
```

The target product combines **VERIFY**, **BUNDLE**, **OPERATE**, and **DISTRIBUTE**. Existing room-type pricing, pooled inventory, search, SEO, and Verified Standard remain valid foundations while later V2 phases introduce these domains one reviewed step at a time.

## Next implementation — explicitly deferred in this task

The next implementation is **V2 Phase 1 — Architecture Alignment**: Destination, Physical Room, stable Room ID, exact-room-compatible Media, and exact-room-compatible Verification. It must preserve current rates, availability, search, SEO, Verified Standard, and public routes. None of those V2 Phase 1 changes is implemented by this documentation alignment task.

## Legacy Phase 0 baseline

The audited baseline contains the generic Next.js App Router, React, Tailwind CSS, Supabase SSR client factories, Admin authorization primitives, reusable UI components, and Vitest infrastructure.

If Stay Supabase variables are absent, public pages remain available and the Admin login explains that configuration is required instead of crashing.

## Legacy Phase 1 database and authorization foundation

Phase 1 adds one clean Stay migration with:

- a singleton `public.site_settings` table;
- role helpers that read only `auth.jwt() -> 'app_metadata' ->> 'role'`;
- `admin` and `staff` access to the protected Admin shell;
- an admin-only settings update path enforced in the UI, Server Action, and RLS;
- explicit public column grants and a public settings projection that exclude `updated_by`;
- safe public fallback content when Supabase is unavailable.

No service-role key is used by the public settings flow. Anonymous users cannot access Admin. Staff users can access the shell but cannot open or update admin-only settings.

The Phase 1 migration deliberately contains no property, room, rate, availability, customer, booking, fleet, or rental tables. Cross-product referral settings described for a later roadmap phase are also deferred.

## Legacy Phase 2 accommodation content domain

Phase 2 adds six normalized tables in one additive migration:

- `properties` for lodging/business entities;
- `room_types` for the room-level content and future transaction entity;
- `amenities`, `property_amenities`, and `room_amenities` for a shared normalized catalog;
- `media_assets` for HTTPS photo, video, and panorama evidence linked to exactly one property or room type.

Anonymous users can read only active/published properties and rooms, active amenities assigned to those records, and media assets explicitly reviewed for public display. Public application queries use field allowlists and exclude internal user/audit identifiers. Authenticated `admin` and `staff` users can manage this content through protected Server Actions, with RLS as the database backstop. Core records use archival/deactivation rather than default hard deletion.

Public Phase 2 routes are:

- `/homestay/[slug]`
- `/homestay/[slug]/phong/[roomSlug]`

Phase 2 media approval means only that an individual asset was reviewed for public display. It does not represent the future Tà Xùa Stay Verified Standard, Cloud View score, Road Verified status, or complete verification workflow.

The Phase 2 corrective migration models `car_access`, `motorbike_access`, and `parking` as explicit `unknown` / `yes` / `no` facts. Existing affirmative values remain `yes`; legacy false values become `unknown` because the old boolean could not prove a negative. Physical room `quantity` remains an Admin fact and is not granted or selected for anonymous pages. Property/room content and amenity replacement now execute in one PostgreSQL RPC transaction so an assignment failure rolls the content mutation back.

## Legacy Phase 3 room-first search and SEO

Phase 3 adds `/tim-phong` as the primary discovery route. Search begins with public room types and joins only public-safe property facts. URL state preserves dates, adults, children, requested rooms, supported property/room/access/facility filters, and the current page. Dates and requested room count are context only: Phase 3 does not query inventory, compare against physical `quantity`, or claim availability.

The search data layer uses the anonymous Supabase client and existing RLS. It performs one paginated room/property query followed by a fixed batch of room/property amenity and approved-media queries for the current page, avoiding per-card N+1 requests. Public search DTOs exclude lifecycle fields, audit IDs, physical quantity, verification placeholders, prices, and future booking data.

Seven intent landing pages reuse deterministic current facts for homestay, basic mountain/valley view, two-guest room needs, group capacity, confirmed car access plus parking, and hotel property type. Cloud/view pages explicitly remain pre-Phase 4 and do not claim Cloud View Verified. Search filter combinations canonicalize to `/tim-phong` and are `noindex,follow` once brand-domain indexing is enabled; each landing page has its own canonical.

Indexing is environment-aware. A valid explicit HTTPS brand domain in `NEXT_PUBLIC_SITE_URL` enables normal public indexing. Local hosts, technical `*.vercel.app` hosts, and deployments that rely only on `VERCEL_PROJECT_PRODUCTION_URL` remain usable but emit public `noindex` metadata; `robots.ts` blocks crawling and does not advertise the sitemap. The sitemap route still builds and contains public static routes plus RLS-visible property and room URLs, falling back to static routes if Supabase is unavailable. Property JSON-LD uses factual `LodgingBusiness`/`Hotel` fields only and omits ratings, reviews, prices, and availability.

No runtime call site requires a service-role client. The tracked environment template contains only the final canonical URL and the two public Supabase variables. Any existing `SUPABASE_SERVICE_ROLE_KEY` in Vercel is unnecessary for the current application and should be removed by the owner.

## Legacy Phase 4 Verified Standard

Phase 4 adds an evidence-backed trust domain without marking any existing content verified automatically. `verification_records` owns lifecycle, target, method, internal notes, staff audit references, verification time, and expiry. Type-specific facts live in `cloud_view_verifications` and `road_verifications`; `verification_evidence` links each lifecycle record to existing exact-target `media_assets` through foreign keys.

Cloud View is authoritative only at room-type level. Seven constrained integer components total 100 points; generated PostgreSQL columns derive `total_points` and `score_10`, so Admin cannot enter a final marketing score. The score measures physical viewing-position characteristics, not clouds or weather probability. Current public Cloud records include direct view facts, selected approved evidence, verification date, and expiry.

Road Verified is property-level and uses A–D grades plus tri-state access, surface, difficult-section, rain, parking, and walking facts. A current, evidence-backed Road record takes display precedence over Phase 2 preliminary access facts. It does not overwrite those preliminary facts, so expiry cleanly restores the original fallback instead of presenting a stale verified snapshot as preliminary data.

Public reads go through explicit current-only views and field allowlists. A badge requires `status = verified`, `verified_at <= now()`, a future expiry, a public property/room, and at least one approved public evidence link. A future-start verification is private everywhere, including Cloud View, Road Verified, and evidence. Anonymous users cannot see lifecycle method, internal notes, staff IDs, pending/rejected records, or private evidence and cannot mutate verification tables. Anonymous Cloud/Road base-table access is column-level rather than table-wide, preventing future internal columns from becoming public automatically. Staff/admin writes keep their existing RLS-protected table access plus atomic transaction RPCs. The sole new `SECURITY DEFINER` helper is a fixed-search-path boolean used to avoid recursive RLS while evaluating public eligibility; its execute grant is limited to the roles that query public verification data.

Re-verifying a non-current lifecycle record starts a fresh verification timestamp and type-specific default expiry. The Admin workflow clears the old cycle by default; intentional historical backdating requires an explicit valid custom start and future expiry. Database trigger logic independently rejects future starts, rejects already-expired verified saves, and resets unchanged dates accidentally resubmitted from an old review/expired cycle.

Public Phase 4 surfaces are the room and property pages, search cards, the two cloud/view intent landings, and `/verified`. Search loads current Cloud/Road summaries in fixed batches for the current result page. Approved Phase 2 media remains distinct from Verified Standard evidence: approval allows public use, but a current verification record and explicit evidence link are still required for any verification badge.

Approved `panorama_360` media now uses a small client component that requests the large panorama only after activation and supports touch/drag, keyboard panning, an original-image link, and failure/no-JavaScript fallback. It deliberately avoids a new heavy rendering dependency; this Phase 4 implementation is a horizontally pannable equirectangular presentation rather than a WebGL spherical projection.

Indexing safety remains unchanged. `/verified` is emitted in the sitemap only when the existing explicit final-brand-domain policy enables indexing. Temporary `*.vercel.app` deployments remain usable but `noindex,nofollow` with crawling blocked.

## Legacy Phase 5 pricing

Phase 5 adds a Stay-owned pricing domain with `rate_plans` and `room_rate_rules`. Plans group business rules per property; each rule prices one room type in integer VND. PostgreSQL constraints and triggers enforce valid date ranges, non-negative whole-VND amounts, bounded priorities, special-rate date ranges, VND-only currency, room/plan ownership, and an effective date intersection for every active rule. Open-ended and partial overlaps are valid; inactive disjoint rules can be prepared but are flagged as non-effective. Owner-link triggers prevent later property moves from invalidating ownership. No price rows are seeded.

Price verification validity follows the Vietnam calendar. If both verification fields exist, `price_valid_until` cannot precede `(price_verified_at at time zone 'Asia/Ho_Chi_Minh')::date`; Zod/Admin and PostgreSQL enforce the same rule. A rule without `price_verified_at` is still a permitted reference price, preserving the Phase 5 confidence model.

The application resolver enumerates lodging nights as calendar dates in `[check_in, check_out)`. Monday–Thursday are weekday nights and Friday–Sunday are weekend nights unless a rule explicitly supplies ISO weekday numbers. Applicable rules resolve by rate-type precedence (`override > holiday > peak > weekend > weekday`), then higher rule priority, then higher plan priority. More than one rule at the winning effective priority is a visible conflict even when the stored prices match; no row order is used as a tiebreaker.

Every successful quote contains currency, per-night source/rule facts, subtotal, zero discount/fees placeholders, total, confidence, and pricing policy version `phase5-v1`. Extra-adult and extra-child values can be stored, but the resolver deliberately does not add them until a later occupancy model defines base versus extra occupancy. JavaScript sums bounded integers only; no floating-point money is stored or calculated.

Public pricing uses the anonymous client, a `security_invoker` allow-listed view, base-table RLS, and one bounded batch query for the current room IDs/date range. It exposes active rules only from active/published plans attached to public rooms/properties. It excludes plan names/descriptions, internal notes, staff IDs, and audit fields. The public application never needs a service-role key.

Search, property, and room pages show no generic invented “from” price. Without dates they ask the customer to choose dates. With valid dates, they show a complete recorded quote only when every night resolves without conflict and state that availability still needs direct confirmation. `/admin/rates` provides property/room/plan/type filters, plan/rule management, stale/gap/overlap warnings, and nightly preview. Core price records are deactivated or archived rather than deleted.

Price and availability remain separate domains. Phase 5 contains no inventory, holds, blocks, room availability, or bookings. Phase 6 is responsible for availability and must consume pricing without changing Phase 5 night/date semantics.

## Legacy Phase 6 room inventory and availability

Phase 6 adds one latest-state `room_inventory` row per room type and lodging-night date. `available_quantity` is the number of sellable units for that night; it is separate from the physical `room_types.quantity`, cannot be negative, and cannot exceed that physical capacity. A room type cannot later be reduced below any recorded inventory. The unique room/date key, database validation, and one-transaction bulk RPC provide a safe row shape for a future booking phase to lock, but legacy Phase 6 creates no booking, hold, customer, payment, or decrement workflow.

Availability reuses the pricing calendar contract `[check_in, check_out)`. The pure resolver requires every lodging night and the requested room count. Fresh facts under six hours are `live`; facts from six through 24 hours are `verified_today`; facts older than 24 hours need confirmation; missing, invalid, or future-dated facts are unknown. A current quantity below the request is sold out, while a stale zero is only a prompt to reconfirm. A complete stay resolves current sold-out first, then unknown, stale, same-day verified, and live. Public code never falls back to physical quantity or price.

Public inventory is read through a `security_invoker` allow-listed view backed by RLS. Only active published rooms and properties are visible, and anonymous users receive no inventory mutation privilege or staff/audit columns. Search can optionally keep only currently confirmed room types and otherwise ranks current availability ahead of stale, unknown, and sold-out states while preserving established relevance within each group. Property and room pages resolve each room type independently; price and availability remain visually and logically separate.

`/admin/availability` lets authorized staff select a property and room, inspect a 14-night warning horizon, and atomically upsert one through 365 inclusive lodging-night dates. Normal saves use the current timestamp. Manual inputs support partner, Admin, and import sources; `booking_engine` is reserved in the database contract for a later automated integration. The optional integer-VND inventory override is stored for future audited integration and is excluded from public reads; Phase 5 remains the only active public price resolver.

## V2 roadmap boundary

The V2 roadmap begins from the completed legacy foundation; it does not rename or replay migrations 001–008. Destination/exact-room alignment comes first, followed only in separately authorized phases by verified exact-room profiles, supplier/partner foundations, private commercial economics, motorbike service integration, packages, recommendations, unified booking, payment, trip operations, transport/add-ons, growth, and multi-destination hardening.

## Future Biker relationship

Tà Xùa Biker remains a separate repository, database, Auth boundary, deployment, and source of truth for motorbike fleet/rental operations. Stay must never query the Biker database directly or share a service-role key. A future V2 motorbike service adapter may use a safe API, signed server-to-server call, manual confirmation, webhook, or opaque external reference. Stay may record its own booking-item/external-confirmation state, but it must not copy fleet ownership or claim a Biker reservation without confirmation from Biker operations.
