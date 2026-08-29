# Stay Supabase setup

Use only the dedicated Tà Xùa Stay Supabase project. Never link this repository or its CLI to the Biker project.

## Current remote status

Verified on 2026-08-29 against the dedicated Supabase project returned by the CLI as `TaXuaStay`, project ref `kkrtajdgkinybpwermls`. The repository is linked through Supabase CLI metadata under the gitignored `supabase/.temp/` directory; no credentials or tracked `supabase/config.toml` were added.

Supabase CLI `2.116.0` was used through an ephemeral `npx` workflow, so the application dependencies were not changed. Remote migration history is reconciled and contains these three migrations in order:

```text
202608290001
202608290002
202608290003
```

The final remote dry-run reported the database up to date. Never reuse this link metadata for Biker or change the project ref without first verifying the target project identity.

## Migration order

Apply only missing Stay migrations in filename order:

```text
supabase/migrations/202608290001_stay_foundation.sql
supabase/migrations/202608290002_properties_rooms_amenities_media.sql
supabase/migrations/202608290003_harden_phase2_accommodation.sql
```

Never reapply or edit a migration already present remotely. Migration `202608290003` is the additive corrective migration that preserves immutable migration `202608290002`.

After `202608290003`, review every property whose access values became `unknown`. The migration deliberately converts legacy `true` to `yes` and legacy `false` to `unknown`; an old false value is not sufficient evidence for a customer-facing `no`.

After applying Phase 2, verify with separate anonymous, staff, and admin sessions:

1. Anonymous cannot insert, update, or delete any Phase 2 table.
2. Anonymous sees only active/published properties and rooms.
3. Draft/inactive records and unreviewed media return no rows anonymously.
4. Staff/admin can manage Phase 2 content through the Admin application.
5. Public queries cannot request `updated_by`, `captured_by_user_id`, or `verified_by_user_id`.
6. Anonymous cannot select physical `room_types.quantity`.
7. A failed property/room amenity assignment rolls back the corresponding content insert/update.

## Environment configuration

Copy `.env.example` to an uncommitted `.env.local` and fill it with values from the Stay project only. Do not commit that file. The public app uses the anon/publishable key and all authorization remains enforced by RLS.

The application currently requires these public variable names:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

No current application call site uses a service-role client, and the unused client factory and environment-template placeholder have been removed. Do not configure `SUPABASE_SERVICE_ROLE_KEY` locally or in Vercel for the current application. If that variable already exists in the Vercel project, the owner should remove it. Keep only the two public Supabase variables above, then redeploy after any environment change.

## Storage architecture

Phase 2 supports validated HTTPS media URLs and does not require live Storage or upload UX. No bucket was created by this task.

Future Stay-owned buckets documented by the Master Plan are:

```text
property-media
room-media
verification-media
panorama-media
road-media
```

Create a bucket only when its owning phase and access policy are ready. Public marketing media and private operational evidence should not automatically share the same access policy. Never hard-code a Supabase project hostname or copy Biker Storage credentials.
