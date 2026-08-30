# V2 Phase 2.6H — CMS Admin UX + Publishing Hardening

Status: complete in application code and additive migration `202608290015_harden_cms_publishing_permissions.sql`. Migrations 001–015 are remotely applied. This hardening pass does not start V2 Phase 3.

## Scope and operating model

Phase 2.6H preserves the structured CMS introduced in Phase 2.6. Code continues to own page structure, component types, design, canonical URLs, robots, schema, search and every operational truth source. Admin users edit allow-listed editorial content and website presentation media; no generic page builder, HTML, CSS, JavaScript, color, font or arbitrary layout control was added.

The operating boundary is:

- `staff`: view content, upload/update media, edit and reorder drafts, save, and use the protected preview;
- `admin`: all staff capabilities plus publish, page archive and reference-safe media archive;
- anonymous: published projections and referenced active website media only.

Application actions explicitly request their allowed roles. Migration 015 repeats the sensitive boundary inside PostgreSQL: `publish_cms_page`, `archive_cms_page` and `archive_cms_media_asset` require `app_metadata.role = admin`; lifecycle triggers prevent staff from mutating published snapshots or archive state through direct table calls. Existing RLS remains active and no service-role client is used.

## Content editor

`/admin/content/home` and `/admin/content/stay` use collapsed section cards with centralized Vietnamese names and human section-type badges. A compact outline links to each card and displays visible/hidden state. The page header and sticky action bar distinguish “Bản công khai đã cập nhật”, “Có thay đổi chưa xuất bản” and archived state from exact draft-versus-published comparisons.

Forms are contextual:

- Hero: editorial copy, primary and structured secondary CTA, desktop/mobile media selectors and crop previews;
- editorial/list sections: only relevant copy, CTA, media and structured items;
- dynamic verified-room section: presentation copy, CTA, item limit and enable state plus a locked explanation that Room ID, verification, Cloud View, Room Quality, price and availability come from operational data.

Normal staff no longer enter `section_key`, `section_type` or `sort_order`. Move-up/down calls transactional reorder RPCs. Each RPC locks the page/list, orders by `(sort_order, id)`, swaps one neighbor and normalizes every stored sort value to `10, 20, 30…`, preventing unstable duplicate ordering. Draft saves do not require confirmation; publishing and archive do.

SEO and social sharing live in a collapsed panel. Editors may update draft SEO title/description/OG media, but canonical, robots/noindex and schema remain code-controlled. Preview uses the same public components and draft data; public routes retain the previous snapshot until an admin publishes.

## Media library and image workflow

`/admin/site-media` is a responsive thumbnail grid backed by server-side title search, role filtering and 24-item pages. Friendly role labels replace raw enums. Detail view shows the large preview, internal title, alt text, caption, role, dimensions, source summary, focal point, creation/update audit dates and exact draft/published references from page, section and item foreign keys.

The reusable picker supports search, role filtering, pagination, selection/change/removal and desktop/mobile crop previews. Upload requests only name, alt text, role, folder, file and optional caption. Server code reads bounded JPEG, PNG, WebP or AVIF headers and persists actual dimensions; no user-provided width/height is accepted. Malformed or unrecognized images fail before Storage upload.

Focal point is selected directly on an image and stored as 0–100 `focal_x`/`focal_y`. Keyboard users receive horizontal and vertical range controls; the marker and percentage readout stay synchronized.

Media archive is available only to admins in a confirmed danger area. PostgreSQL still refuses archive while any current draft or published page/section/item reference exists. Website presentation media remains separate from accommodation/verification evidence media.

## Draft, publish and audit behavior

- Saving a draft marks the page draft and revalidates Admin/preview paths; it does not overwrite `published_*` fields.
- Publishing is one admin-only transaction across page, sections and items, records `published_at`/`published_by`, then revalidates the affected public path.
- Staff cannot publish or archive even if they call the RPC directly.
- Page archive is admin-only and removes the CMS snapshot from public resolution, which activates the approved code fallback.
- Unsaved browser form edits trigger a leave warning when feasible; successful actions return explicit Vietnamese draft/public messages.

## Acceptance and security checks

Automated coverage verifies friendly mappings, collapsed section structure, system-data lock, absence of manual sort inputs, reorder SQL normalization, media search/filter schemas, visual focal fields, supported image metadata formats, malformed-image rejection, application role restrictions, DB admin gates, and existing public/RLS contracts.

Operational acceptance for a real authenticated account is:

1. staff uploads an approved image; dimensions are detected and focal point is set visually;
2. staff selects desktop/mobile/OG media and saves; public content and metadata remain on the prior snapshot;
3. staff previews the draft but receives an application and DB denial for publish/archive;
4. admin confirms publish; public content/metadata updates after on-demand revalidation, without redeploy;
5. canonical and temporary-host noindex remain unchanged;
6. admin can archive only unreferenced media.

Phase 2.6H added no Supplier, Partner, commercial contract, service catalog, package, unified booking, payment or Trip Dashboard domain. V2 Phase 3 was later implemented under separate authorization and remains outside CMS.
