# Tà Xùa Trip / Stay architecture

## System boundary

The TaXuaStay repository is the independent technical and infrastructure boundary for the existing verified accommodation application. Under Master Plan V2.1, that foundation becomes the `Stay` domain and future `/stay` accommodation vertical of **Tà Xùa Trip**, the consumer master brand and Verified Local Travel platform.

The public shell is now the Tà Xùa Trip master-brand experience with Lưu trú under canonical `/stay`. The repository and database remain the independent Stay technical boundary.

Stay must have separate infrastructure:

- GitHub repository
- Supabase project, PostgreSQL database, Auth, and Storage
- Vercel project
- environment variables and secrets
- staff accounts, operations, and customer data

No production database or customer data is shared with Biker.

## Source of truth and phase numbering

`docs/TA_XUA_STAY_CODEX_MASTER_PLAN.md` contains Master Plan V2.1 and is the sole canonical roadmap. It supersedes the former accommodation-oriented 11-phase plan and earlier V2 direction wherever they conflict. Migrations 001–008 and the existing `PHASE_1` through `PHASE_6` documents remain immutable/factual records of the **Legacy Foundation Completed**.

New work uses a separate numbering sequence: **V2 Phase 1**, **V2 Phase 2**, and so on. An old Phase 1 is never the same thing as V2 Phase 1.

Brand and naming layers are distinct:

```text
Master brand          Tà Xùa Trip
Consumer taxonomy     Lưu trú
SEO/search language   Homestay Tà Xùa
Technical domain      Stay
Technical namespace   /stay
```

**V2 Phase 2.5 — Master Brand + Public UX Migration** is implemented at application level with no database migration. **V2 Phase 2.6 — CMS, Media & Content Operations** is implemented with migrations 011–014, **V2 Phase 2.6H — CMS Admin UX + Publishing Hardening** with migration 015, and **V2 Phase 3 — Supplier + Partner Foundation** with migration 016. Historical routes remain compatibility pages with `/stay` canonicals. V2 Phase 4 has not started and requires a separate owner task.

## Currently implemented — legacy foundation completed

The current repository actually implements:

- site settings, Supabase Auth, `admin`/`staff` authorization, and the protected Admin shell;
- properties, `room_types`, amenities, and evidence-aware property/room-type media;
- verification lifecycle, Cloud View, Road Verified, verification evidence, and the 360 viewer;
- room-type rate plans/rules, deterministic integer-VND pricing, and price confidence;
- pooled room-type inventory, freshness-aware availability, and Admin bulk updates;
- room-first public search, intent landing pages, metadata, sitemap, robots, and temporary-host indexing safety.
- a published Tà Xùa Destination, required property destination ownership, stable physical-room identity, and exact-room-compatible media/verification targets;
- Verified Room Profile V2 with independent Room Quality dimensions, factual strengths/caveats, and richer exact-room presentation.
- structured website copy/media operations with protected preview, atomic page publish and public-safe fallbacks.
- private Supplier identities, normalized contacts, historical many-to-many Property links, Partner relationship lifecycle/tier, and immutable external-system references.

There is currently no private commercial economics, generic service catalog, package commerce, unified trip booking, booking items, payment, bus inventory, supplier confirmation workflow, or Trip Dashboard.

## V2 accommodation hierarchy — Phase 1 implemented

The accommodation hierarchy now exists additively:

```text
Destination
    ↓
Property
    ↓
Room Type (commercial / pooled category)
    ↓
Physical Room (stable Room ID / exact unit)
```

The future Tà Xùa Trip commerce flow is:

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

`room_types` remains the commercial category for current pricing and pooled inventory. `physical_rooms` represents a known real unit with an immutable uppercase `room_code`; no rows are inferred from `room_types.quantity`. Media has exactly one owner among property, room type, and physical room. Room, Cloud View, and 360 verification may target either a room type or a physical room, never both. Historical room-type records remain unchanged.

An exact physical room is publicly identified as verified only when its own active/published row has a current `room` verification and approved evidence owned by that same physical room. `exact_room_bookable` means only that operations may accept a request for the named Room ID; it is not availability, assignment, a guarantee, or verification. Internal `position_notes` and audit fields are not public.

The target product combines **VERIFY**, **BUNDLE**, **OPERATE**, and **DISTRIBUTE**. Existing room-type pricing, pooled inventory, search, SEO, and Verified Standard remain valid foundations while later V2 phases introduce further domains one reviewed step at a time.

## V2 Phase 2 — Verified Room Profile implemented

Migration 010 adds `room_quality` to the shared verification lifecycle, normalized `room_quality_assessments`, and ordered `room_profile_notes`. Assessments target exactly one room type or physical Room ID, use integer 0–100 dimension values, have no overall score, and never alter Cloud View. Null dimensions remain unknown. Freshness is centralized per dimension: cleanliness 90 days; Wi-Fi/heating/hot water/comfort six months; soundproof/bathroom/Room Accuracy twelve months.

Exact Room Verified now resolves centrally to verified/expired/needs-review/not-verified and still requires a published Room ID, current exact-target `room` verification, and approved evidence owned by the same physical room. `exact_room_bookable` remains outside verification. The room-type page batches room-type and exact-room quality, notes, Cloud View, and evidence without creating physical-room SEO routes.

Anonymous users can read only current public quality and explicitly public notes through allow-listed views backed by RLS. Internal assessment notes, private profile notes, staff IDs, lifecycle method, and private evidence remain protected. `/admin/verification` manages Room Quality lifecycle/assessment data and `/admin/room-profiles` manages strengths/caveats.

## V2 Phase 2.6 — CMS, Media & Content Operations implemented

Migration 011 adds `cms_pages`, `cms_sections`, `cms_section_items` and website-only `cms_media_assets`. Draft fields remain private while one atomic RPC copies the full normalized page into explicit `published_*` snapshots. Public `security_invoker` views and column grants expose only current published content and referenced active media; audit users, draft values and anonymous mutations remain protected by grants plus RLS. Corrective migration 012 adds only the two view-filter column privileges required for `status` and `is_active`; migration 013 limits Storage deletion to orphan objects; migration 014 revokes direct CMS table deletes. Phase 2.6H migration 015 makes publish/page archive/media archive admin-only at the DB boundary, protects published snapshot columns with lifecycle triggers, and adds transactional staff/admin reorder RPCs that normalize sort values to deterministic multiples of ten.

The public `site-content` Storage bucket accepts only JPEG, PNG, WebP and AVIF up to 10 MB in fixed website folders. Staff/admin writes use the authenticated user and Storage RLS, never a service-role client. Every media row requires alt text, focal point and exactly one Storage path or external HTTPS URL. Image dimensions are detected from bounded server-side file-header parsing rather than accepted from form input. Archive is admin-only and blocked while any draft or published reference remains. Existing accommodation/evidence `media_assets` are unchanged and separate.

Homepage, Stay intro/SEO and footer copy read published CMS content with approved code fallbacks. Operational facts — rooms, evidence, verification, Cloud View, prices and availability — remain live domain queries rather than copied CMS values. Editors control SEO title/description/OG media only; canonical, robots, sitemap, schema and staging noindex remain code-owned. Publishing revalidates the affected public/Admin paths so content changes do not require a redeploy.

The Admin editor presents collapsed, named section cards, a page outline, context-specific fields, visual media selection and clear draft/public state. Staff may edit/save/upload/preview but not publish or archive; admins own lifecycle transitions. The media library uses a bounded server query, filters, pagination, usage references, automatic dimensions and an accessible visual focal-point picker.

See `docs/V2_PHASE_2_6_CMS_MEDIA_CONTENT_OPS.md` and `docs/V2_PHASE_2_6H_CMS_ADMIN_UX_HARDENING.md` for the data contract, role boundary and operating workflow.

## V2 Phase 3 — Supplier + Partner Foundation implemented

Migration 016 adds a private supply-side domain without changing public accommodation DTOs. `suppliers` holds stable immutable `SUP-...` operational codes and a lifecycle that supports accommodation, motorbike, bus, transport, activity, food, guide, and other providers. `supplier_contacts` normalizes private operational contacts and requires at least one phone/email/Zalo method. `supplier_properties` links Suppliers to Properties many-to-many with explicit roles and dated history; it does not add `properties.supplier_id`.

`partner_relationships` is a separate Trip-to-Supplier lifecycle. Its standard/verified/preferred/cloud_partner/exclusive tier is private and commercial/relational only. It never changes verification, Cloud View, Room Quality, Road Verified, price confidence, availability, or public ranking. `supplier_external_refs` stores only immutable opaque external identities and bounded non-secret metadata, preparing a future adapter without Biker database access or copied fleet/rental data.

All five tables use RLS, explicit authenticated grants, audit fields, and zero anonymous access. Staff can manage operational contacts and Property links; Admin owns Supplier lifecycle, Partner relationship/tier, external references, and archive. Critical saves and archive closure use `security invoker` transaction RPCs. `/admin/suppliers` provides the private workflow, while Property Admin shows only an authenticated summary. No Supplier/Partner data is published or merged into CMS.

See `docs/V2_PHASE_3_SUPPLIER_PARTNER_FOUNDATION.md` for schema, lifecycle, role, privacy, trust, Biker, and Phase 4 boundaries.

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
- `media_assets` for HTTPS photo, video, and panorama evidence, originally linked to exactly one property or room type and extended by V2 Phase 1 to support one physical-room owner as a third exclusive option.

Anonymous users can read only active/published properties and rooms, active amenities assigned to those records, and media assets explicitly reviewed for public display. Public application queries use field allowlists and exclude internal user/audit identifiers. Authenticated `admin` and `staff` users can manage this content through protected Server Actions, with RLS as the database backstop. Core records use archival/deactivation rather than default hard deletion.

Public Phase 2 routes are:

- `/homestay/[slug]`
- `/homestay/[slug]/phong/[roomSlug]`

These historical entity routes remain compatible. Canonical public routes are `/stay`, `/stay/[slug]`, and `/stay/[slug]/[roomSlug]`; internal links and sitemap use the canonical namespace.

Phase 2 media approval means only that an individual asset was reviewed for public display. It does not represent the future Tà Xùa Stay Verified Standard, Cloud View score, Road Verified status, or complete verification workflow.

The Phase 2 corrective migration models `car_access`, `motorbike_access`, and `parking` as explicit `unknown` / `yes` / `no` facts. Existing affirmative values remain `yes`; legacy false values become `unknown` because the old boolean could not prove a negative. Physical room `quantity` remains an Admin fact and is not granted or selected for anonymous pages. Property/room content and amenity replacement now execute in one PostgreSQL RPC transaction so an assignment failure rolls the content mutation back.

## Legacy Phase 3 room-first search and SEO

Legacy Phase 3 added `/tim-phong`; V2 Phase 2.5 exposes the same search at canonical `/stay` while keeping `/tim-phong` functional. Search begins with public room types and joins only public-safe property facts. URL state preserves dates, adults, children, requested rooms, supported property/room/access/facility filters, and the current page.

The search data layer uses the anonymous Supabase client and existing RLS. It performs one paginated room/property query followed by a fixed batch of room/property amenity and approved-media queries for the current page, avoiding per-card N+1 requests. Public search DTOs exclude lifecycle fields, audit IDs, physical quantity, verification placeholders, prices, and future booking data.

Seven intent landing pages reuse deterministic current facts for homestay, view, two-guest room needs, group capacity, confirmed car access plus parking, and hotel property type. Search filter combinations canonicalize to `/stay` and are `noindex,follow` once brand-domain indexing is enabled; each landing page has its own canonical.

Indexing is environment-aware. A valid explicit HTTPS brand domain in `NEXT_PUBLIC_SITE_URL` enables normal public indexing. Local hosts, technical `*.vercel.app` hosts, and deployments that rely only on `VERCEL_PROJECT_PRODUCTION_URL` remain usable but emit public `noindex` metadata; `robots.ts` blocks crawling and does not advertise the sitemap. The sitemap route still builds and contains public static routes plus RLS-visible property and room URLs, falling back to static routes if Supabase is unavailable. Property JSON-LD uses factual `LodgingBusiness`/`Hotel` fields only and omits ratings, reviews, prices, and availability.

No runtime call site requires a service-role client. The tracked environment template contains only the final canonical URL and the two public Supabase variables. Any existing `SUPABASE_SERVICE_ROLE_KEY` in Vercel is unnecessary for the current application and should be removed by the owner.

## Legacy Phase 4 Verified Standard

Phase 4 adds an evidence-backed trust domain without marking any existing content verified automatically. `verification_records` owns lifecycle, target, method, internal notes, staff audit references, verification time, and expiry. Type-specific facts live in `cloud_view_verifications` and `road_verifications`; `verification_evidence` links each lifecycle record to existing exact-target `media_assets` through foreign keys.

Legacy Cloud View remains valid at room-type level. V2 Phase 1 additionally permits new Cloud View records for one exact physical room; it does not migrate, average, overwrite, or reinterpret historical room-type records. Seven constrained integer components total 100 points; generated PostgreSQL columns derive `total_points` and `score_10`, so Admin cannot enter a final marketing score. The score measures physical viewing-position characteristics, not clouds or weather probability.

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

The V2.1 roadmap begins from the completed legacy foundation; it does not rename or replay migrations 001–008. Destination/exact-room alignment is migration 009, Verified Room Profile migration 010, brand/UX V2 Phase 2.5, website operations migrations 011–014, CMS hardening migration 015, and Supplier/Partner foundation migration 016. Only separately authorized later phases may add private commercial economics, motorbike service integration, services, packages, recommendations, unified booking, payment, trip operations, transport/add-ons, growth, and multi-destination hardening.

## Future Biker relationship

Tà Xùa Biker remains a separate repository, database, Auth boundary, deployment, and source of truth for motorbike fleet/rental operations. Trip/Stay must never query the Biker database directly or share a service-role key. A future V2 motorbike service adapter may use a safe API, signed server-to-server call, manual confirmation, webhook, or opaque external reference. Trip may later record its own booking-item/external-confirmation state, but it must not copy fleet ownership or claim a Biker reservation without confirmation from Biker operations.
