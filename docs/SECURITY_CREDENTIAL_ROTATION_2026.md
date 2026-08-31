# Supabase credential security closure — 2026

## Incident

- A legacy Supabase `service_role` credential appeared in local tool output during Phase 6 verification.
- Repository commit exposure: **NO**.
- Git history exposure: **NO**.
- Application runtime dependency: **NO**.
- CLI or maintenance-script dependency: **NO**.
- Secret values are intentionally omitted from this record.

## Application credential migration

- Canonical public credential: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Browser, server, Proxy and Admin Auth clients all consume the shared public configuration.
- Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback: **NONE**.
- `SUPABASE_SERVICE_ROLE_KEY` runtime usage: **NONE**.
- `SUPABASE_SECRET_KEY` runtime usage: **NONE**.

## Environment status

- Vercel Production publishable key: **PRESENT**.
- Vercel Preview publishable key: **PRESENT**.
- Vercel legacy anon key: **ABSENT**.
- Vercel service-role key: **ABSENT**.
- Vercel secret key: **ABSENT**.
- Local project service-role key: **ABSENT**.

## Rotation and closure status

- The owner rotated the exposed legacy `service_role` credential and confirmed that all legacy JWT-based Supabase API keys are disabled.
- Legacy anon credential: **DISABLED**.
- Legacy service-role credential: **DISABLED**.
- Publishable-key production deployment `e249bf8` completed successfully.
- Public routes `/`, `/stay`, `/motorbike` and `/packages` return successfully without configuration or server-error markers.
- `/admin/login` is configured and usable; unauthenticated access to `/admin/economics`, `/admin/motorbike` and `/admin/packages` redirects to `/admin/login`.
- Direct post-rotation reads of Stay properties, room types, Motorbike public projection, Packages and Supabase Auth return successfully using only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Source audit and automated tests prove that browser, server and Proxy clients read only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; no legacy anon fallback or privileged client exists.
- No application-route `401`, `403` or `500` regression was observed after deployment.
- Migrations remain `001–023` Local = Remote; this closure required no migration and no database push.
- Credential incident status: **CLOSED**.
- V2 Phase 7 is outside this security task and has not been started.
