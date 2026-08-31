# TÀ XÙA TRIP — STAY VERTICAL

**Đi thật. Biết trước.**

This repository is the independent accommodation technical foundation and the live `/stay` vertical of **Tà Xùa Trip**, a Verified Local Travel platform. The master brand, consumer taxonomy, SEO language, and technical domain are intentionally distinct: **Tà Xùa Trip → Lưu trú → Homestay Tà Xùa → Stay `/stay`**.

The public application now uses the Tà Xùa Trip brand shell while preserving the Destination → Property → Room Type → Physical Room identity hierarchy, verified evidence, Cloud View, Road Verified, pricing, pooled availability, room-first search, SEO, and authorized operations. Master Plan V2.1 combines four product pillars—**VERIFY, BUNDLE, OPERATE, DISTRIBUTE**—without rewriting that foundation.

Private suppliers, normalized contacts, Property relationships, Partner lifecycle/tier, and opaque external identities are implemented as the V2 Phase 3 supply-side foundation. Phase 3H migration 017 hardens atomic archive ordering and ID-preserving primary-contact edits. Phase 4 migrations 018–020 add private accommodation net cost, market reference and internal contribution/margin diagnostics while preserving the existing public sell-price engine and denying anonymous helper execution. Services, packages, unified trip booking, payments, bus integration, Motorbike Integration and the Trip Dashboard remain future architecture only. Tà Xùa Biker remains an independent product and source of truth for motorbike operations.

## Roadmap status

Migrations 001–008 and their historical phase documents are the **Legacy Foundation Completed**. Migration 009 implements **V2 Phase 1 — Architecture Alignment**. Migration 010 implements **V2 Phase 2 — Verified Room Profile** with separate Room Type Verified, Exact Room Verified, Room Quality dimensions, and factual strengths/caveats.

**V2 Phase 2.5 — Master Brand + Public UX Migration** is implemented without a database migration. **V2 Phase 2.6 — CMS, Media & Content Operations** is implemented by migrations 011–014. **V2 Phase 2.6H — CMS Admin UX + Publishing Hardening** adds the visual section editor/media library and migration 015. **V2 Phase 3 — Supplier + Partner Foundation** is implemented by migration 016 and the private Supplier Admin; **V2 Phase 3H — Supplier Lifecycle Hardening** is implemented by corrective migration 017; **V2 Phase 4 — Commercial Economics** is implemented by migrations 018–020 and `/admin/economics`. `/stay` is canonical; compatibility routes remain available. V2 Phase 5 — Motorbike Integration has not been started.

The focused **Mobile Hero Experience** keeps the accepted desktop Hero from 1024 px, while smaller viewports use a photography-first campaign layout and an accessible search bottom sheet. Both layouts reuse the existing CMS media/focal-point pipeline and `/stay` search semantics. This application-only UX pass adds no migration and does not start V2 Phase 5.

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
supabase/migrations/202608290009_v2_destination_and_physical_rooms.sql
supabase/migrations/202608290010_v2_verified_room_profile.sql
supabase/migrations/202608290011_v2_cms_media_content_operations.sql
supabase/migrations/202608290012_fix_cms_public_view_grants.sql
supabase/migrations/202608290013_harden_cms_storage_delete.sql
supabase/migrations/202608290014_enforce_cms_archive_lifecycle.sql
supabase/migrations/202608290015_harden_cms_publishing_permissions.sql
supabase/migrations/202608290016_v2_supplier_partner_foundation.sql
supabase/migrations/202608290017_harden_supplier_lifecycle.sql
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

- `docs/TA_XUA_STAY_CODEX_MASTER_PLAN.md` — canonical Master Plan V2.1 architecture and roadmap reference; each task prompt still controls the phase execution scope.
- `docs/STAY_ARCHITECTURE.md` — current system boundary and implementation state.
- `docs/brand/BRAND_SYSTEM.md` — durable Tà Xùa Trip brand architecture and naming rules.
- `docs/brand/CONTENT_VOICE.md` — truthful Vietnamese content voice, evidence language, and claim boundaries.
- `docs/brand/PUBLIC_UX_DIRECTION.md` — implemented Phase 2.5 information architecture and public experience.
- `docs/brand/VISUAL_REFERENCE.md` — visual precedence, palette, typography, photography, and asset status.
- `docs/PHASE_1_DATABASE_AUTH.md` — migration, authorization, and operating notes for Phase 1.
- `docs/PHASE_2_PROPERTIES_ROOMS.md` — Phase 2 domain, lifecycle, routes, and limitations.
- `docs/PHASE_3_SEARCH_SEO.md` — room-first search contracts, supported filters, ranking, pagination, and SEO strategy.
- `docs/PHASE_4_VERIFIED_STANDARD.md` — verification lifecycle, Cloud View rubric, Road precedence, evidence, 360°, Admin, and public security contracts.
- `docs/PHASE_5_PRICING.md` — rate plans, nightly resolver, confidence, conflicts, Admin/public pricing, and the price-versus-availability boundary.
- `docs/PHASE_6_AVAILABILITY.md` — nightly inventory, freshness, multi-night availability, Admin operations, public safety, and the no-booking boundary.
- `docs/V2_CURRENT_STATE_MAPPING.md` — bridge from the completed accommodation foundation to the V2 target domains.
- `docs/V2_PHASE_1_ARCHITECTURE_ALIGNMENT.md` — Destination, Physical Room/Room ID, exact-target media and verification contracts.
- `docs/V2_PHASE_2_VERIFIED_ROOM_PROFILE.md` — Room Type versus Exact Room verification, quality rubrics/freshness, pros/cons, evidence, Admin, and public security.
- `docs/V2_PHASE_2_5_MASTER_BRAND_PUBLIC_UX.md` — implemented brand shell, route compatibility, truthful service states, design tokens, and QA contract.
- `docs/V2_PHASE_2_6_CMS_MEDIA_CONTENT_OPS.md` — structured editorial ownership, atomic publish, media lifecycle, Storage, public projections, fallback and operating checklist.
- `docs/V2_PHASE_2_6H_CMS_ADMIN_UX_HARDENING.md` — visual Admin editor, bounded media library, reorder semantics, image metadata/focal workflow, and staff/admin publishing boundary.
- `docs/V2_PHASE_3_SUPPLIER_PARTNER_FOUNDATION.md` — private Supplier identity, contacts, Property links, Partner lifecycle/tier, external references, RLS and trust separation.
- `docs/V2_PHASE_3H_SUPPLIER_LIFECYCLE_HARDENING.md` — child-first atomic archive, inclusive relationship dates, direct-archive guard, reactivation and ID-preserving primary-contact edits.
- `docs/LEGACY_ROADMAP_STATUS.md` — concise historical status and phase-numbering boundary.
- `docs/SUPABASE_SETUP.md` — manual migration and future Storage setup.
