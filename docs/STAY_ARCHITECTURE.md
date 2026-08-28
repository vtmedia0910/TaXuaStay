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

## Planned domains

Later phases may introduce these independent Stay domains, one reviewed phase at a time:

- properties
- rooms
- verification
- rates
- availability
- stay bookings
- weather and cloud forecast
- imports

These names document direction only; Phase 1 does not implement them.

## Future Biker relationship

Any future Biker integration should use an external referral or deep link with an opaque, non-sensitive reference unless the architecture is explicitly redesigned and reviewed. Stay must not create Biker rental records, transmit customer PII in query strings, or treat Biker as its source of truth.
