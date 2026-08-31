# V2 locked Hero experience hardening

## Scope

This corrective implementation changes only the Tà Xùa Trip homepage Hero and its immediately attached trust strip. It does not redesign the later homepage sections, change accommodation records, create a new commercial domain, or start V2 Phase 4.

No database migration is required. Applied migrations `202608290001`–`202608290017` remain immutable.

## Public composition

The homepage opens with one photography-first destination surface:

- the existing public header overlays the Hero in a subtle navy-translucent mode and keeps its normal white/sticky treatment on other public routes;
- a responsive CMS photograph fills the complete Hero;
- the left text zone uses a directional navy overlay while the right side retains the photograph's natural contrast;
- the locked brand sequence is `TÀ XÙA TRIP`, `Đi thật. Biết trước.`, `Tà Xùa, trước khi bạn đến.`, concise supporting copy, then `THẬT`, `HIỂU`, `TRỌN VẸN`;
- the former right-side “Trước khi đặt, bạn biết” card is removed;
- the floating search panel overlaps the Cloud White transition and is followed by the exact four-item trust strip.

The handwritten slogan uses the self-hosted `Allura` font through `next/font`, with Vietnamese and Latin subsets. Essential controls continue to use Be Vietnam Pro.

## CMS media contract

The existing CMS remains the source of truth for the Hero photograph, alternative text and focal point.

Desktop resolution order:

```text
published CMS desktop Hero → code-owned color fallback
```

Mobile resolution order:

```text
published CMS mobile Hero → published CMS desktop Hero → code-owned color fallback
```

`HeroMedia` renders one responsive `<picture>` rather than two eager images. A browser at desktop width selects only the desktop source; a mobile browser selects the mobile source when present, avoiding an unnecessary desktop download. Storage-backed media uses the Next.js image optimizer and `srcset`; an editor-approved external HTTPS asset preserves the established unoptimized CMS behavior. The chosen LCP image uses eager/high-priority loading without video or an animation dependency.

Desktop and mobile focal points are independent CSS values. For example, CMS values `72 / 42` render as `object-position: 72% 42%` at the applicable breakpoint. If CMS media is missing, the Hero remains readable over the safe brand-color background and does not invent a photograph.

### Owner workflow for a stronger Hero photograph

In Admin:

1. Open **Media website** and upload a clean Tà Xùa landscape photograph to the Hero folder/role. Do not upload an image containing header, typography, search fields, badges or other baked-in UI.
2. Enter truthful Vietnamese alt text and set the focal point on the important subject (traveler, sunrise or mountain ridge).
3. Open **Nội dung → Trang chủ → Hero đầu trang**.
4. Select the desktop asset. Select a dedicated portrait/mobile crop when available; otherwise the desktop asset is the explicit mobile fallback.
5. Preview at desktop and mobile widths before an Admin publishes the page.

Recommended source quality is a natural, high-contrast landscape with sufficient resolution for a full-bleed LCP image. Keep the original under the existing CMS 10 MB limit, prefer WebP/AVIF or a well-compressed JPEG, avoid artificial white overlays, and provide a dedicated mobile crop when the subject would otherwise be lost.

## Search and truth rules

Only `Lưu trú` is active. `Combo`, `Xe khách` and `Xe máy` are visibly marked `Sắp có` and do not simulate commerce.

The form submits a normal GET request to `/stay` with exactly four visible primary fields:

- `check_in` — Nhận phòng;
- `check_out` — Trả phòng;
- `adults` — Số khách (the current accommodation engine treats this as adult guests; children remain zero from this compact entry form);
- `rooms` — Số phòng.

There is no destination or accommodation-type field. `/stay` continues to validate dates and bounded guest/room quantities and remains the single search implementation.

The exact preference row behaves as follows:

- `Đã thẩm định` sets `verified=1` and keeps only results with a current public Cloud View or Road verification summary;
- `Săn mây` is deliberately non-interactive because the current system has no factual forecast or cloud-potential filter. Its tooltip explains the limitation; it never implies guaranteed clouds;
- `View từ giường` sets `view_from_bed=1` and keeps only current public Cloud View evidence recorded as `yes` or `partial`;
- `Ô tô vào được` reuses `car_access=yes`; `unknown` remains unknown and never becomes `no` or `yes`.

The complete normalized query is preserved by filters and pagination. Enriched verification filters use a bounded candidate set and never bypass public RLS or public verification resolvers.

## Accessibility and responsive behavior

- `TÀ XÙA TRIP` is the one semantic H1; the script slogan remains live text.
- Every form control has an explicit label; preferences are real checkboxes except the truthfully unavailable `Săn mây` preference.
- Tabs that are not implemented are non-interactive and marked disabled.
- The mobile menu retains its native keyboard-operable `details/summary` behavior.
- Global focus-visible treatment remains in force, including a dedicated focus ring around selected preference chips.
- No essential words are baked into the photograph.

The search uses five proportional columns on desktop, two field columns on tablet/mobile and a full-width CTA below at narrower widths. Trust items collapse from four columns to two. The Hero has no horizontal overflow at the tested widths.

## Verification checklist

Automated coverage protects:

- CMS desktop/mobile art direction;
- desktop-to-mobile fallback;
- alt text and breakpoint focal points;
- locked public brand text;
- transparent homepage header mode and removal of the white wash;
- exact fields, tabs, chips, CTA and trust copy;
- absence of destination/accommodation type, old card, generated mockup chips and `24/7` claims;
- safe parsing and filtering for verified, view-from-bed and tri-state car access.

Visual QA results and final quality-gate counts are recorded in the delivery report after the six required viewport checks.

### Local visual QA matrix

| Viewport | Result |
| --- | --- |
| 1920 × 1080 | Hero resolves to the 860 px maximum, typography stays left-weighted, the panel overlaps by 44 px, all four trust items remain on one line and horizontal overflow is zero. |
| 1440 × 900 | Hero resolves to 760 px, the complete preference row and trust strip remain visible, CTA stays on one line and horizontal overflow is zero. |
| 1366 × 768 | Desktop navigation remains complete, the panel stays anchored at the lower boundary and horizontal overflow is zero. |
| 1024 × 768 | Header switches to CTA + mobile menu, search fields keep their compact desktop row, CTA remains one line and horizontal overflow is zero. |
| 768 × 1024 | Search reflows to two field columns, preferences wrap once, trust remains a four-item compact strip and horizontal overflow is zero. |
| 390 × 844 | Header, brand copy and values remain readable; search uses two field columns, tabs/chips wrap without clipping, trust uses two columns and horizontal overflow is zero. |

The no-CMS local fallback was also checked at all six widths. The deployed CMS-photo pass is repeated after Vercel receives the commit so image contrast, directional overlay and real focal crop are judged against the actual published photograph.

## Hero Visual Polish H1

H1 is a visual-only refinement of the accepted locked Hero. It does not change copy, search parameters, preference semantics, CMS resolution, permissions, SEO policy, or any accommodation domain behavior.

- The directional overlay keeps the left text zone at its previous contrast while reducing navy density through the center and right. The published photograph therefore retains more cloud highlight, sunrise color and mountain separation without a white overlay or artificial image treatment.
- The desktop brand title scale is reduced by approximately nine percent. The existing Allura slogan remains live text and becomes the clearer emotional signature through relative scale, line-height and spacing rather than a new font or image asset.
- Copy rhythm and brand-value spacing are tightened modestly. Value microcopy gains a small size, opacity and line-height increase without becoming cards.
- The desktop search panel falls from approximately 211 px to 191 px high and moves 24 px upward. Input and CTA target sizes are preserved; the reduction comes from tabs and internal whitespace. The trust-strip top transition is reduced to match the shallower overlap.
- `Sắp có` remains a truthful disabled state and is now a muted capsule beside each future-service label on desktop, with a compact stacked treatment on narrow mobile tabs.

### H1 responsive QA

| Viewport | H1 result |
| --- | --- |
| 1920 × 1080 | 860 px Hero; panel and preferences are fully visible before the trust strip; no horizontal overflow. |
| 1440 × 900 | 760 px Hero; preference row and complete trust transition remain visible; no horizontal overflow. |
| 1366 × 768 | Panel height is approximately 191 px and the preference row starts around y=728 instead of y=746, making it immediately discoverable; no horizontal overflow. |
| 1024 × 768 | Header uses the tablet menu, the five-part search row and CTA remain readable, and preferences reach the first-viewport boundary without clipping horizontally. |
| 768 × 1024 | Search reflows to two field columns, preferences stay on one compact row, and the trust strip remains lightweight. |
| 390 × 844 | Title, two-line slogan, values, tabs, fields and CTA remain legible; preferences wrap truthfully and there is no horizontal overflow. |

The local environment intentionally exercises the no-CMS color fallback because public Supabase variables are not configured locally. The published CMS photograph and focal crop are therefore visually rechecked on the Vercel deployment after delivery.
