# Tà Xùa Trip public UX direction

## Status

This direction was implemented by **V2 Phase 2.5 — Master Brand + Public UX Migration**. See `docs/V2_PHASE_2_5_MASTER_BRAND_PUBLIC_UX.md` for the exact route and truthfulness contract.

The current public implementation uses the Tà Xùa Trip shell and canonical `/stay` accommodation vertical. Future services remain explicitly marked and non-bookable.

## Target information architecture

```text
/                                      Tà Xùa Trip master homepage
/stay                                  Lưu trú vertical
/stay/[propertySlug]                   accommodation entity
/stay/[propertySlug]/[roomSlug]        room type / verified-room detail
/trip-finder                           future guided decision flow
/combo                                 future trip packages
/bus                                   future bus/transport entry
/motorbike                             future motorbike service entry
/cloud                                 future cloud guide/intelligence
/guide                                 future destination guide
/blog                                  future editorial content
/about                                 brand and verification method
/partner                               future partner acquisition
/my-trip/...                           future private trip experience
```

Target acquisition route concepts include:

```text
/stay/homestay-ta-xua
/stay/khach-san-ta-xua
/stay/homestay-san-may-ta-xua
/stay/homestay-view-tu-giuong-ta-xua
/stay/homestay-cho-couple-ta-xua
```

Create a landing only when first-party data supports materially distinct, useful content. Do not generate thin keyword pages.

Acquisition language may cover these real search-intent clusters when supported by first-party data:

- homestay Tà Xùa;
- homestay săn mây Tà Xùa;
- homestay view đẹp / view mây Tà Xùa;
- homestay view từ giường Tà Xùa;
- homestay Tà Xùa cho couple / cho nhóm;
- homestay có chỗ đỗ ô tô Tà Xùa;
- khách sạn Tà Xùa;
- bungalow Tà Xùa;
- phòng Tà Xùa.

These phrases guide information architecture and helpful content; they are not permission to keyword-stuff, invent data, or publish many near-duplicate pages.

## Public navigation target

```text
TÀ XÙA TRIP

Khám phá
Lưu trú
Combo
Xe khách
Xe máy
Cẩm nang
Về chúng tôi

[Tìm chuyến đi]
```

`Quản trị` must not remain in future public consumer navigation. Admin remains directly reachable at `/admin/login` and retains its authorization boundary.

## Homepage target

The future `/` is a Trip homepage, not the current Stay homepage with a new logo. Recommended order:

1. Hero and honest Trip entry.
2. Trust strip using factual claims only.
3. Why Tà Xùa Trip exists.
4. What the platform does differently.
5. Homestays and rooms verified with real current data.
6. The complete Tà Xùa experience: Lưu trú, Xe khách, Xe máy, Combo.
7. How We Verify.
8. Real current Cloud View rooms.
9. Packages only when real, otherwise omit or label a concept `Sắp có`.
10. Customer proof only when real; otherwise use process proof or omit.
11. Brand statement: `Không bán cái đẹp. Bán cái phù hợp.`
12. Final CTA: `Phần phức tạp để chúng tôi lo.`

Hero direction:

- Eyebrow: `TÀ XÙA • VERIFIED LOCAL TRAVEL`
- H1: `Đi thật. Biết trước.`
- Primary action: `Tìm chuyến đi phù hợp`
- Secondary action: `Xem phòng đã thẩm định`

Until Trip Finder and service backends exist, tabs or service cards must be functional, honestly disabled/previewed, linked to a truthful overview, or omitted. Never simulate booking, inventory, price, packages, reviews, or metrics.

## `/stay` target

- Technical namespace: `/stay`
- Navigation label: `Lưu trú`
- Recommended H1: `Homestay & lưu trú Tà Xùa đã được kiểm tra trước khi bạn đặt.`
- Recommended SEO title concept: `Homestay Tà Xùa: Xem phòng, view thật & giá | Tà Xùa Trip`

The vertical should retain room-first search and surface real room type, Room ID scope, evidence, Cloud View, Road Verified, Room Quality, pros/cons, price confidence, and availability freshness. It must not infer availability from physical quantity or present price as availability.

## Verified accommodation presentation

Property and room experiences should make evidence and scope easy to understand:

- show whether facts apply to the property, room type/sample, or exact Room ID;
- display current verification dates and truthful freshness;
- keep Exact Room Verified, Room Type Verified, Cloud View, Road Verified, Room Quality, price, and availability separate;
- show `Điểm chúng tôi thích` and `Điều bạn nên biết`;
- use exact-room 360/evidence only for the same Room ID;
- never serialize Room Quality as review/aggregate rating or create an overall score;
- use graceful empty states when data is absent or Supabase is unavailable.

## Route and SEO compatibility

Phase 2.5 must inventory existing URLs and map old to new one-to-one. Do not delete valuable routes, redirect everything to `/`, change slugs without need, or index duplicate old/new content.

The migration plan must cover redirects, canonical URLs, sitemap, structured data, internal links, and preservation of query parameters. The temporary `*.vercel.app` deployment remains `noindex,nofollow` until an explicit final brand URL is configured through `NEXT_PUBLIC_SITE_URL`.

The SEO moat is first-party verified data—Cloud View, View From Bed, 360, Room ID, Road Verified, Room Quality, price, and availability—not high-volume `Top 50 Homestay` listicles.

## Phase boundary

Phase 2.5 should be primarily application-level. If a database migration appears necessary, stop and review the need before creating one. Supplier/Partner Phase 3 must not start until the master-brand/public UX migration has been reviewed.
