# Stay Supabase setup

Use only the dedicated Tà Xùa Stay Supabase project. Never link this repository or its CLI to the Biker project.

## Current remote status

Verified on 2026-08-29 against the dedicated Supabase project returned by the CLI as `TaXuaStay`, project ref `kkrtajdgkinybpwermls`. The repository is linked through Supabase CLI metadata under the gitignored `supabase/.temp/` directory; no credentials or tracked `supabase/config.toml` were added.

Supabase CLI `2.116.0` was used through an ephemeral `npx` workflow, so the application dependencies were not changed. Remote migration history is reconciled and contains these migrations in order:

```text
202608290001
202608290002
202608290003
202608290004
202608290005
202608290006
```

The final remote dry-run reported the database up to date. Never reuse this link metadata for Biker or change the project ref without first verifying the target project identity.

## Migration order

Apply only missing Stay migrations in filename order:

```text
supabase/migrations/202608290001_stay_foundation.sql
supabase/migrations/202608290002_properties_rooms_amenities_media.sql
supabase/migrations/202608290003_harden_phase2_accommodation.sql
supabase/migrations/202608290004_verified_standard.sql
supabase/migrations/202608290005_harden_phase4_verification.sql
supabase/migrations/202608290006_rate_plans_and_pricing.sql
```

Never reapply or edit a migration already present remotely. Migration `202608290003` is the additive corrective migration that preserves immutable migration `202608290002`; migration `202608290004` adds the normalized Verified Standard without seeding verification data; migration `202608290005` preserves immutable 004 while rejecting future/expired verified cycles, refreshing normal re-verification dates, and limiting anonymous Cloud/Road reads to public-view columns.

Migration `202608290006` adds rate plans and room rate rules without seed prices, inventory, availability, or bookings. After applying Phase 5, verify additionally:

1. `rate_plans`, `room_rate_rules`, and `public_room_rate_rules` exist with RLS enabled on both base tables.
2. Anonymous selection of the allow-listed public view succeeds, but internal plan descriptions, rule notes, staff IDs, and audit fields are inaccessible.
3. Anonymous insert/update/delete attempts against both pricing tables are denied.
4. Draft/inactive plans, inactive rules, and pricing attached to draft/inactive rooms or properties are absent from anonymous reads.
5. Staff/admin can create and update plans/rules through `/admin/rates` without a service-role key.
6. No smoke-test production price rows are inserted. Schema/grant checks are sufficient when no real owner pricing exists.

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

## Environment configuration

Copy `.env.example` to an uncommitted `.env.local` and fill it with values from the Stay project only. Do not commit that file. The public app uses the anon/publishable key and all authorization remains enforced by RLS.

The application currently requires these public variable names:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

No current application call site uses a service-role client, and the unused client factory and environment-template placeholder have been removed. Do not configure `SUPABASE_SERVICE_ROLE_KEY` locally or in Vercel for the current application. If that variable already exists in the Vercel project, the owner should remove it. Keep only the two public Supabase variables above, then redeploy after any environment change.

## Storage architecture

Phase 2 and Phase 4 use validated HTTPS media URLs and do not require live Storage or upload UX. Phase 4 links exact-target evidence to existing `media_assets`; no bucket was created by this task.

Future Stay-owned buckets documented by the Master Plan are:

```text
property-media
room-media
verification-media
panorama-media
road-media
```

Create a bucket only when its owning phase and access policy are ready. Public marketing media and private operational evidence should not automatically share the same access policy. Never hard-code a Supabase project hostname or copy Biker Storage credentials.
