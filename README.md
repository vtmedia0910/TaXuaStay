# TÀ XÙA STAY

**Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.**

This repository contains the independent Tà Xùa Stay application. Phase 5 adds VND rate plans, deterministic nightly room pricing, price confidence, conflict visibility, public date-aware price summaries, and an authorized Admin pricing workflow. A price answers what a room costs for selected dates; it never claims the room is available. Inventory, availability, booking, discounts, and weather forecasting have not been created.

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
- `docs/SUPABASE_SETUP.md` — manual migration and future Storage setup.
