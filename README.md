# TÀ XÙA STAY

**Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.**

This repository contains the independent Tà Xùa Stay application. Phase 2 adds the accommodation content domain: properties, room types, normalized amenities, and evidence-aware media. Search, verification scoring, pricing, availability, and booking have not been created yet.

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
- `docs/SUPABASE_SETUP.md` — manual migration and future Storage setup.
