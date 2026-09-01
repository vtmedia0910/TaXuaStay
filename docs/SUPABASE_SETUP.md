# Stay Supabase setup

Use only the dedicated Tà Xùa Stay Supabase project. Never link this repository or its CLI to the Biker project.

## Current remote status

Verified again on 2026-09-01 against the dedicated Supabase project returned by the CLI as `TaXuaStay`, project ref `kkrtajdgkinybpwermls`. The repository is linked through Supabase CLI metadata under the gitignored `supabase/.temp/` directory; no credentials or tracked `supabase/config.toml` were added.

Supabase CLI `2.116.0` was used through an ephemeral `npx` workflow, so the application dependencies were not changed. Remote migration history is reconciled and contains these migrations in order:

```text
202608290001
202608290002
202608290003
202608290004
202608290005
202608290006
202608290007
202608290008
202608290009
202608290010
202608290011
202608290012
202608290013
202608290014
202608290015
202608290016
202608290017
202608290018
202608290019
202608290020
202608290021
202608290022
202608290023
202608290024
202608290025
202608290026
202608290027
202608290028
202609010029
202609010030
202609010031
202609010032
```

After V2 Phase 11, `migration list` must report 001–032 Local = Remote. Never reuse this link metadata for Biker or change the project ref without first verifying the target project identity.

## V2 migration lineage

Migrations 001–008 are the **Legacy Foundation Completed**. They remain immutable production lineage. Master Plan V2.1 restarts product phase numbering, not database history.

Migration `202608290009_v2_destination_and_physical_rooms.sql` is **V2 Phase 1 — Architecture Alignment**. Migration `202608290010_v2_verified_room_profile.sql` is **V2 Phase 2 — Verified Room Profile**. It adds Room Quality, factual strengths/caveats, and stronger exact-room resolution without changing pricing, pooled availability, search, Road Verified, or the Cloud View rubric.

**V2 Phase 2.5 — Master Brand + Public UX Migration** is complete without a database migration. Migrations 011–014 implement **V2 Phase 2.6 — CMS, Media & Content Operations**. Migration 015 implements **V2 Phase 2.6H**. Migration `202608290016_v2_supplier_partner_foundation.sql` implements **V2 Phase 3** with private Suppliers, contacts, Property relationships, Partner lifecycle/tier, external references and zero anonymous access. Corrective migration `202608290017_harden_supplier_lifecycle.sql` implements **V2 Phase 3H**. Migrations `202608290018_v2_commercial_economics.sql`, `202608290019_harden_commercial_function_grants.sql` and `202608290020_restore_authenticated_relationship_predicate.sql` implement the private accommodation **V2 Phase 4 — Commercial Economics** foundation and narrow function-ACL corrections. Migration `202608290021_v2_motorbike_integration.sql` implements **V2 Phase 5 — Motorbike Integration** as a bounded manual/reference catalog with no Biker runtime/database dependency and no seeded offering. Corrective migration `202608290022_fix_motorbike_public_ordering.sql` preserves immutable 021 and appends `sort_order` to the public view required by the adapter's stable ordering query. Migration `202608290023_v2_package_commerce.sql` implements **V2 Phase 6 — Package Commerce** with generic ROOM/MOTORBIKE/CUSTOM composition, explicit Package sell-price authority, private economics, public-safe projections, and no Booking/Payment domain or seeded Package.

Migration `202608290024_v2_unified_booking_supplier_confirmation.sql` implements **V2 Phase 8 — Unified Booking + Supplier Confirmation**. Corrective migration `202608290025_fix_phase8_booking_code_generation.sql` resolves pgcrypto from Supabase's managed, non-writable `extensions` schema after linked DB lint; corrective migration `202608290026_fix_phase8_selected_component_aggregation.sql` makes every traveler-selected Package component participate in confirmation aggregation. Applied migrations remain immutable. Together they add private Bookings, immutable Booking Items/snapshots, separate item confirmations and append-only events. Anonymous users have no table access; only bounded creation and tokenized safe-status RPCs are executable. No Payment, Deposit, Checkout, Refund, Settlement or hold table is created, and no production Booking/customer row is seeded.

Migration `202608290027_v2_booking_operations_checkout_readiness.sql` implements **V2 Phase 9 — Booking Operations + Checkout Readiness**. It adds versioned immutable quote history, versioned provider-neutral deposit/cancellation policies, deterministic `phase9-checkout-readiness-v1`, and checkout preparation sessions bound to quote/policy versions. Volatility-only corrective migration `202608290028_fix_phase9_deposit_function_volatility.sql` matches the table-free JSON calculator to PostgreSQL's linked-lint `STABLE` classification without changing behavior. All tables are private behind RLS; the tokenized public status RPC exposes only a safe readiness projection. Provider state is constrained to `unconfigured`. No payment credential, provider intent, QR/link, webhook, payment transaction, paid state, refund, payout or settlement is added, and no production row is seeded.

Migration `202609010033_v2_supplier_telegram_integration.sql` implements **V2 Phase 12 — Supplier Communication Automation + Telegram Integration**. It adds private Supplier/group mappings, staff assignments, hash-only connection codes, transactional outbox, update receipts, opaque callback actions and sanitized delivery logs. Anonymous direct table access remains denied; only capability-scoped connect/command/callback RPCs are executable. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` are server-only Vercel variables and are never database values. Supabase runtime remains Publishable-key-only. No production Supplier group, Booking or message fixture is seeded.

Migration `202609010029_phase10_my_trip_verification_projection.sql` narrowly extends the existing token-gated public Booking projection with four customer-safe verification labels derived only from immutable Booking Item snapshots. Migration `202609010030_v2_trip_operations_hardening.sql` implements **V2 Phase 11 — Trip Operations Hardening + System Administration** with private controlled change requests, append-only confirmation history, item lineage, deterministic aging/expiry Operations RPCs and strict RLS. Additive migration 031 fixes lint-discovered motorbike alias/package-lifecycle resolver definitions and volatility; additive migration 032 fixes table-specific trigger-field resolution discovered by rollback smoke. It creates no payment or AI state and seeds no production data.

## Migration order

Apply only missing Stay migrations in filename order:

```text
supabase/migrations/202608290001_stay_foundation.sql
supabase/migrations/202608290002_properties_rooms_amenities_media.sql
supabase/migrations/202608290003_harden_phase2_accommodation.sql
supabase/migrations/202608290004_verified_standard.sql
supabase/migrations/202608290005_harden_phase4_verification.sql
supabase/migrations/202608290006_rate_plans_and_pricing.sql
supabase/migrations/202608290007_harden_phase5_pricing.sql
supabase/migrations/202608290008_room_inventory_and_availability.sql
supabase/migrations/202608290009_v2_destination_and_physical_rooms.sql
supabase/migrations/202608290010_v2_verified_room_profile.sql
supabase/migrations/202608290011_v2_cms_media_content_operations.sql
supabase/migrations/202608290012_fix_cms_public_view_grants.sql
supabase/migrations/202608290013_harden_cms_storage_delete.sql
supabase/migrations/202608290014_enforce_cms_archive_lifecycle.sql
supabase/migrations/202608290015_harden_cms_publishing_permissions.sql
supabase/migrations/202608290016_v2_supplier_partner_foundation.sql
supabase/migrations/202608290017_harden_supplier_lifecycle.sql
supabase/migrations/202608290018_v2_commercial_economics.sql
supabase/migrations/202608290019_harden_commercial_function_grants.sql
supabase/migrations/202608290020_restore_authenticated_relationship_predicate.sql
supabase/migrations/202608290021_v2_motorbike_integration.sql
supabase/migrations/202608290022_fix_motorbike_public_ordering.sql
supabase/migrations/202608290023_v2_package_commerce.sql
supabase/migrations/202608290024_v2_unified_booking_supplier_confirmation.sql
supabase/migrations/202608290025_fix_phase8_booking_code_generation.sql
supabase/migrations/202608290026_fix_phase8_selected_component_aggregation.sql
supabase/migrations/202608290027_v2_booking_operations_checkout_readiness.sql
supabase/migrations/202608290028_fix_phase9_deposit_function_volatility.sql
supabase/migrations/202609010029_phase10_my_trip_verification_projection.sql
supabase/migrations/202609010030_v2_trip_operations_hardening.sql
supabase/migrations/202609010031_fix_phase11_operational_resolvers.sql
supabase/migrations/202609010032_fix_phase11_booking_touch_trigger.sql
```

Migration 023 adds the Phase 6 `packages`, `package_components`, and `package_price_rules` domain. Verify additionally:

1. `public_packages` is anonymously readable and contains only current published Packages attached to a public Destination with meaningful components and no inactive required structured source.
2. Sanitized component/price functions return only allow-listed public facts; anonymous users cannot read component costs, Package economics, internal notes, rule IDs, Supplier/Partner facts, external-reference metadata, or audit identities.
3. Anonymous and staff users cannot mutate Package aggregates; Admin uses the atomic `save_package_commerce` RPC.
4. Published Packages require at least one meaningful component and a non-instant confirmation mode. Missing Room, media, approved HTTPS request URL, or active current Package price authority remains an explicit Admin warning and produces a truthful degraded public state instead of invented data.
5. ROOM sources belong to the same Destination and reuse Stay pricing/availability/economics. MOTORBIKE sources are valid Phase 5 offerings only. CUSTOM remains manual; inactive future component types are rejected.
6. Package price is an explicit integer-VND total with dated authority and deterministic precedence. The public resolver never manufactures component sums, discounts, savings, or `giá từ`.
7. Private Package cost remains null when any selected component lacks authoritative current cost; contribution and margin stay private.
8. CMS media referenced by a non-archived Package cannot be archived.
9. No Package, component, price, availability, Room, motorbike, customer, booking, hold, payment, or discount row is seeded.

The 2026-08-31 post-023 remote REST smoke returned HTTP 200 with exact count zero for the allow-listed `public_packages` projection and the RLS-filtered safe Package base columns. Sanitized component and price RPCs returned HTTP 200 with empty arrays. Anonymous reads of Package internal notes, component costs, price-rule internal notes, Supplier contacts, and motorbike source mappings, plus anonymous Package mutation, each returned HTTP 401. Existing public Room Type and motorbike projections remained HTTP 200 with their pre-existing exact zero production counts. Migrations 001–023 were Local = Remote. Linked database lint reported no Phase 6 schema errors; its only output was the two pre-existing CMS reorder warnings about the local loop variable `position`. The rollback-only transaction fixture is `supabase/tests/202608290023_package_commerce.sql`; the CLI still attempted to require Docker Desktop even with `supabase test db --linked`, so the executed security checks are the remote REST smoke plus automated migration/schema/resolver tests.

Migrations 021–022 add the Phase 5 `motorbike_offerings` projection, explicit anonymous public view/column grants and ordering contract, Admin-only transactional save, CMS media lifecycle guard, and child-first Supplier archive extension. Verify additionally:

1. `public_motorbike_offerings` is anonymously readable and contains only published rows attached to an active motorbike Supplier and active `taxua_biker` reference.
2. Anonymous users cannot select Supplier/reference IDs, external-reference values, internal notes, audit IDs, Supplier contacts, Partner facts or Commercial Economics through the motorbike path.
3. Anonymous and staff users cannot mutate offerings; Admin can use `/admin/motorbike` and `save_motorbike_offering`.
4. Published rows require an approved HTTPS manual-confirmation URL and non-future source freshness; price snapshots are optional but all-or-none and integer VND.
5. The public application never maps listed or priced to live availability; only needs-confirmation, unknown and unavailable states exist.
6. An active CMS asset referenced by a non-archived offering cannot be archived.
7. Supplier archive closes offerings before the external reference and parent, atomically, while preserving Phase 4 economics behavior.
8. No production Supplier, external reference, bike, price, availability, customer, booking or payment row is seeded.

The 2026-08-31 post-022 remote REST smoke returned HTTP 200 for `public_motorbike_offerings` when selecting and ordering by `sort_order`, plus HTTP 200 for the allow-listed motorbike base columns, with zero public rows because no production bike was seeded. Anonymous requests for offering internal notes, Supplier contacts, private commercial plans/rules, and offering mutation each returned HTTP 401. Migrations 001–022 were Local = Remote. Linked database lint reported no schema errors; its only output was the two pre-existing CMS reorder warnings about the local loop variable `position`. The rollback-only trigger/RLS fixture remains at `supabase/tests/202608290021_motorbike_integration.sql`; the current host could not invoke Supabase pgTAP because Docker Desktop is unavailable, so the remote HTTP smoke plus automated schema/migration tests are the executed security checks.

Never reapply or edit a migration already present remotely. Migration `202608290003` is the additive corrective migration that preserves immutable migration `202608290002`; migration `202608290004` adds the normalized Verified Standard without seeding verification data; migration `202608290005` preserves immutable 004 while rejecting future/expired verified cycles, refreshing normal re-verification dates, and limiting anonymous Cloud/Road reads to public-view columns.

Migration `202608290006` adds rate plans and room rate rules without seed prices, inventory, availability, or bookings. Additive migration `202608290007` preserves immutable 006 and adds database backstops for Vietnam-calendar price-verification validity and effective overlap between active rules and their plans. It does not change RLS or grants. After applying Phase 5, verify additionally:

1. `rate_plans`, `room_rate_rules`, and `public_room_rate_rules` exist with RLS enabled on both base tables.
2. Anonymous selection of the allow-listed public view succeeds, but internal plan descriptions, rule notes, staff IDs, and audit fields are inaccessible.
3. Anonymous insert/update/delete attempts against both pricing tables are denied.
4. Draft/inactive plans, inactive rules, and pricing attached to draft/inactive rooms or properties are absent from anonymous reads.
5. Staff/admin can create and update plans/rules through `/admin/rates` without a service-role key.
6. No smoke-test production price rows are inserted. Schema/grant checks are sufficient when no real owner pricing exists.
7. A `price_valid_until` before the Vietnam calendar date of `price_verified_at` is rejected, including timestamps that cross the UTC/Vietnam day boundary.
8. Active rules with no plan-date overlap are rejected, and plan-date edits cannot strand existing active rules; inactive preparation rules may remain disjoint.

Migration `202608290008` adds latest-state room inventory without seeding production data or creating booking/customer/payment domains. After applying Phase 6, verify additionally:

1. `room_inventory` and `public_room_inventory` exist and RLS is enabled on the base table.
2. `(room_type_id, date)` is unique; quantity is non-negative and cannot exceed the room type's physical quantity.
3. Reducing a room type's physical quantity below recorded inventory is rejected.
4. Anonymous reads of the public view and allow-listed base columns succeed only for public rooms/properties; `updated_by`, audit timestamps, IDs, and `price_override_vnd` are denied.
5. Anonymous insert/update/delete is denied; authenticated staff/admin can use `set_room_inventory_range` without a service-role key.
6. The range RPC updates one through 365 inclusive lodging-night dates atomically and rejects a negative/excess quantity, invalid source, oversized range, or future verification timestamp.
7. The public view contains no rows for draft/inactive rooms or properties. Inventory for archived content may remain protected by RLS.
8. No smoke-test or example production inventory is inserted.

After `202608290003`, review every property whose access values became `unknown`. The migration deliberately converts legacy `true` to `yes` and legacy `false` to `unknown`; an old false value is not sufficient evidence for a customer-facing `no`.

After applying Phase 2, verify with separate anonymous, staff, and admin sessions:

1. Anonymous cannot insert, update, or delete any Phase 2 table.
2. Anonymous sees only active/published properties and rooms.
3. Draft/inactive records and unreviewed media return no rows anonymously.
4. Staff/admin can manage Phase 2 content through the Admin application.
5. Public queries cannot request `updated_by`, `captured_by_user_id`, or `verified_by_user_id`.
6. Anonymous cannot select physical `room_types.quantity`.
7. A failed property/room amenity assignment rolls back the corresponding content insert/update.

After applying Phase 4, verify additionally:

1. `public_verification_badges`, `public_cloud_view_verifications`, `public_road_verifications`, and `public_verification_evidence` return HTTP 200 to the anonymous REST role.
2. Anonymous selection of lifecycle `method`, internal `notes`, or `verified_by_user_id` is denied.
3. Anonymous has no insert/update/delete grant on verification tables.
4. A public badge requires a current verified record, a public target, and approved public evidence for the exact target.
5. Cloud/Road Admin saves commit lifecycle, specialized facts, and evidence together through the corresponding transaction RPC.
6. A future `verified_at` produces no public badge, Cloud View, Road Verified, or evidence; the exact start instant is eligible and the exact expiry instant is stale.
7. Anonymous reads of the Cloud/Road columns used by public views succeed, while internal columns such as `created_at`/`updated_at` are denied.
8. Re-verifying a review/expired record without custom dates creates a new timestamp and type-default expiry; intentional custom backdating requires a non-future start and future expiry.

The 2026-08-29 post-005 remote smoke test returned HTTP 200 for all four public views and for each allowed Cloud/Road base-table column. Anonymous requests for Cloud `created_at`, Road `updated_at`, lifecycle `method`, and a verification insert each returned HTTP 401. `supabase db lint --linked` reported no schema errors. No test rows were inserted.

The post-006 remote smoke test returned HTTP 200 for the allow-listed pricing view and allowed base-table columns. Anonymous reads of plan `description`/`created_by` and rule `internal_notes`/`updated_by`, plus zero-target update attempts on each pricing table, returned HTTP 401. The public pricing view returned an exact count of zero immediately after migration, confirming that no production price was seeded. Migrations 001–006 were Local = Remote and linked database lint reported no schema errors. No test row or price was inserted.

The post-007 remote smoke test preserved those boundaries: the public pricing view and both base tables' allow-listed columns returned HTTP 200; internal plan/rule columns and zero-target anonymous updates returned HTTP 401. The public pricing view still returned an exact count of zero, so the hardening added no price data. Migrations 001–007 were Local = Remote and linked database lint reported no schema errors. The migration preflight found no inconsistent existing verification dates or active disjoint rule/plan ranges.

The post-008 remote smoke test returned HTTP 200 for the inventory public view and the allow-listed base-table columns. Anonymous reads of `updated_by` and `price_override_vnd`, plus a zero-target anonymous update, returned HTTP 401. The public inventory view returned an exact count of zero, confirming that Phase 6 seeded no production availability. Migrations 001–008 were Local = Remote and `supabase db lint --linked` reported no schema errors. No test row was inserted.

Migration 009 was authored after a service-authorized read confirmed that production contained zero property rows. The migration therefore seeds only the published Tà Xùa destination, performs a safe no-op property backfill on production, and makes `properties.destination_id` required. It creates no physical-room, media, verification, price, inventory, booking, or demonstration rows.

The post-009 remote smoke test confirmed the Tà Xùa destination (`ta-xua`, `VN`, `Asia/Ho_Chi_Minh`) and zero properties with a null destination. `physical_rooms` contained exactly zero rows. Anonymous reads returned HTTP 200 for public destination fields, public physical-room fields, the exact-room public view, and the new media/verification FK fields. Requests for destination `updated_by` and physical-room `position_notes` returned HTTP 401; zero-target anonymous updates against both new base tables also returned HTTP 401. Migrations 001–009 were Local = Remote and `supabase db lint --linked` reported no schema errors. No smoke-test row was inserted.

After migration 010, verify additionally:

1. `room_quality_assessments` and `room_profile_notes` exist with RLS enabled, and the two allow-listed public views return HTTP 200.
2. Anonymous requests for `notes_internal`, `created_by`, or `updated_by`, plus zero-target mutations, are denied.
3. Public quality requires a current evidence-backed `room_quality` lifecycle record. Future, expired, pending, rejected, and review records do not appear as current.
4. Cleanliness becomes stale after 90 days; other dimensions follow the centralized six/twelve-month policy without displaying a stale numeric score as current.
5. Exact Room Verified still requires a current exact-target `room` verification and exact approved evidence; `exact_room_bookable` alone has no effect.
6. Room A media is rejected for Room B quality/verification, and no score, note, exact-room verification, or other example row is inserted for smoke testing.

The post-010 remote smoke test returned HTTP 200 for both public room-profile views, both base tables' allow-listed columns, and the exact-room public view. Anonymous requests for quality `notes_internal`, profile-note `created_by`, and mutations carrying a writable field returned HTTP 401. The exact-room resolver returned `not_verified` for an unknown physical-room ID. Both new public views returned an exact count of zero, confirming that no score, note, or verification example was seeded. Migrations 001–010 were Local = Remote and `supabase db lint --linked` reported no schema errors.

After migration 011, verify additionally:

1. `cms_pages`, `cms_sections`, `cms_section_items`, `cms_media_assets` and all four `public_cms_*` views exist with RLS enabled on base tables.
2. Anonymous reads of public views and their allow-listed base columns succeed; draft fields, `created_by`, `updated_by`, `published_by` and mutations are denied.
3. Home, Stay and Footer expose their approved published copy; FAQ remains draft. No room, property, score, verification, price, inventory or booking example is inserted.
4. A staff/admin draft edit does not change the anonymous result until `publish_cms_page` succeeds; publishing copies page, sections and items together and records `auth.uid()`.
5. `site-content` is public-read, limited to 10 MB JPEG/PNG/WebP/AVIF objects, while uploads/updates/deletes require staff/admin Storage RLS.
6. `cms_media_assets` accepts exactly one safe source, requires alt text/focal values and refuses archive while any draft or published reference remains.
7. Public pages remain usable with no CMS media or when the public Supabase configuration is absent.

Migration 012 is a minimal additive correction created after the first anonymous smoke test. The `security_invoker` views correctly depended on RLS but also needed column privileges for `cms_pages.status` and `cms_media_assets.is_active`, which appear in view filters. Migration 012 grants only those two lifecycle columns to `anon`; the corresponding RLS policies still expose only published-page and referenced-active-media rows. It adds no table, row, write permission or product behavior.

Migration 013 replaces the original authenticated Storage delete policy with an orphan-only policy. A `site-content` object cannot be deleted while a matching CMS media metadata row exists. The upload rollback can still remove an object when metadata insertion failed and therefore no row exists. This prevents direct Storage operations from silently breaking CMS references.

Migration 014 revokes authenticated table DELETE on all four CMS tables. Content uses page archive, section/item disable and reference-safe media archive instead of hard deletion. Staff/admin retain authenticated SELECT/INSERT/UPDATE and atomic publish RPC access.

Migration 015 keeps CMS draft editing available to staff while making publish and archive transitions Admin-only at the database boundary. Its reorder RPCs lock and normalize order atomically. The linked linter's two `shadowed_variables`/unused-loop-variable warnings belong to these pre-existing reorder functions and are non-functional; migration 016 adds no lint issue.

Migration 016 adds `suppliers`, `supplier_contacts`, `supplier_properties`, `partner_relationships`, and `supplier_external_refs` as a private supply-side foundation. After applying it, verify additionally:

1. RLS is enabled on all five tables and no table/view exposes them publicly.
2. Anonymous SELECT/INSERT/UPDATE/DELETE is denied; Supplier RPC role checks reject anonymous callers without mutation.
3. Authenticated staff/admin can read the private domain; staff mutation is limited to contacts and Property links, while Admin controls Supplier lifecycle, Partner relationship/tier, external identity and archive.
4. Supplier codes and external system identities cannot change; phone/email are normalized; each contact has a contact method; relationship dates and uniqueness constraints reject overlapping duplicates.
5. Archiving ends/disables current operational children without deleting history.
6. The migration inserts no Supplier, contact, Property link, Partner relationship, or external-reference row.
7. No public Property/room DTO, verification resolver, pricing resolver, availability resolver, CMS projection, or search ranking reads Partner data.

The post-016 remote smoke test found all five tables and an exact count of zero for each. Anonymous REST selection of every new table and anonymous insert/update/delete requests returned HTTP 401. An anonymous archive RPC returned the expected `Supplier archive requires admin` guard error and changed no row. Migrations 001–016 were Local = Remote. Linked lint reported no Phase 3 issue and only the two existing migration-015 reorder warnings described above. No smoke-test row was retained. The privileged count read used only an ephemeral CLI-managed key in process memory; no service-role client, key, environment variable, or application code was added.

Migration 017 removes the faulty migration-016 AFTER archive cascade and makes `archive_supplier` the only archive orchestrator. It locks the Supplier, closes/disables current children, and then archives the parent. Direct authenticated status updates to `archived` are rejected. `valid_until` remains inclusive, reactivation does not reopen history, and `save_supplier_profile_v2` updates the identified current primary contact instead of inserting on every edit. Authenticated execution of the legacy profile RPC is revoked.

After migration 017, verify additionally:

1. A Supplier with an active primary contact, current Property link, open Partner relationship, and active external ref archives successfully in one RPC.
2. Contacts become inactive/non-primary; current Property links retain history through the inclusive end date and are non-primary; Partner becomes ended with end dates; external refs become inactive.
3. A forced child constraint failure rolls back every child mutation and the parent transition.
4. Direct `UPDATE suppliers SET status = 'archived'` is rejected; Admin RPC archive succeeds; staff archive is rejected.
5. Reactivating an archived Supplier does not reopen any closed child.
6. Repeated Supplier profile edits preserve the current primary-contact ID and row count; intentional replacement through Contacts preserves the old row as non-primary history.
7. Anonymous table access remains zero, RLS/role ownership is unchanged, and no service-role client is introduced.
8. `supabase/tests/202608290017_supplier_lifecycle.sql` completes with every assertion passed and ends in `ROLLBACK`, leaving no fixture row.

The post-017 linked integration run passed all eight reported assertions: full-graph archive, direct-archive blocking, forced child-constraint rollback, intentional contact replacement, primary-contact ID preservation, non-reopening reactivation, repeated-edit count stability, and role/grant regression. Exact counts for all five Supplier tables remained zero after the rollback. Migrations 001–017 were Local = Remote. Linked lint reported no Phase 3H error and only the same migration-015 reorder-function shadowed/unused `position` warnings documented above. No service-role application client, key, fake Supplier, or smoke-test row was added.

After migration 018, verify additionally:

1. `commercial_rate_plans` and `room_commercial_rules` exist with RLS, no anonymous privilege and no authenticated hard delete.
2. Active plans/rules require matching Supplier–Property–Room ownership, a current inclusive Supplier–Property link and a non-archived Supplier.
3. Staff can manage draft terms and preview; only Admin can control plan lifecycle or contract references.
4. Future verification, reversed ranges, invalid Vietnam-date validity and negative amounts are rejected.
5. Supplier archive expires plans and deactivates rules in the same transaction; forced failure rolls everything back and reactivation does not reopen economics.
6. `public_room_rate_rules` and public DTOs remain unchanged and contain no cost, market, contribution, margin, contract or private notes.
7. `supabase/tests/202608290018_commercial_economics.sql` reports every assertion passed and ends in `ROLLBACK`.
8. Production economics tables remain empty until staff enters real facts; never infer cost from sell price.

The first linked integration run after 018 rolled back and exposed explicit Supabase-default `anon`/`authenticated` execute ACLs on the new trigger helpers. Corrective migration 019 revokes those helper RPC grants, and migration 020 restores only the authenticated relationship predicate needed by validation triggers. The final rollback-only integration run passed every reported database assertion, including an authenticated Admin active-plan/rule write. HTTP smoke tests returned 401 for anonymous economics reads, inserts and helper execution, while `public_room_rate_rules` remained HTTP 200. Exact post-test counts were zero for both economics tables and for Suppliers, Supplier links, Partner relationships, Properties, Room Types, sell plans and sell rules. Migrations 001–020 were Local = Remote. Linked lint added no Phase 4 warning; only the pre-existing migration-015 CMS reorder warnings remained. No fixture or secret was persisted.

## Environment configuration

Copy `.env.example` to an uncommitted `.env.local` and fill it with values from the Stay project only. Do not commit that file. The public app uses the anon/publishable key and all authorization remains enforced by RLS.

The application currently requires these public variable names:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the only supported public credential path. There is no runtime fallback to the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No current application call site uses a privileged client; do not configure `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` locally or in Vercel. Redeploy after any public environment change because Next.js inlines `NEXT_PUBLIC_` variables at build time.

## Storage architecture

Phase 2.6 creates `site-content` for public website presentation images only. It is independent from accommodation and verification evidence in `media_assets`. Public reads are intentional; writes require an authenticated staff/admin role through Storage RLS. See `docs/V2_PHASE_2_6_CMS_MEDIA_CONTENT_OPS.md` for MIME, size, folder, metadata and reference-safety rules.

The content, verification, and V2 Phase 1 exact-room workflows continue to use validated HTTPS evidence URLs. Exact-target evidence links existing `media_assets`; Phase 2.6 does not migrate or copy them into `site-content`.

Future Stay-owned buckets documented by the Master Plan are:

```text
property-media
room-media
verification-media
panorama-media
road-media
```

Create a bucket only when its owning phase and access policy are ready. Public marketing media and private operational evidence should not automatically share the same access policy. Never hard-code a Supabase project hostname or copy Biker Storage credentials.
