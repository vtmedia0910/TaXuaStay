# V2 Phase 2.6 — CMS, Media & Content Operations

Status: implemented by additive migration `202608290011_v2_cms_media_content_operations.sql`, narrow hardening migrations 012–014, and application code. The separately authorized Phase 2.6H hardening adds migration 015 and the visual Admin operations layer described in `V2_PHASE_2_6H_CMS_ADMIN_UX_HARDENING.md`. This phase does not start V2 Phase 3.

## Purpose and boundary

Phase 2.6 moves approved website marketing copy and presentation media from deploy-time code edits into a small, structured Admin workflow. It is not a page builder and does not own operational truth.

Code still owns:

- page/component structure, responsive layout, icons, design tokens and accessibility behavior;
- canonical URLs, robots, sitemap, JSON-LD/schema and the temporary-host noindex policy;
- search, pricing, availability, verification, Cloud View and Room Profile queries;
- claim boundaries and fallback rendering.

CMS owns only allow-listed editorial fields: heading, eyebrow, body, safe CTA, order, enable state, selected website media, limited entity references and page SEO title/description/OG media.

There is no raw HTML, Markdown-to-HTML, arbitrary CSS/JavaScript, template expression or general page-builder payload. Internal links must begin with `/`; external links and media URLs must use HTTPS.

## Tables and public projections

Migration 011 adds:

- `cms_pages`: allow-listed pages `home`, `stay`, `verified`, `footer`, `faq`;
- `cms_sections`: allow-listed section keys/types and structured copy/media/order controls;
- `cms_section_items`: feature/link/FAQ/room-reference items with one optional real domain target;
- `cms_media_assets`: website-only image metadata and exactly one Storage or external HTTPS source.

The corresponding `public_cms_*` views are `security_invoker` views. Anonymous base-table grants contain only IDs/foreign keys, `published_*` fields and the two lifecycle filter columns (`status`, `is_active`) needed by those views. RLS still admits only published pages and referenced active media. Audit IDs, current draft values and inactive/unreferenced media are not anonymously readable. Anonymous mutation grants do not exist.

Accommodation evidence remains in `media_assets`; website presentation media remains in `cms_media_assets`. A CMS row cannot create or copy prices, inventory, availability, ratings, scores or verification outcomes.

## Draft and publish model

Draft and public data are separate columns in the same normalized records:

1. Editors update draft fields. The page becomes `draft`, while its last `published_*` snapshot and `published_at` remain unchanged.
2. Protected preview reads the draft base tables through the editor's authenticated session.
3. `publish_cms_page(page_key)` locks the page and copies the page, all of its sections and all items into `published_*` fields in one PostgreSQL transaction.
4. The RPC records `published_at` and `published_by = auth.uid()` and changes the editorial status to `published`.
5. If any statement fails, the public snapshot remains unchanged. There is no partial section publish.

After Phase 2.6H, both `admin` and `staff` may view CMS content, upload/update media, edit/save drafts, reorder content and preview drafts. Only `admin` may publish, archive a page or archive media. Application actions explicitly request the narrow role, and migration 015 repeats that decision inside the RPC/trigger boundary so hiding a button is never the security control. Neither workflow uses a service-role key. Media archive remains reference-safe across draft and published columns. Archiving a CMS page removes its snapshot from the CMS public view, so the application serves the approved code fallback.

Phase 2.6 does not add revision history beyond the durable previous published snapshot. A future revision table must be an additive, separately authorized change.

## Admin routes

- `/admin/content`: content operations overview;
- `/admin/content/home`: Homepage and homepage SEO editor;
- `/admin/content/stay`: Stay landing copy and SEO editor;
- `/admin/content/preview?page=home|stay`: protected draft preview reusing public render components and real operational data;
- `/admin/site-media`: Storage upload, external HTTPS image registration, metadata/focal point and safe archive.

Editors change structured copy through collapsed, context-specific section cards. Normal UI uses move-up/move-down actions instead of exposing integer sort values; transactional RPCs lock the relevant list and normalize ordering. Editors can enable/disable a block, maintain structured items, select independent desktop/mobile images and select a real Room Type or Physical Room reference. The public verified-room block uses selected real room IDs only as presentation ordering/filtering; the current Cloud View resolver remains authoritative. If no entity is selected, it uses the current real query order. It never creates placeholder room cards.

## Media lifecycle and Storage

Migration 011 creates one public bucket named `site-content` with:

- 10 MB object limit;
- MIME allow-list: JPEG, PNG, WebP and AVIF;
- write folders: `homepage`, `stay`, `about`, `banners`, `og`, `general`;
- public reads, because all stored assets are public website presentation media;
- authenticated `admin`/`staff` insert/update/delete policies only.

Every `cms_media_assets` row requires a meaningful `alt_text`, role, focal X/Y values from 0–100 and exactly one source: `site-content` plus a validated path, or an external HTTPS URL. Upload dimensions are detected from bounded JPEG, PNG, WebP or AVIF header parsing and are never trusted from user input. Uploads roll back the object if metadata insertion fails. The accessible focal-point control supports click/tap plus horizontal and vertical keyboard sliders.

External images deliberately use a normal lazy `<img>` instead of opening Next Image `remotePatterns` to arbitrary hosts. Storage images use Next Image and the environment-specific Supabase hostname already allow-listed in `next.config.ts`.

The Admin action archives metadata rather than deleting an object. `archive_cms_media_asset` checks page, section and item references across both draft and published columns and refuses if any reference exists. Editors must replace/remove the reference and republish first. Migration 013 additionally permits a direct Storage delete only when no matching `cms_media_assets` row exists; this supports cleanup of an upload whose metadata insert failed without allowing a stored CMS asset to become a broken URL. Migration 014 revokes direct table DELETE on all four CMS tables, enforcing archive/disable lifecycle instead of destructive removal. Phase 2.6 has no bulk file delete.

## Public rendering, SEO and fallback

The Homepage consumes CMS Hero, Why, Differentiators, verified-room presentation, Brand Statement and Final CTA. `/stay` consumes Stay intro/notes and page metadata. The footer consumes its intro. Prices, current availability, Cloud View and verification facts still come from their existing public-safe domain readers.

Public CMS reads have code defaults containing the approved Phase 2.5 copy. When Supabase is missing, a query fails, CMS rows are missing, or no image is selected, the page remains usable, no broken image appears and no fake room, score, rating, price or availability is invented.

Publishing calls `revalidatePath` for the affected public route, Admin editors/preview, media library and the public layout when footer content changes. This gives existing static/public routes on-demand regeneration without requiring a redeploy. No cache tag was added because these readers currently have no shared tagged cache layer.

CMS page SEO may supply title, description and OG image. Canonical, robots/noindex and schema stay code-controlled. A technical Vercel hostname therefore remains noindex even if an editor changes SEO content.

## Seeded editorial content

Migration 011 seeds only approved, already-public Phase 2.5 copy:

- `home`: Hero, Why, Differentiators, verified-room intro, Brand Statement and Final CTA;
- `stay`: landing intro and price/availability truth note;
- `footer`: brand intro;
- `faq`: an empty draft page for later editorial use.

It seeds no room/property/media/evidence/verification/price/inventory/booking/supplier/transport data and no demo claim. Home, Stay and Footer snapshots are published so applying the migration preserves the current customer experience. FAQ remains a draft with no fabricated questions.

## Operations checklist

1. Save each changed form as a draft.
2. Confirm alt text, crop focal point, mobile/desktop choices and CTA destination.
3. Open protected preview at desktop and mobile widths.
4. Verify that real room/price/availability/verification data still matches its domain source.
5. Publish the full page once. If the action reports failure, the previous public snapshot is still active.
6. Check the affected public route and metadata after publishing.

Storage and external-image availability remain external dependencies; the UI degrades to no image rather than rendering invented media.

## Explicit exclusions

V2 Phase 2.6 adds no Supplier/Partner, contract, commission, payout, generic service, package, transport, motorbike integration, booking, payment or Trip Dashboard domain. V2 Phase 3 has not been started.
