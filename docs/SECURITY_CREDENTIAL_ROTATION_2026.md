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
- Vercel legacy anon key: **PRESENT TEMPORARILY**, pending owner removal after production verification.
- Vercel service-role key: **ABSENT**.
- Vercel secret key: **ABSENT**.
- Local project service-role key: **ABSENT**.

## Rotation and closure status

- Legacy Supabase JWT-based API keys remain enabled until the owner completes the staged migration.
- Publishable-key production deployment `e249bf8` completed successfully.
- Public routes `/`, `/stay`, `/motorbike` and `/packages` return successfully without configuration or server-error markers.
- `/admin/login` is configured and usable; unauthenticated access to `/admin/economics`, `/admin/motorbike` and `/admin/packages` redirects to `/admin/login`.
- Source audit and automated tests prove that browser, server and Proxy clients read only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the still-present legacy anon variable is not a runtime fallback.
- No application-route `401`, `403` or `500` regression was observed after deployment.
- The owner may now remove `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Vercel without replacing it.
- Legacy-key disablement remains an owner action and must not occur until the Vercel removal is confirmed.
- V2 Phase 7 is outside this security task and has not been started.
