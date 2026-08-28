# Phase 3 room-first search and SEO

Phase 3 answers a room-level question:

> Trong ngày tôi đi, loại phòng nào phù hợp với nhu cầu của tôi?

It does not claim that a room is available for the requested dates. The Master Plan remains the architecture reference; this phase implements discovery and SEO only and stops before the Verified Standard in Phase 4.

## Primary route and URL contract

The primary route is:

```text
/tim-phong
```

Supported context parameters:

```text
check_in=YYYY-MM-DD
check_out=YYYY-MM-DD
adults=1..20
children=0..20
rooms=1..10
page=1..1000
```

Check-out must be after check-in. Invalid known parameters fall back to safe defaults and produce a visible message instead of crashing. Unknown parameters are ignored. Normalized URLs use a stable parameter order so dates, guest context, filters, and pagination remain shareable.

Dates and `rooms` are deliberately not availability filters in Phase 3. The data model has no date inventory, and public search never reads physical `room_types.quantity`.

## Supported factual filters

Property filters:

```text
property_type
area
car_access
motorbike_access
parking
wifi
breakfast
restaurant
bbq
```

Room filters:

```text
adult/child/max guest capacity
bathroom type
private balcony
basic view_type
```

Access fields preserve all three database states:

```text
unknown → Chưa xác nhận
yes     → Có
no      → Không
```

A `yes` filter matches only `yes`; it never treats `unknown` as affirmative. Long-tail normalized amenities are included in result DTOs and cards, while the initial filter UI concentrates on the explicit high-value facts above.

## Unsupported future filters

Phase 3 does not implement or simulate:

```text
price or price confidence
availability or sold-out state
Cloud View Verified / Cloud View Score
Road Verified
ratings or reviews
booking status
subjective recommendation labels
```

No database columns were created merely to display disabled marketing controls.

## Data layer and pagination

Public search uses `createPublicSupabaseClient()` and existing anonymous RLS. It never uses the service-role client.

The first request selects an explicit room/property allowlist, applies factual filters in PostgREST, orders deterministically, requests an exact count, and returns 18 rows per page. Media and normalized amenities for those rows are loaded in a fixed four-query batch. The number of round trips does not grow with card count, and hundreds of room cards are not fetched on the first page.

Approved media remains controlled by the Phase 2 media RLS policy. Draft/inactive properties and rooms remain controlled by their public visibility policies.

## Ranking

Within each server-paginated result page, deterministic ranking uses:

1. closer fit to requested guest capacity;
2. featured property as a secondary signal;
3. presence of approved representative media;
4. completeness of description, bed, size, and amenity facts;
5. stable property name, room name, and room ID tie-breakers.

The UI does not expose the score or describe results as AI-selected, best, top-rated, or guaranteed.

## SEO landing pages

Phase 3 provides:

```text
/homestay-ta-xua
/homestay-san-may-ta-xua
/homestay-ta-xua-view-dep
/homestay-cho-couple-ta-xua
/homestay-cho-nhom-ta-xua
/homestay-co-cho-do-o-to-ta-xua
/khach-san-ta-xua
```

Each route has a unique title, description, H1, intro, criteria explanation, canonical URL, related internal links, and room-first discovery results.

Derived rules are transparent application filters:

```text
2 guests → max_guests <= 2 and private/ensuite bathroom
group    → max_guests >= 4
car page → car_access = yes and parking = yes
hotel    → property_type = hotel
```

These rules are not persisted as fabricated suitability labels.

## Cloud/view limitation before Phase 4

The hunting-cloud and view pages use only `view_type = mountain | valley`. They explicitly state that this is not Cloud View Verified, does not include Cloud View Score, and cannot guarantee cloud conditions. Phase 4 can replace this coarse filter with room-linked evidence and the audited scoring rubric without changing the route intent.

## Canonicals, robots, sitemap, and structured data

- `/tim-phong` has canonical `/tim-phong`.
- Parameterized search states are `noindex,follow` to avoid uncontrolled index surfaces.
- Each intent landing, property page, and room page has its own canonical.
- Robots allow public content and disallow `/admin`.
- Sitemap includes homepage, search, seven landing pages, and only properties/rooms visible through anonymous RLS.
- If Supabase is unavailable, sitemap generation returns the static public routes rather than failing the build.
- Property JSON-LD uses `LodgingBusiness` or `Hotel` with current factual fields and approved images only.
- Structured data omits `aggregateRating`, reviews, prices, and availability.

## Deployment requirements

Correct production canonical and data behavior require these public environment variable names:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Do not add a service-role key for public search. After changing Vercel environment values, redeploy production so the Next.js build and runtime receive them.

## Explicit scope stop

Phase 3 adds no migration, fake accommodation data, pricing, inventory, availability, verification score, booking flow, weather, or Biker runtime integration.
