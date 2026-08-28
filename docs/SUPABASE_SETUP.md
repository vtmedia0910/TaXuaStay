# Stay Supabase setup

Use only the dedicated Tà Xùa Stay Supabase project. Never link this repository or its CLI to the Biker project.

## Current remote status

This workspace has no Supabase CLI binary/link, `supabase/config.toml`, Supabase environment variables, or database credentials. Neither migration can be verified or applied remotely from this task. The owner must inspect the Stay project migration history before applying anything.

## Migration order

Apply only missing Stay migrations in filename order:

```text
supabase/migrations/202608290001_stay_foundation.sql
supabase/migrations/202608290002_properties_rooms_amenities_media.sql
```

If `202608290001` is already present remotely, do not reapply or edit it. Apply only `202608290002`. Once `202608290002` is applied, keep it immutable and use additive corrective migrations for future changes.

After applying Phase 2, verify with separate anonymous, staff, and admin sessions:

1. Anonymous cannot insert, update, or delete any Phase 2 table.
2. Anonymous sees only active/published properties and rooms.
3. Draft/inactive records and unreviewed media return no rows anonymously.
4. Staff/admin can manage Phase 2 content through the Admin application.
5. Public queries cannot request `updated_by`, `captured_by_user_id`, or `verified_by_user_id`.

## Environment configuration

Copy `.env.example` to an uncommitted `.env.local` and fill it with values from the Stay project only. Do not commit that file. The public app uses the anon/publishable key and all authorization remains enforced by RLS.

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
