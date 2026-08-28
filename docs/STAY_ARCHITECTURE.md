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

These names document direction only. Phase 2 implements only properties, room types, amenities, and basic media; all later domains remain deferred.

## Future Biker relationship

Any future Biker integration should use an external referral or deep link with an opaque, non-sensitive reference unless the architecture is explicitly redesigned and reviewed. Stay must not create Biker rental records, transmit customer PII in query strings, or treat Biker as its source of truth.
