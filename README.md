# TÀ XÙA STAY

**Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.**

Tà Xùa Stay is evolving from a verified accommodation platform into a **Verified Local Travel Commerce** system for Tà Xùa. The current application is still accommodation-heavy: it provides properties, room types, verified evidence, Cloud View, Road Verified, pricing, availability, room-first search, SEO, and authorized operations. The V2 target combines four product pillars—**VERIFY, BUNDLE, OPERATE, DISTRIBUTE**—without rewriting that foundation.

Destination, physical/exact rooms, suppliers, partners, services, packages, unified trip booking, payments, bus integration, and the Trip Dashboard are target architecture only; they are not implemented yet. Tà Xùa Biker remains an independent product and source of truth for motorbike operations.

## Roadmap status

Migrations 001–008 and their historical phase documents are the **Legacy Foundation Completed**. The canonical roadmap is now Master Plan V2. New implementation numbering restarts at **V2 Phase 1 — Architecture Alignment**, beginning from the current repository rather than a blank project.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to a local `.env.local` only when a dedicated Stay Supabase project is available. Never use Tà Xùa Biker credentials.

Apply the migrations in order only to the dedicated Stay project:

```text
supabase/migrations/202608290001_stay_foundation.sql
supabase/migrations/202608290002_properties_rooms_amenities_media.sql
supabase/migrations/202608290003_harden_phase2_accommodation.sql
supabase/migrations/202608290004_verified_standard.sql
supabase/migrations/202608290005_harden_phase4_verification.sql
supabase/migrations/202608290006_rate_plans_and_pricing.sql
supabase/migrations/202608290007_harden_phase5_pricing.sql
supabase/migrations/202608290008_room_inventory_and_availability.sql
```

The public page remains usable with safe local defaults when Supabase environment variables are absent or settings cannot be read.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Project references:

- `docs/TA_XUA_STAY_CODEX_MASTER_PLAN.md` — canonical architecture and roadmap reference; each task prompt still controls the phase execution scope.
- `docs/STAY_ARCHITECTURE.md` — current system boundary and implementation state.
- `docs/PHASE_1_DATABASE_AUTH.md` — migration, authorization, and operating notes for Phase 1.
- `docs/PHASE_2_PROPERTIES_ROOMS.md` — Phase 2 domain, lifecycle, routes, and limitations.
- `docs/PHASE_3_SEARCH_SEO.md` — room-first search contracts, supported filters, ranking, pagination, and SEO strategy.
- `docs/PHASE_4_VERIFIED_STANDARD.md` — verification lifecycle, Cloud View rubric, Road precedence, evidence, 360°, Admin, and public security contracts.
- `docs/PHASE_5_PRICING.md` — rate plans, nightly resolver, confidence, conflicts, Admin/public pricing, and the price-versus-availability boundary.
- `docs/PHASE_6_AVAILABILITY.md` — nightly inventory, freshness, multi-night availability, Admin operations, public safety, and the no-booking boundary.
- `docs/V2_CURRENT_STATE_MAPPING.md` — bridge from the completed accommodation foundation to the V2 target domains.
- `docs/LEGACY_ROADMAP_STATUS.md` — concise historical status and phase-numbering boundary.
- `docs/SUPABASE_SETUP.md` — manual migration and future Storage setup.
