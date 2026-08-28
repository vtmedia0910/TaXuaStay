# Phase 1 database and Admin authorization

This note covers only Phase 1. The complete architecture reference is `TA_XUA_STAY_CODEX_MASTER_PLAN.md`; a task prompt must explicitly authorize every later phase.

## Scope delivered

- one singleton `public.site_settings` row with public-safe brand, contact, social, announcement, and hero content;
- PostgreSQL helpers `current_app_role()`, `is_admin()`, and `is_staff_or_admin()`;
- protected Admin access for `admin` and `staff` roles stored in `app_metadata`;
- settings navigation, page, validation, and update action for `admin` only;
- RLS and column privileges that allow safe reads while reserving updates for admins;
- public fallback settings when Stay Supabase is absent or temporarily unavailable.

No property, room, rate, availability, customer, or booking schema belongs to this phase.

## Apply the migration

The migration is:

```text
supabase/migrations/202608290001_stay_foundation.sql
```

Apply it only to the dedicated Tà Xùa Stay Supabase project, either with the Supabase CLI workflow configured for that project or through its SQL Editor. Do not apply it to Biker and do not replay a Biker migration into Stay.

After a remote application, treat this migration as immutable. Future corrections must be additive migrations.

### Audit status on 2026-08-29

The Phase 2 audit found no Phase 1 correctness issue. This workspace has no Supabase CLI link, `supabase/config.toml`, Supabase environment variables, or remote database credentials, so the remote application state of migration `202608290001` cannot be independently confirmed here. It is therefore treated as potentially applied and immutable. No Phase 1 migration line was changed and no corrective migration was required.

## Configure environment variables

Use values from the dedicated Stay project only. Follow `.env.example` and keep real values in an uncommitted `.env.local` or the deployment secret store.

The browser receives only the project URL and publishable/anon key. A service-role key, if one is ever needed for a later server-only operation, must never use a `NEXT_PUBLIC_` name or be exposed to browser code.

## Provision Admin users and roles

Create users in the dedicated Stay Auth project. Set exactly one supported role in the user's application metadata:

```json
{ "role": "admin" }
```

or:

```json
{ "role": "staff" }
```

Use a trusted admin workflow such as the Stay Supabase Dashboard or a server-side Admin API. Never derive authorization from `user_metadata`, because authenticated users can edit that metadata themselves.

After changing a role, have the user sign in again so the refreshed JWT contains the current `app_metadata.role` claim.

## Access matrix

| Capability | Anonymous | Staff | Admin |
| --- | --- | --- | --- |
| Read public-safe settings | Yes | Yes | Yes |
| Open protected Admin shell | No | Yes | Yes |
| Open settings page | No | No | Yes |
| Update settings | No | No | Yes |
| Read `updated_by` through public app | No | No | No |

Settings updates are checked three times: the page/action require an admin session, the mutation uses that user's Supabase session, and the database policy checks `app_metadata.role = 'admin'`.

## Operational checks

Before deploying, verify:

1. The configured Supabase URL belongs to Stay.
2. An anonymous request can read only the explicitly granted settings columns.
3. A `staff` account can open `/admin` but is redirected away from `/admin/settings`.
4. An `admin` account can update settings and the public home reflects them.
5. With Supabase variables removed, `/` still renders default Stay content without crashing.
