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

The current baseline contains the generic Next.js App Router, React, Tailwind CSS, Supabase SSR client factories, Admin authorization primitives, reusable UI components, and Vitest infrastructure. It deliberately contains no Stay business tables, migrations, property inventory, room inventory, pricing, availability, or booking engine.

If Stay Supabase variables are absent, public pages remain available and the Admin login explains that configuration is required instead of crashing.

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

These names document direction only; Phase 0 does not implement them.

## Future Biker relationship

Any future Biker integration should use an external referral or deep link with an opaque, non-sensitive reference unless the architecture is explicitly redesigned and reviewed. Stay must not create Biker rental records, transmit customer PII in query strings, or treat Biker as its source of truth.
