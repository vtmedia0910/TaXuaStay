# Mobile Hero Experience

## Status and scope

This focused UX pass gives the approved Tà Xùa Trip homepage a mobile-first presentation before V2 Phase 5. It changes no roadmap numbering, database schema, CMS permission, search rule or accommodation domain. Desktop remains the accepted locked Hero documented in `docs/V2_HERO_EXPERIENCE_HARDENING.md`.

The implementation boundary is presentation:

```text
>= 1024 px  approved desktop Hero + floating search panel
< 1024 px   visual-first mobile/tablet Hero + search bottom sheet
```

Both layouts share the same published CMS section, media resolver, field components, preference names and native GET submission to `/stay`.

## Baseline problem

Production baseline screenshots at 390×844, 393×873, 412×915, 430×932, 768×1024 and 1024×768 confirmed that the former sub-1024 layout compressed the desktop panel instead of creating a mobile experience. At phone widths the white search panel was about 391 px tall, all four fields were visible immediately, the script slogan occupied 111–123 px, the title grew to about 47–52 px, and the three brand values were squeezed into columns with very small copy. The CTA sat near the viewport bottom while preference chips continued below it.

The new hierarchy is designed for social click-through traffic:

```text
photography → brand → emotion → concise promise → CTA → lightweight trust
```

The full form appears only after the visitor asks to search.

## Mobile Hero composition

- The homepage header remains translucent over the photograph but becomes a compact 64 px surface with a 44 px logo mark, brand title and 44 px hamburger target. Its small slogan is hidden below 1024 px.
- `TÀ XÙA TRIP` remains the only semantic H1 and uses a 40–48 px responsive range.
- The Allura slogan remains live text and uses explicit `Đi thật.` / `Biết trước.` lines on mobile. Desktop keeps the original one-line presentation.
- Mobile uses the concise support copy `Thông tin thật về nơi ở và hành trình — để bạn biết rõ trước khi lên đường.` Desktop copy is unchanged.
- One near-full-width `TÌM PHÒNG PHÙ HỢP` button replaces the initial form.
- THẬT, HIỂU and TRỌN VẸN become compact vertical rows, with no cramped three-column headings.
- The optional `↓ Vuốt để khám phá` cue is subtle and has no animation dependency.
- `100svh`, safe-area padding and an image-preserving directional overlay protect the initial mobile viewport.

## CMS media and focal point

The existing CMS remains the sole source of Hero media:

```text
published mobile Hero → published desktop Hero → code-owned color fallback
```

The responsive `<picture>` now follows the presentation breakpoint: mobile media is preferred below 1024 px and desktop media from 1024 px. Only the current source is requested, with existing optimizer `srcset`, `sizes="100vw"`, eager/high-priority LCP behavior, intrinsic dimensions and independent focal points.

The current production audit resolved the same published asset at phone and desktop widths, so the fallback is working but a dedicated 4:5 or 9:16 mobile photograph is still recommended. The owner can assign it through the existing **Nội dung → Trang chủ → Hero đầu trang** workflow; no migration or new media system is needed.

## Shared search architecture

`HeroSearchFields`, `HeroSearchPreferences` and `HeroServiceTabs` are shared presentation controls. Desktop and mobile submit the existing names directly to `/stay`:

1. `check_in` — Nhận phòng
2. `check_out` — Trả phòng
3. `adults` — Số khách
4. `rooms` — Số phòng

`children=0` remains the hidden compact-entry default. There is no destination or accommodation-type field.

The exact preference set is:

- `verified=1` — Đã thẩm định;
- Săn mây — visibly unavailable because no safe factual filter exists;
- `view_from_bed=1` — View từ giường;
- `car_access=yes` — Ô tô vào được, preserving `unknown | yes | no` semantics.

`Lưu trú` is active. Combo, Xe khách and Xe máy remain disabled and labelled `Sắp có`. Parsing, validation, normalization, filters and pagination continue to use `src/features/search/params.ts`; no mobile resolver or parallel business state was added.

## Search bottom sheet

The lightweight client boundary contains only the interactive sheet. It uses a portal and provides:

- `role="dialog"`, `aria-modal`, an accessible title and explicit close button;
- focus movement into the sheet, Tab/Shift+Tab trapping and Escape close;
- focus restoration to the Hero CTA;
- inert/hidden background and body-scroll lock while open;
- closing any open native mobile menu before the sheet opens;
- scrollable content with `90dvh` maximum height and bottom safe-area padding;
- compact 2×2 service states and field grid;
- native keyboard submission to `/stay` with `XEM PHÒNG PHÙ HỢP`.

The sheet remains scrollable when viewport height shrinks for a virtual keyboard; it does not depend on swipe gestures or a modal/animation library.

## Performance and accessibility

- No package, font, analytics SDK or animation dependency was added.
- The static desktop Hero remains a Server Component; only the mobile CTA/sheet hydrates.
- Hero media is not duplicated and no autoplay video exists.
- H1, slogan, labels and trust text remain live semantic text.
- Controls keep visible focus treatment and minimum 44–56 px targets.
- The native mobile menu remains keyboard-operable and cannot compete with an open sheet.
- Reduced-motion global behavior also shortens the two CSS-only sheet transitions.

## Responsive QA contract

The delivery run captures and reviews the initial Hero plus open sheet at 390×844, 393×873, 412×915 and 430×932; tablet behavior at 768×1024 and 1024×768; and desktop regression at 1366×768 and 1440×900. Checks cover overflow, title scale, forced slogan lines, CTA visibility, sheet fit, focus, keyboard-height behavior, mobile/desktop source selection, trust readability and desktop panel preservation.

Local development intentionally uses the code-owned color fallback when public Supabase variables are absent. Final photographic crop and contrast are therefore judged again on the deployed CMS-backed Vercel page.

## Unchanged domains

Phase 4 economics, public sell pricing, availability, verification, Cloud View, Room Quality, Road Verified, Supplier/Partner, CMS publishing, Admin, `/stay`, `/tim-phong`, SEO/noindex and the independent Tà Xùa Biker boundary are unchanged. V2 Phase 5 Motorbike Integration has not been started.
