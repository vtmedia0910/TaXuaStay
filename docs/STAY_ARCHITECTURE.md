# Tà Xùa Stay architecture

## System boundary

Tà Xùa Stay is a new, independent accommodation application. Tà Xùa Biker is a technical reference only; it is not a package, API, database, authentication, storage, or deployment dependency.

Stay must have separate infrastructure:

- GitHub repository
- Supabase project, PostgreSQL database, Auth, and Storage
- Vercel project
- environment variables and secrets
- staff accounts, operations, and customer data

No production database or customer data is shared with Biker.

## Phase 0 baseline

The audited baseline contains the generic Next.js App Router, React, Tailwind CSS, Supabase SSR client factories, Admin authorization primitives, reusable UI components, and Vitest infrastructure.

If Stay Supabase variables are absent, public pages remain available and the Admin login explains that configuration is required instead of crashing.

## Phase 1 database and authorization foundation

Phase 1 adds one clean Stay migration with:

- a singleton `public.site_settings` table;
- role helpers that read only `auth.jwt() -> 'app_metadata' ->> 'role'`;
- `admin` and `staff` access to the protected Admin shell;
- an admin-only settings update path enforced in the UI, Server Action, and RLS;
- explicit public column grants and a public settings projection that exclude `updated_by`;
- safe public fallback content when Supabase is unavailable.

No service-role key is used by the public settings flow. Anonymous users cannot access Admin. Staff users can access the shell but cannot open or update admin-only settings.

The Phase 1 migration deliberately contains no property, room, rate, availability, customer, booking, fleet, or rental tables. Cross-product referral settings described for a later roadmap phase are also deferred.

## Phase 2 accommodation content domain

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

## Phase 3 room-first search and SEO

Phase 3 adds `/tim-phong` as the primary discovery route. Search begins with public room types and joins only public-safe property facts. URL state preserves dates, adults, children, requested rooms, supported property/room/access/facility filters, and the current page. Dates and requested room count are context only: Phase 3 does not query inventory, compare against physical `quantity`, or claim availability.

The search data layer uses the anonymous Supabase client and existing RLS. It performs one paginated room/property query followed by a fixed batch of room/property amenity and approved-media queries for the current page, avoiding per-card N+1 requests. Public search DTOs exclude lifecycle fields, audit IDs, physical quantity, verification placeholders, prices, and future booking data.

Seven intent landing pages reuse deterministic current facts for homestay, basic mountain/valley view, two-guest room needs, group capacity, confirmed car access plus parking, and hotel property type. Cloud/view pages explicitly remain pre-Phase 4 and do not claim Cloud View Verified. Search filter combinations canonicalize to `/tim-phong` and are `noindex,follow` once brand-domain indexing is enabled; each landing page has its own canonical.

Indexing is environment-aware. A valid explicit HTTPS brand domain in `NEXT_PUBLIC_SITE_URL` enables normal public indexing. Local hosts, technical `*.vercel.app` hosts, and deployments that rely only on `VERCEL_PROJECT_PRODUCTION_URL` remain usable but emit public `noindex` metadata; `robots.ts` blocks crawling and does not advertise the sitemap. The sitemap route still builds and contains public static routes plus RLS-visible property and room URLs, falling back to static routes if Supabase is unavailable. Property JSON-LD uses factual `LodgingBusiness`/`Hotel` fields only and omits ratings, reviews, prices, and availability.

No runtime call site requires a service-role client. The tracked environment template contains only the final canonical URL and the two public Supabase variables. Any existing `SUPABASE_SERVICE_ROLE_KEY` in Vercel is unnecessary for the current application and should be removed by the owner.

## Phase 4 Verified Standard

Phase 4 adds an evidence-backed trust domain without marking any existing content verified automatically. `verification_records` owns lifecycle, target, method, internal notes, staff audit references, verification time, and expiry. Type-specific facts live in `cloud_view_verifications` and `road_verifications`; `verification_evidence` links each lifecycle record to existing exact-target `media_assets` through foreign keys.

Cloud View is authoritative only at room-type level. Seven constrained integer components total 100 points; generated PostgreSQL columns derive `total_points` and `score_10`, so Admin cannot enter a final marketing score. The score measures physical viewing-position characteristics, not clouds or weather probability. Current public Cloud records include direct view facts, selected approved evidence, verification date, and expiry.

Road Verified is property-level and uses A–D grades plus tri-state access, surface, difficult-section, rain, parking, and walking facts. A current, evidence-backed Road record takes display precedence over Phase 2 preliminary access facts. It does not overwrite those preliminary facts, so expiry cleanly restores the original fallback instead of presenting a stale verified snapshot as preliminary data.

Public reads go through explicit current-only views and field allowlists. A badge requires `status = verified`, a future expiry, a public property/room, and at least one approved public evidence link. Anonymous users cannot see lifecycle method, internal notes, staff IDs, pending/rejected records, or private evidence and cannot mutate verification tables. Staff/admin writes use RLS plus atomic transaction RPCs. The sole new `SECURITY DEFINER` helper is a fixed-search-path boolean used to avoid recursive RLS while evaluating public eligibility; its execute grant is limited to the roles that query public verification data.

Public Phase 4 surfaces are the room and property pages, search cards, the two cloud/view intent landings, and `/verified`. Search loads current Cloud/Road summaries in fixed batches for the current result page. Approved Phase 2 media remains distinct from Verified Standard evidence: approval allows public use, but a current verification record and explicit evidence link are still required for any verification badge.

Approved `panorama_360` media now uses a small client component that requests the large panorama only after activation and supports touch/drag, keyboard panning, an original-image link, and failure/no-JavaScript fallback. It deliberately avoids a new heavy rendering dependency; this Phase 4 implementation is a horizontally pannable equirectangular presentation rather than a WebGL spherical projection.

Indexing safety remains unchanged. `/verified` is emitted in the sitemap only when the existing explicit final-brand-domain policy enables indexing. Temporary `*.vercel.app` deployments remain usable but `noindex,nofollow` with crawling blocked.

## Planned domains

Later phases may introduce these independent Stay domains, one reviewed phase at a time:

- properties
- rooms
- rates
- availability
- stay bookings
- weather and cloud forecast
- imports

These names document direction only. Phase 4 adds verification over the Phase 2 content and Phase 3 discovery domains; rates, availability, bookings, weather, imports, and referrals remain deferred.

## Future Biker relationship

Any future Biker integration should use an external referral or deep link with an opaque, non-sensitive reference unless the architecture is explicitly redesigned and reviewed. Stay must not create Biker rental records, transmit customer PII in query strings, or treat Biker as its source of truth.
