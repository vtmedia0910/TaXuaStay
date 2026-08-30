# V2 Phase 2.5 — Master Brand + Public UX Migration

Status: **implemented**. Database migrations remain `001–010`; this phase does not change the schema, RLS, pricing, availability, verification ownership, or Admin authorization.

## Public brand and experience

- Master brand: **TÀ XÙA TRIP**.
- Slogan: **Đi thật. Biết trước.**
- Brand values: **THẬT · HIỂU · TRỌN VẸN**.
- Primary consumer vertical: **Lưu trú**; SEO language may use **Homestay Tà Xùa**.
- Public navigation is distinct from Admin and includes responsive desktop/mobile paths for Khám phá, Lưu trú, future services, method content, and brand context.
- The homepage follows the approved journey: hero, real stay search, trust strip, problem statement, evidence-led differences, verified rooms, service states, verification method, Cloud View explanation, brand statement, and final CTA.

Only records returned by the existing anonymous/RLS-safe public resolvers are displayed. Verified cards require current Cloud View data. Empty or unavailable data produces a truthful empty state; sample properties, scores, prices, schedules, stock, ratings, or social proof are never fabricated.

Xe khách, Xe máy, and Combo are visible only as **Sắp có**. They have no booking CTA, schedule, inventory, price, supplier confirmation, or runtime connection. Tà Xùa Biker remains an independent source of truth with no direct database dependency.

## Route map and compatibility

| Historical route | Canonical target | Phase 2.5 behavior |
| --- | --- | --- |
| `/tim-phong` | `/stay` | Same functional search page; metadata canonical is `/stay`. |
| `/homestay/[slug]` | `/stay/[slug]` | Historical route remains reachable; property canonical and all internal links use `/stay/[slug]`. |
| `/homestay/[slug]/phong/[roomSlug]` | `/stay/[slug]/[roomSlug]` | Historical route remains reachable; room canonical and internal links use the new target. |
| `/verified` | `/verified` | Preserved and rebranded as the Tà Xùa Trip verification method. |

The sitemap contains `/stay` and canonical `/stay/...` entity URLs, not the historical compatibility paths. Aggressive redirects are intentionally deferred while the deployment still uses a temporary Vercel hostname.

## Design system

Central semantic tokens live in `src/app/globals.css`:

- Trip Navy `#083D76`
- Cloud Teal `#0EA5A5`
- Mountain Green `#10B981`
- Sunrise Orange `#F59E0B`
- Cloud White `#F8FAFC`
- White `#FFFFFF`
- Ink `#0F172A`

Be Vietnam Pro is loaded through `next/font`. The current mountain/sun wordmark is a code-native temporary placeholder; no fabricated “final logo” is claimed. The final approved vector can replace `TripLogo` later without changing route or domain behavior. The obsolete Tà Xùa Stay OG bitmap was removed; social metadata now uses a code-generated Tà Xùa Trip card.

## Truth boundaries preserved

- Verification, Room Quality dimensions, strengths/caveats, Cloud View, price, and availability remain separate facts.
- Cloud View describes the physical viewing position; it does not forecast weather or guarantee cloud hunting.
- Price and availability remain separate; browsing creates no hold or booking.
- No overall Room Quality score was introduced.
- Temporary Vercel deployment remains `noindex`; the owner enables indexing only by setting `NEXT_PUBLIC_SITE_URL` to the final HTTPS brand domain and redeploying.

## Scope boundary

V2 Phase 3 supplier/partner work has **not** started. This phase adds no Supplier, Partner, Service, Package, Booking, Payment, Bus, motorbike-commerce, Trip Operations, or Trip Dashboard domain.
