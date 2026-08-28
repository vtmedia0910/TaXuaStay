# TÀ XÙA STAY — CODEX MASTER PLAN
## Build an independent accommodation platform using Tà Xùa Biker as technical reference

**Audit date:** 2026-08-28  
**Reference repository:** `vtmedia0910/taxuabiker2`  
**Reference commit:** `9e3e6510bac16211f390b0f24866f9bd850703f1`  
**Target product:** **TÀ XÙA STAY**  
**Brand promise:** **Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.**

---

# 0. MISSION

Build **Tà Xùa Stay** as a NEW and INDEPENDENT web application focused deeply on accommodation in Tà Xùa.

Tà Xùa Biker is a **reference implementation**, not a runtime dependency.

The target system must have:

- its own GitHub repository;
- its own Supabase project/database/auth/storage;
- its own Vercel project;
- its own environment variables and secrets;
- its own Admin;
- its own staff and operating workflow;
- its own booking/customer data;
- no required API/database dependency on Tà Xùa Biker for MVP.

Tà Xùa Stay may copy/adapt sound technical patterns from Biker, especially:

- Next.js project structure;
- Supabase SSR clients;
- Auth/RLS conventions;
- Server Action authorization;
- weather pipeline;
- Cloud Score algorithm;
- content registry;
- import preview/audit/rollback;
- booking token security;
- atomic availability/booking patterns;
- pricing snapshots;
- Admin shell;
- SVG map projection;
- testing conventions.

Do **not** convert the existing Biker production repository in-place.

---

# 1. NON-NEGOTIABLE RULES FOR CODEX

## 1.1 Never modify the Biker repository

`vtmedia0910/taxuabiker2` is production/reference software.

Do not:

- commit to it;
- change its migrations;
- rewrite history;
- delete or rename Biker functionality;
- use its production Supabase as Stay storage.

All implementation work must happen in the NEW Tà Xùa Stay repository.

## 1.2 Separate infrastructure

Tà Xùa Stay must use:

```text
NEW GitHub repo
NEW Supabase project
NEW Vercel project
NEW environment variables
NEW database migrations
NEW Auth users
NEW Storage buckets
```

No shared database for MVP.

## 1.3 Read Next.js local agent documentation first

The Biker repo uses Next.js 16 and its `AGENTS.md` explicitly warns that framework APIs/conventions may differ from prior knowledge.

Before making framework-level changes, inspect the relevant documentation from:

```text
node_modules/next/dist/docs/
```

Follow deprecation notices.

## 1.4 Quality gates before every completed implementation phase

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Do not commit a phase until its relevant checks pass.

## 1.5 Never commit secrets

Do not commit:

- `.env`;
- Supabase service-role key;
- Telegram bot token;
- database password;
- API secrets;
- Vercel secrets;
- private customer information;
- generated build/cache output.

Provide `.env.example` names only.

## 1.6 Database migration discipline

For the NEW Stay project, start with clean Stay migrations.

Once a migration has been applied to a remote environment:

- never edit it;
- add a new migration;
- keep changes additive and reviewable.

Do not replay all Biker migrations into Stay.

---

# 2. PRODUCT POSITIONING

Tà Xùa Stay is NOT intended to be another generic destination directory.

Its core job is:

> Given the travel dates, guest needs, budget and desired experience, help the customer identify the correct room, understand the actual view, know the price confidence and availability confidence, then submit a booking request quickly.

Core differentiator:

```text
PROPERTY DIRECTORY
        +
ROOM-LEVEL DATA
        +
TÀ XÙA STAY VERIFIED STANDARD
        +
VIEW THẬT
        +
CLOUD VIEW VERIFIED
        +
ROAD ACCESS VERIFIED
        +
PRICE / AVAILABILITY FRESHNESS
        +
BOOKING REQUEST
```

The product should reduce these fears:

- “Ảnh đẹp nhưng phòng nhận không giống ảnh.”
- “Homestay nói có view nhưng phòng của tôi không có.”
- “Phải nhắn nhiều nơi mới biết giá.”
- “Đến lúc hỏi thì đã hết phòng.”
- “Ô tô không vào được như tôi tưởng.”
- “Tôi chọn sai vị trí cho mục tiêu săn mây.”
- “Tôi không biết dữ liệu này được cập nhật từ bao giờ.”

---

# 3. BRAND

Use:

```text
TÀ XÙA STAY
Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.
```

Product terminology:

- **View Thật** — verified visual evidence from the actual room/view position.
- **Cloud View Verified** — physical room-view verification.
- **Road Verified** — verified road/access information.
- **Price Verified** — price freshness/confidence.
- **Availability Verified** — availability freshness/confidence.
- **Room Verified** — room facts/evidence inspected or validated.
- **Property Verified** — identity/location/contact validation.

Important distinction:

```text
Cloud View Score
= physical quality of the room's viewing position
= relatively stable

Cloud Forecast / Cloud Score
= weather opportunity at a given time/location
= changes over time
```

Never imply that a high Cloud View Score guarantees actual cloud occurrence.

---

# 4. REFERENCE STACK TO KEEP

The audited Biker project currently uses a strong stack that should remain unless there is a concrete reason to change it:

```text
Next.js 16.x App Router
React 19.x
TypeScript
Tailwind CSS 4
Supabase PostgreSQL
Supabase Auth
Supabase RLS
Supabase Storage
@supabase/ssr
Zod
Vitest
Testing Library
Lucide
Excel import/export libraries
Open-Meteo
```

For Stay, QRCode is optional. Keep it only if implementing Verified-room/property QR later.

---

# 5. CODE REUSE AUDIT

Use four categories:

```text
A. REUSE AS FOUNDATION
B. REUSE WITH MODIFICATION
C. REMOVE / DO NOT PORT
D. BUILD NEW
```

---

# 6. A — REUSE AS FOUNDATION

These areas are structurally valuable and should be copied into the new Stay codebase or recreated very closely, then pointed at the NEW Stay Supabase project.

## 6.1 Tooling / project foundation

Reference:

```text
package.json
tsconfig.json
eslint.config.mjs
postcss.config.mjs
vitest.config.mts
next.config.ts
.gitignore
.env.example
AGENTS.md
```

Actions:

- rename package from Biker to Stay;
- review image domains/headers in `next.config.ts`;
- create Stay-specific `.env.example`;
- copy quality scripts;
- preserve agent safety workflow;
- remove dependencies that become unused.

## 6.2 Supabase client architecture

Reference:

```text
src/lib/supabase/admin.ts
src/lib/supabase/config.ts
src/lib/supabase/public.ts
src/lib/supabase/server.ts
```

Reuse the pattern:

```text
public anon client
session-aware server client
server-only service-role client
```

All clients must point to Stay Supabase.

## 6.3 Auth / authorization pattern

Reference:

```text
src/features/admin/auth.ts
src/features/admin/authz.ts
src/features/admin/auth-actions.ts
src/proxy.ts
```

Keep:

```text
app_metadata.role
admin
staff
```

Never authorize based on user-editable metadata.

Stay role needs for MVP:

```text
admin
staff
```

Potential Phase 2:

```text
partner
```

Do not introduce `partner` until Partner Portal requirements are actually implemented.

## 6.4 Generic UI primitives

Reference:

```text
src/components/ui/*
src/components/feedback/*
src/components/admin/admin-page-header.tsx
src/components/admin/form-feedback.tsx
src/components/admin/submit-button.tsx
src/components/admin/admin-multi-filter.tsx
```

These are reusable infrastructure.

Re-theme for Stay where required, but avoid rebuilding basic primitives without reason.

## 6.5 Generic image validation / managed media patterns

Reference:

```text
src/lib/images.ts
src/components/media/managed-image.tsx
src/components/admin/image-url-field.tsx
```

Use as starting points.

Stay will need a richer media domain, but existing safe URL/render patterns are valuable.

---

# 7. B — REUSE WITH MODIFICATION

## 7.1 Weather engine

Reference directory:

```text
src/features/weather/
```

Important files:

```text
config.ts
provider.ts
providers/open-meteo.ts
normalize.ts
service.ts
freshness.ts
hourly-fallback.ts
hourly-snapshot.ts
types.ts
```

Port the algorithm into Stay.

Do NOT make Stay call Biker for weather in MVP.

Stay should have its own:

```text
weather_snapshots
weather_forecast_snapshots
```

Use independent caches/snapshots.

Preserve behavior:

- provider results are normalized;
- current and hourly have independent failure behavior;
- failed provider requests are not cached as fake empty success;
- fallback uses recent snapshots;
- UI distinguishes fresh/stale/degraded/unavailable;
- never fabricate weather values.

### Stay-specific adaptation

A property may be used as a weather location, but avoid unnecessary API calls for every room.

Recommended:

```text
property or area
    ↓
weather_location_key
    ↓
weather bundle
```

Room types inside one property normally share the same weather forecast.

## 7.2 Cloud Score algorithm

Reference:

```text
src/features/cloud/config.ts
src/features/cloud/score.ts
src/features/cloud/ranking.ts
```

Port this as the **environmental Cloud Forecast Score**, not as the Stay room-view score.

It currently uses explainable weather signals including:

- precipitation probability;
- precipitation amount;
- visibility;
- wind;
- humidity;
- low/mid/high cloud cover;
- confidence based on available data;
- safety overrides.

Retain tests.

### Naming in Stay

Prefer:

```text
Cloud Forecast
Cloud Forecast Score
```

Do not label it merely “Cloud View”.

## 7.3 SVG map projection

Reference:

```text
src/features/map/
public/maps/
```

Useful pieces:

```text
projection.ts
codes.ts
map-page-client.tsx
ta-xua-experience-base.svg
```

Adapt for property markers.

Stay map should primarily answer:

> “Homestay này nằm ở khu nào và gần điểm gì?”

It is NOT turn-by-turn navigation.

Keep outbound Google Maps links for navigation.

## 7.4 Places / local POI model

Reference:

```text
src/features/places/
```

Do NOT use `places` as the main accommodation entity.

Stay needs a dedicated `properties` domain.

However, an independent Stay `places` or `points_of_interest` dataset may be used for:

- Sống Lưng Khủng Long;
- Mỏm Cá Heo;
- Cây Cô Đơn;
- trung tâm Tà Xùa;
- cafés;
- restaurants;
- viewpoints.

Properties can calculate distance to these POIs.

## 7.5 Road alerts

Reference:

```text
src/features/road-alerts/
```

Adapt if Stay wants current local warnings.

Keep static and realtime concepts separate:

```text
Road Verified
= stable property access assessment

Road Alert
= temporary regional/property warning
```

## 7.6 Content registry

Reference:

```text
src/features/content/
src/config/content.ts
```

Reuse the registry/whitelist approach.

Admin may edit registered copy such as:

- homepage heading;
- intro text;
- CTA copy;
- Verified explainer;
- SEO intro;
- FAQ copy.

Admin content must NOT control:

- security;
- RLS;
- booking state machine;
- price calculation;
- Cloud scoring rules;
- availability logic.

## 7.7 Import engine

Reference:

```text
src/features/imports/
src/app/admin/(protected)/imports/
```

This is one of the most valuable reusable patterns.

Keep conceptual pipeline:

```text
XLSX/CSV
→ detect allowed template
→ normalize
→ validate
→ deterministic match
→ diff/preview
→ user selects rows
→ apply
→ audit
→ safe rollback
```

Rewrite domain-specific schemas for Stay.

Do not blindly reuse Biker place columns.

## 7.8 Booking security pattern

Reference:

```text
src/features/rental/token.ts
docs/BOOKING_ENGINE.md
```

Reuse:

- 32 random bytes;
- base64url raw token;
- SHA-256 hash only in DB;
- no raw token storage;
- controlled server lookup;
- allow-listed public DTO;
- generic recovery state for invalid/expired/revoked access;
- booking pages `noindex`.

Stay path example:

```text
/dat-phong/[token]
```

or:

```text
/booking/[token]
```

Choose one canonical route and use it consistently.

## 7.9 Pricing snapshot principle

Do not reuse motorbike pricing math.

Reuse the business invariant:

> A confirmed/requested booking keeps a price snapshot; changing current rates later must not silently reprice historical bookings.

Stay booking should snapshot:

```text
currency = VND
night_count
room_quantity
nightly_rate_lines
subtotal
discount_amount
fee_amount
total_amount
pricing_policy_version
rate_source
price_verified_at
```

All monetary fields should use integer VND.

## 7.10 Atomic availability principle

Reuse the Biker architecture:

```text
public check
→ atomic re-check during booking creation
→ atomic re-check during confirmation
```

Use PostgreSQL transaction/advisory locking or equivalent safe concurrency.

Do not copy motorbike capacity semantics directly.

For rooms, use date overlap:

```text
[check_in, check_out)
```

End/check-out date is exclusive for inventory blocking.

## 7.11 Telegram notification

Reference:

```text
src/features/telegram/
```

Reuse client/error handling pattern.

Rewrite Stay message formatter.

A notification failure must not roll back a valid booking request.

Potential message:

```text
NEW TÀ XÙA STAY REQUEST
Booking: TXS-XXXX
Property:
Room:
Check-in:
Check-out:
Guests:
Price snapshot:
Availability confidence:
Customer:
```

Never log bot token.

---

# 8. C — REMOVE / DO NOT PORT

Do not carry Biker-specific operational domains into Stay.

## 8.1 Fleet

Remove:

```text
src/features/fleet/**
src/app/admin/(protected)/fleet/**
```

## 8.2 Motorbike management

Remove:

```text
src/app/admin/(protected)/motorbikes/**
src/components/admin/motorbike-form.tsx
```

## 8.3 Public vehicle identity / QR routes

Remove from MVP:

```text
src/app/(public)/xe/**
src/app/(public)/q/**
```

A future Stay Verified QR system may reuse the idea, but implement it as a Stay-specific domain later.

## 8.4 Rental public UI

Remove:

```text
src/app/(public)/thue-xe/**
src/app/(public)/dat-xe/**
src/components/rental/**
```

## 8.5 Rental domain

Do NOT port as a functioning domain:

```text
src/features/rental/**
```

Read it as reference for:

- state machines;
- token handling;
- pricing snapshots;
- validation;
- availability;
- transaction locking;
- customer normalization.

Then implement a clean Stay booking domain.

## 8.6 Rental settings

Remove:

```text
src/app/admin/(protected)/rental-settings/**
src/components/admin/rental-settings-form.tsx
```

Replace with Stay rate/inventory/settings modules.

## 8.7 Fleet / rental migrations

Do not replay Stay against:

```text
202608250005_phase5_rental_booking_mvp.sql
202608250006_phase5_1_booking_refinement.sql
202608250007_booking_hours_and_rpc_fix.sql
202608280003_fleet_qr_identity.sql
202608280004_digital_handover.sql
```

Do not bulk replay the other Biker migrations either.

Create clean Stay migrations using good patterns from them.

---

# 9. D — BUILD NEW DOMAINS

Create dedicated feature directories such as:

```text
src/features/properties/
src/features/rooms/
src/features/amenities/
src/features/media/
src/features/verification/
src/features/rates/
src/features/inventory/
src/features/stay-bookings/
src/features/search/
src/features/referrals/
```

Potential later:

```text
src/features/partners/
src/features/reviews/
src/features/payments/
```

Do not create Partner/Review/Payment functionality in MVP unless explicitly requested.

---

# 10. DATABASE DESIGN — MVP

The following is a target model. Codex must convert it into normalized PostgreSQL migrations with proper constraints, indexes, RLS and timestamps.

---

# 11. `site_settings`

Single-row settings table, based on Biker pattern.

Suggested fields:

```text
id = 'main'
site_name
tagline
hotline
zalo_url
facebook_url
tiktok_url
address
google_maps_url

announcement
announcement_enabled

hero_title
hero_subtitle

biker_rental_url
biker_cross_sell_enabled

created_at
updated_at
updated_by
```

Default brand:

```text
site_name = TÀ XÙA STAY
tagline = Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.
```

---

# 12. `properties`

A property is the lodging/business entity.

Suggested:

```text
id uuid PK
slug unique
name
property_type
short_description
description

address
area_name
latitude
longitude
altitude_m optional
google_maps_url

public_phone optional
public_zalo_url optional

check_in_time
check_out_time

road_access_grade
car_access
motorbike_access
parking

restaurant
breakfast
bbq
wifi

is_featured
is_active
publish_status
archived_at

verification_status
property_verified_at
location_verified_at

cover_media_id optional

created_at
updated_at
updated_by
```

Property types:

```text
homestay
bungalow
hotel
guesthouse
glamping
other
```

Do not create dozens of permanent boolean columns for every amenity. Core high-value operational fields can be columns; extended facilities belong in amenities.

---

# 13. `room_types`

Room type is the key transaction/search entity.

Suggested:

```text
id uuid PK
property_id FK

slug
name
short_description
description

capacity_adults
capacity_children
max_guests

bed_type
bed_count
bathroom_type

quantity

size_m2 optional
floor_label optional

has_private_balcony
view_type

is_active
publish_status

room_verified_at

created_at
updated_at
updated_by
```

Constraint:

```text
unique(property_id, slug)
```

Examples:

```text
Bungalow Panorama
Double Mountain View
Family Room
Dorm
```

---

# 14. Amenities

Use normalized many-to-many structure:

```text
amenities
property_amenities
room_amenities
```

Amenity:

```text
id
slug
name
category
icon_key
is_active
sort_order
```

Possible categories:

```text
room
bathroom
food
parking
comfort
family
outdoor
policy
```

---

# 15. `media_assets`

Do not model Stay media as only one URL per room/property.

Use an evidence-aware media table.

Suggested:

```text
id uuid PK

property_id nullable
room_type_id nullable

media_type
evidence_type

url
thumbnail_url optional
caption
alt_text

sort_order

captured_at
captured_by_user_id nullable

latitude nullable
longitude nullable
compass_heading_deg nullable
horizontal_fov_deg nullable

is_verified
verified_at
verified_by_user_id nullable

created_at
updated_at
```

`media_type`:

```text
photo
video
panorama_360
```

`evidence_type`:

```text
property
room
bathroom
view_from_room
view_from_bed
balcony
road_access
parking
food
sunrise
verification
other
```

Validation:

- URLs must be HTTPS.
- Prefer Stay-owned Supabase Storage.
- Verification evidence must not silently be replaced with unrelated marketing photography.

---

# 16. 360° STANDARD

360 is a flagship evidence layer.

For a verified room, support two panorama positions where possible.

## Panorama A — Room Interior

Camera position:

- center of usable room or a representative standing position;
- intended to show real proportions and layout.

Must allow the guest to inspect:

```text
bed
door
window
bathroom
balcony
room proportions
```

## Panorama B — Actual View Position

Capture from the physical location a guest would actually use to view scenery:

```text
balcony
window
bedside
private terrace
```

Store:

```text
captured_at
latitude
longitude
compass heading
room_type_id
evidence_type
verification status
```

Do not:

- use drone panoramas as room evidence;
- use a shared café panorama to represent a private room;
- digitally replace scenery;
- use aggressive zoom to exaggerate the view.

MVP may store panorama assets before the final immersive viewer is fully polished.

Pilot first with a limited set of high-value properties/rooms.

---

# 17. VERIFICATION ARCHITECTURE

Use one generic audit record plus specialized score/detail tables.

## `verification_records`

Suggested:

```text
id
entity_type
entity_id
verification_type

status
method
notes

verified_at
expires_at
verified_by_user_id

evidence_count
created_at
```

Entity type examples:

```text
property
room_type
media_asset
rate
road
```

Verification type examples:

```text
identity
location
room
cloud_view
road_access
price
availability
media_360
```

Statuses:

```text
pending
verified
expired
rejected
needs_review
```

---

# 18. TÀ XÙA STAY VERIFIED STANDARD

Consumer badges:

```text
Property Verified
Room Verified
Cloud View Verified
Road Verified
Price Verified
Availability Verified
360° Verified
```

Verification must expire or become stale.

Suggested freshness:

```text
Property identity: 12 months
Room facts: 12 months or renovation
Cloud View: 12 months or obstruction/construction change
Road access: 6 months / after major weather-event review
Price: governed by valid_from / valid_until
Availability: hours, not months
```

Show `last_verified_at` publicly where it improves trust.

---

# 19. CLOUD VIEW VERIFIED — OBJECTIVE ROOM SCORE

This is NOT weather probability.

Score physical view quality on a 0–10 scale using an auditable weighted rubric.

Store raw component scores so two inspectors can be compared.

Recommended rubric, 100 total points:

## A. Direct cloud-basin / valley visibility — 30 points

```text
0  = no relevant open valley/basin view
10 = narrow / weak angle
20 = clear relevant valley view
30 = broad and direct relevant cloud-basin view
```

## B. Horizontal usable view width — 20 points

Measured/estimated from the actual guest viewing position.

```text
0  = very narrow / effectively blocked
5  = < 30°
10 = 30–60°
15 = 60–100°
20 = > 100° useful open view
```

## C. Obstruction quality — 15 points

```text
0  = major close obstruction
5  = substantial roof/tree/building obstruction
10 = limited obstruction
15 = almost unobstructed
```

## D. View from bed — 15 points

```text
0  = no
5  = visible only by standing/moving
10 = visible while sitting/turning from bed
15 = strong direct view from normal resting position
```

## E. Private viewing position — 10 points

```text
0  = only shared/common area
5  = room window / semi-private
10 = private balcony/terrace/large private window
```

## F. Sunrise / orientation usefulness — 5 points

```text
0 = not useful / unknown
3 = partially suitable
5 = strong orientation for intended sunrise experience
```

Do not award this purely from marketing claims; verify orientation with compass/GPS/actual capture.

## G. Evidence quality & freshness — 5 points

```text
0 = unsupported/stale
2 = recent normal photographs
5 = recent verified photo + panorama/evidence metadata
```

Final score:

```text
Cloud View Score = total_points / 10
```

Example:

```text
92 points → 9.2 / 10
```

Store each component separately.

Do not allow admin to type an unexplained 9.2 directly.

---

# 20. CLOUD VIEW CONSUMER LABELS

Example mapping:

```text
9.0–10.0  Xuất sắc
8.0–8.9   Rất tốt
6.5–7.9   Tốt
5.0–6.4   Một phần
3.0–4.9   Chủ yếu ở khu chung
0–2.9     Không phù hợp nếu mục tiêu là săn mây tại phòng
```

Also show direct facts:

```text
Ngắm từ giường: Có/Không
Ban công riêng: Có/Không
Hướng view: Đông / Đông Nam / ...
View position: Private / Shared
Verified at: date
```

Do not reduce all evidence to a single score.

---

# 21. ROAD VERIFIED

Create a dedicated structured assessment.

Suggested grade:

```text
A — Easy
B — Moderate
C — Difficult
D — No direct car access
```

Store:

```text
car_access
motorbike_access
sedan_access
road_surface
steepness_notes
narrow_section
rain_risk_notes
parking_location
walk_from_parking_m
verified_at
```

Require:

- representative road photo;
- photo/video of hardest segment if relevant;
- GPS/property location;
- human notes.

Public wording must avoid false precision.

---

# 22. RATE / PRICE MODEL

Do not force one fixed price all year.

Use rate rules.

## `rate_plans`

Suggested:

```text
id
property_id
name
currency
is_active
valid_from
valid_until
created_at
updated_at
```

## `room_rate_rules`

Suggested:

```text
id
rate_plan_id
room_type_id

rate_type
day_of_week_mask optional
date_from optional
date_to optional

price_vnd
extra_adult_vnd
extra_child_vnd

priority
created_at
updated_at
```

`rate_type`:

```text
weekday
weekend
peak
holiday
override
```

A deterministic resolver must calculate the applicable nightly price.

Never silently choose between conflicting same-priority rules; fail/admin-alert instead.

---

# 23. PRICE CONFIDENCE

Public status:

```text
verified
recent
reference
unknown
```

Examples:

```text
🟢 950.000đ — Giá đã xác minh
🟡 Khoảng 850–950k — Cập nhật gần đây
⚪ Giá tham khảo — Cần xác nhận
```

Suggested fields or derived state:

```text
price_verified_at
price_valid_until
price_source
```

Do not display exact “verified” price after its validity has expired.

---

# 24. INVENTORY / AVAILABILITY

Create an availability architecture that works before all partners adopt realtime inventory.

## `room_inventory`

Suggested:

```text
id
room_type_id
date
available_quantity
price_override_vnd nullable
source
verified_at
updated_by
created_at
updated_at
```

Unique:

```text
(room_type_id, date)
```

Sources:

```text
partner
admin
booking_engine
import
```

## Availability confidence

Use:

```text
live
verified_today
needs_confirmation
unknown
sold_out
```

Possible freshness rule:

```text
< 6h    = verified/fresh
6–24h   = recent
> 24h   = needs confirmation
```

Exact thresholds should be configurable or centrally defined.

Never show “Còn phòng” if the system has no trustworthy evidence.

---

# 25. BOOKING REQUEST — PHASE 1

No account required.

No online payment in MVP.

Flow:

```text
Select room
↓
Select dates
↓
Guest count
↓
Availability / confidence check
↓
Customer name
Phone
Zalo optional
Note optional
↓
Create Booking Request
↓
Booking code + private token
↓
Admin verifies with property if necessary
↓
Confirmed / Cancelled
```

Core statuses:

```text
pending
confirmed
cancelled
completed
```

Potential later:

```text
no_show
expired
```

Do not overbuild state transitions before actual operations require them.

---

# 26. `customers`

Independent Stay customers.

Suggested:

```text
id
name
phone
phone_normalized
email optional
zalo optional

created_at
updated_at
```

Normalize phone with a tested helper adapted from Biker patterns.

Do not share Biker customer DB.

---

# 27. `stay_bookings`

Suggested:

```text
id uuid PK
booking_code unique

property_id
room_type_id

check_in date
check_out date

adults
children
room_quantity

customer_id
customer_name_snapshot
customer_phone_snapshot
customer_email_snapshot optional

status

availability_confidence_at_request
availability_verified_at

currency
night_count
subtotal_vnd
discount_vnd
fee_vnd
total_vnd

pricing_snapshot jsonb
pricing_policy_version

source
referral_code optional

public_token_hash
public_token_expires_at optional
public_token_revoked_at optional

note

confirmed_at
cancelled_at
completed_at

created_at
updated_at
```

Use snapshots so customer/price edits do not rewrite booking history.

---

# 28. `stay_booking_events`

Append-only audit timeline.

Suggested:

```text
id
booking_id
event_type
from_status
to_status
actor_user_id nullable
metadata jsonb
created_at
```

Do not use arbitrary metadata as the source of core booking facts.

Core state remains in normalized booking columns.

---

# 29. BOOKING AVAILABILITY SAFETY

At minimum:

## Step 1 — Public check

Return availability confidence and candidate rooms.

## Step 2 — Atomic create

Within database-controlled logic:

- validate dates;
- validate room active;
- re-check trusted inventory if applicable;
- calculate price snapshot;
- create customer;
- create booking;
- write event;
- optionally create temporary hold only when inventory model supports it.

## Step 3 — Atomic confirm

Before `pending → confirmed`:

- re-check confirmed overlapping inventory;
- re-check available quantity;
- refuse confirmation if it would overbook trusted inventory.

Use the same locking strategy for competing confirms.

---

# 30. SEARCH ENGINE — ROOM FIRST

Core route:

```text
/tim-phong
```

Inputs:

```text
check_in
check_out
adults
children
rooms
```

Filters:

```text
price
property type
area
Cloud View Verified
Cloud View Score
view from bed
private balcony
road grade
car access
parking
bathroom
breakfast
restaurant
BBQ
Wi-Fi
couple
family
group
```

Search results should answer:

> “Which room fits me?”

not only:

> “Which homestays exist?”

---

# 31. SEARCH RESULT CARD

Keep card concise.

Suggested:

```text
[IMAGE FROM ACTUAL PROPERTY/ROOM]

Property
Area

☁ Cloud View Verified
🛏 View from bed
🚗 Car access

Room candidate / starting room
Price confidence
Availability confidence

[XEM PHÒNG]
```

Do not overload cards with all data.

---

# 32. PROPERTY DETAIL ROUTE

Canonical:

```text
/homestay/[slug]
```

Even if property type is hotel/bungalow, this route is acceptable for initial SEO consistency, but Codex should keep the model type-neutral internally.

Sections:

```text
Gallery
Property title / location
Quick facts
Verified summary
Rooms
Amenities
Local Intelligence
Weather / Cloud Forecast
Road Verified
Nearby POIs
Map
Policies
Booking CTA
```

Do not render as a long blog article.

---

# 33. ROOM DETAIL / DEEP LINK

Strongly recommended:

```text
/homestay/[propertySlug]/phong/[roomSlug]
```

Room page is where the strongest differentiation lives:

```text
Room photos
360 interior
360 view
Cloud View Score
View from bed
Private/shared position
Beds/capacity
Bathroom
Amenities
Rate
Availability freshness
View evidence
Booking CTA
```

---

# 34. PUBLIC VERIFIED PAGE

Create:

```text
/verified
```

Explain clearly:

- what “Verified” means;
- what it does NOT mean;
- how Cloud View is measured;
- how fresh price/availability statuses work;
- why weather cannot be guaranteed.

This page should support trust and SEO.

---

# 35. HOMEPAGE

Mobile-first.

Primary hero:

```text
TÌM CHỖ Ở TÀ XÙA

Check-in
Check-out
Guests

[TÌM PHÒNG]
```

Immediately below, emphasize product advantage:

```text
Cloud View Verified
View Thật
Giá rõ hơn
Đường vào đã kiểm tra
```

Then curated categories:

```text
Phòng săn mây
Dành cho couple
Gia đình đi ô tô
Nhóm bạn
Gần trung tâm
Giá tốt
```

Avoid long promotional hero copy before search.

---

# 36. SEO ROUTES

At minimum plan static/dynamic landing pages for:

```text
/homestay-ta-xua
/homestay-san-may-ta-xua
/homestay-ta-xua-view-dep
/homestay-cho-couple-ta-xua
/homestay-cho-nhom-ta-xua
/homestay-co-cho-do-o-to-ta-xua
/khach-san-ta-xua
```

SEO pages should be useful filtered discovery pages, not thin duplicate keyword pages.

Generate:

- metadata;
- canonical URLs;
- sitemap;
- robots;
- structured data where factually supported.

Never fabricate ratings/reviews.

---

# 37. ADMIN INFORMATION ARCHITECTURE

Replace Biker Admin navigation with Stay-oriented modules.

Recommended MVP Admin:

```text
Tổng quan
Booking Requests
Homestays
Phòng
Availability
Giá / Rate Plans
Verification
Media / 360
Khách hàng
Amenities
Import
Nội dung / SEO
Địa điểm / POI
Cảnh báo đường (if enabled)
Settings
```

Phase 2:

```text
Partners
Partner Portal
Reviews
Promotions
Commission
```

Do not include Biker:

```text
Fleet Board
QR đội xe
Hồ sơ xe
Cấu hình thuê xe
Handover
```

---

# 38. ADMIN DASHBOARD

Useful cards:

```text
Pending booking requests
Bookings awaiting property confirmation
Today check-ins
Today check-outs
Rooms needing availability refresh
Prices expiring soon
Verification expiring soon
Properties missing room data
Rooms missing View evidence
```

Data-quality work is a first-class operational task.

---

# 39. IMPORT WORKBOOK

Adapt the Biker import architecture to accommodation.

Recommended sheets:

```text
Properties
Rooms
Amenities
PropertyAmenities
RoomAmenities
Rates
Verification
Media
Inventory (optional)
```

## Properties columns

Example:

```text
property_id optional
slug
name
property_type
area_name
address
latitude
longitude
phone
google_maps_url
check_in_time
check_out_time
car_access
road_access_grade
parking
restaurant
breakfast
bbq
wifi
publish_status
```

## Rooms columns

```text
room_id optional
property_slug
room_slug
name
capacity_adults
capacity_children
max_guests
bed_type
bed_count
bathroom_type
quantity
size_m2
has_private_balcony
view_type
publish_status
```

## Rates

```text
property_slug
room_slug
rate_type
valid_from
valid_until
price_vnd
extra_adult_vnd
extra_child_vnd
```

## Verification

```text
property_slug
room_slug
verification_type
status
verified_at
expires_at
component scores...
notes
```

Keep import semantics:

- blank cell = no implicit destructive clear unless explicitly designed;
- deterministic matching;
- preview before apply;
- audit before/after;
- conflict-aware rollback;
- new imported rows default to review/draft when appropriate.

---

# 40. WEATHER + ROOM EXPERIENCE

On a verified room detail page:

```text
Cloud View Verified: 9.2 / 10
View from bed: Yes
Private balcony: Yes

Weather opportunity:
Cloud Forecast: 8.4 / 10
Confidence: High
Updated: ...
Warnings: ...
```

Never combine the physical View score and changing forecast into a fake probability like:

```text
“92% chắc chắn săn được mây”
```

unless a future statistical model is separately validated.

A safe recommendation can be rule-based:

```text
View is strong
AND Cloud Forecast is strong
AND no safety override
→ “Điều kiện hiện tại đáng cân nhắc ngắm mây tại phòng”
```

---

# 41. BIKER CROSS-SELL — SEPARATE SYSTEMS

Stay must not create Biker rental records directly in MVP.

After a Stay booking/request, show:

```text
Bạn cần xe máy cho chuyến này?
[THÊM XE MÁY]
```

Deep link to Biker.

Example:

```text
https://<BIKER_DOMAIN>/thue-xe
  ?from=2026-11-15
  &to=2026-11-17
  &source=taxua_stay
  &ref=<opaque-short-ref>
```

Rules:

- prefill dates where Biker supports it;
- never put customer name/phone/email in query string;
- use only an opaque non-sensitive referral value;
- open same tab or clearly labeled external product;
- Biker remains responsible for its own rental availability and booking.

Stay may track:

```text
outbound_referral_created
outbound_referral_clicked
```

Do not claim a Biker rental is booked until Biker says so.

---

# 42. COMBO MODEL — MVP

Do not build a monolithic multi-service booking engine yet.

Support commercial combos through benefits/referrals.

Customer types:

```text
Stay only
Bike only (handled by Biker)
Stay + Bike
Stay + Bus later
Stay + Bike + Bus later
```

Potential Stay benefit:

```text
free bike delivery to partner homestay
rental discount
partner café benefit
Cloud Alert
personalized itinerary
```

The systems can remain separate while marketing presents a connected journey.

---

# 43. REFERRAL DATA

Suggested:

```text
referral_events

id
source_product
target_product
opaque_ref
stay_booking_id nullable
event_type
created_at
```

Never store Biker booking internals as Stay source of truth unless future integration explicitly provides them.

Optional future fields:

```text
external_booking_code
external_status
```

Only add if a real API/operational need exists.

---

# 44. SECURITY STANDARD

Apply throughout Stay:

- RLS on all sensitive tables.
- No anonymous direct writes.
- Controlled server actions/RPCs.
- Validate inputs in TypeScript with Zod.
- Validate critical invariants again in PostgreSQL.
- Service-role client server-only.
- Admin routes require session + app metadata role.
- Public booking token stored only as hash.
- Booking private pages noindex/noarchive.
- Public DTOs allow-list fields.
- Do not return customer lists publicly.
- Do not expose internal partner phone/private contacts unless explicitly public.
- Use fixed/empty `search_path` for security-definer functions.
- Audit meaningful booking/status transitions.
- Rate-limit public booking endpoints at infrastructure level for production.

---

# 45. RLS PATTERN TO BORROW

From the Biker reference architecture, keep the concept:

```text
current_app_role()
is_admin()
is_staff_or_admin()
```

Use:

```text
auth.jwt() -> 'app_metadata' ->> 'role'
```

Do not trust `user_metadata`.

For public tables:

- public can read only published/active/public-safe rows;
- authenticated staff/admin get broader rows via RLS;
- admin-only destructive/settings operations.

Use column-level grants or controlled views/RPCs where sensitive columns coexist with public-safe rows.

---

# 46. STORAGE

Create Stay-specific buckets, e.g.:

```text
property-media
room-media
verification-media
panorama-media
road-media
```

Decide public/private intentionally.

Public marketing/verified evidence may use public read URLs.

Private operational evidence should not be automatically public.

Never store secrets in Storage metadata.

---

# 47. DESIGN SYSTEM

The Biker design system uses a useful Tà Xùa family palette:

```text
forest
cloud/off-white
surface
charcoal
amber
success/warning/danger
```

Stay may preserve family resemblance but should NOT look like a renamed Biker.

Stay should be:

- more image-first;
- larger room photography;
- calmer lodging purchase flow;
- stronger price/availability hierarchy;
- more trust/evidence badges;
- gallery/360-centered;
- sticky booking CTA on mobile.

Keep mobile-first support approximately:

```text
360px
390px
430px
```

Accessibility requirements:

- visible focus;
- semantic labels;
- touch targets;
- reduced-motion support;
- meaningful image alt;
- keyboard-usable filters/viewer controls.

---

# 48. REMOVE BIKER BRAND COPY

Search the copied source for:

```text
TÀ XÙA BIKER
Tà Xùa Biker
Đi đúng đường
Săn đúng mây
thue-xe
dat-xe
motorbike
fleet
handover
```

Do not perform blind global replacements.

Classify each occurrence first.

The Stay product must not retain accidental Biker routes, copy, emails, links or analytics.

---

# 49. RECOMMENDED NEW FILE/FOLDER SHAPE

Example:

```text
src/
  app/
    (public)/
      page.tsx
      tim-phong/
      homestay/
        [slug]/
          page.tsx
          phong/
            [roomSlug]/
              page.tsx
      dat-phong/
        [token]/
          page.tsx
      kiem-tra-booking/
      ban-do/
      verified/
      homestay-ta-xua/
      homestay-san-may-ta-xua/
      ...
    admin/
      login/
      (protected)/
        bookings/
        properties/
        rooms/
        inventory/
        rates/
        verification/
        media/
        customers/
        amenities/
        imports/
        content/
        places/
        road-alerts/
        settings/

  features/
    admin/
    properties/
    rooms/
    amenities/
    media/
    verification/
    rates/
    inventory/
    stay-bookings/
    search/
    weather/
    cloud/
    map/
    places/
    road-alerts/
    content/
    imports/
    referrals/
    telegram/

  components/
    ui/
    layout/
    admin/
    property/
    room/
    booking/
    verification/
    search/
    weather/
    media/

  lib/
    supabase/
    utils.ts
    images.ts
```

---

# 50. DATABASE MIGRATION PLAN

Do not copy Biker migration history.

Create clean Stay migration phases.

Example naming:

```text
202608290001_stay_foundation.sql
202608290002_properties_rooms_amenities.sql
202608290003_media_verification.sql
202608290004_rates_inventory.sql
202608290005_stay_booking.sql
202608290006_content_import.sql
202608290007_weather_map.sql
```

Actual timestamps should reflect implementation time and project convention.

## Foundation migration must include

- `pgcrypto`;
- updated_at trigger helper;
- role helpers;
- site settings;
- base enum/check structures;
- RLS helpers.

## Property migration

- properties;
- room_types;
- amenities relations;
- indexes;
- RLS.

## Verification/media

- media assets;
- verification records;
- Cloud View component scores;
- road verification;
- evidence linkage.

## Rates/inventory

- rate plans;
- rate rules;
- inventory;
- constraints/indexes;
- pricing resolver if implemented in DB.

## Booking

- customers;
- stay bookings;
- booking events;
- token hash;
- create/confirm RPC;
- atomic availability handling;
- status transition guards.

---

# 51. IMPLEMENTATION PHASES FOR CODEX

Do not attempt the whole platform in one giant change.

---

## PHASE 0 — CREATE CLEAN STAY BASELINE

Goal:

A new Stay repo builds successfully before accommodation features.

Tasks:

1. Create/copy foundation from Biker into the NEW Stay repo.
2. Rename package/project/metadata.
3. Add Stay AGENTS rules.
4. Configure Stay `.env.example`.
5. Point to NEW Supabase env names.
6. Remove fleet/motorbike/rental public/admin modules.
7. Remove Biker-specific content/routes.
8. Keep generic auth/ui/supabase/test infrastructure.
9. Add temporary Stay homepage.
10. Run all quality gates.

Acceptance:

```text
No Biker production dependency
No fleet/rental route
No Biker secrets
Build passes
```

---

## PHASE 1 — DATABASE FOUNDATION + ADMIN AUTH

Build:

```text
site_settings
role helpers
admin/staff auth
RLS base
```

Admin login and protected shell must work against Stay Supabase.

Acceptance:

- anonymous cannot access Admin;
- staff/admin roles resolve from `app_metadata`;
- settings public read is safe;
- secrets are not exposed.

---

## PHASE 2 — PROPERTY + ROOM DIRECTORY

Build:

```text
properties
room_types
amenities
media basic
```

Public:

```text
/homestay/[slug]
/homestay/[slug]/phong/[roomSlug]
```

Admin CRUD:

```text
properties
rooms
amenities
media
```

Acceptance:

- property is not stored as generic Place;
- multiple room types per property;
- actual room data can be rendered;
- draft/inactive records not leaked publicly.

---

## PHASE 3 — SEARCH + SEO

Build:

```text
/tim-phong
filters
room-first result ranking
SEO landing pages
sitemap
robots
metadata
```

Acceptance:

- mobile-first;
- dates/guests persisted in search URL;
- filters work without hiding all results incorrectly;
- SEO pages have unique useful intent;
- no fake review/rating schema.

---

## PHASE 4 — VERIFIED STANDARD + VIEW THẬT + 360

Build:

```text
verification_records
Cloud View component scoring
Road Verified
media evidence metadata
360 panorama support
last verified UI
```

Acceptance:

- score is derived from component values;
- evidence is linked to actual room;
- View-from-bed is explicit;
- shared view is not misrepresented as private room view;
- 360 viewer/evidence degrades gracefully;
- verified dates visible.

---

## PHASE 5 — RATES + PRICE CONFIDENCE

Build:

```text
rate_plans
room_rate_rules
rate resolver
price freshness
price snapshot primitives
```

Acceptance:

- weekday/weekend/peak/holiday/override can be represented;
- conflict handling deterministic;
- VND integers;
- historical snapshot can remain unchanged when rate changes.

---

## PHASE 6 — AVAILABILITY

Build:

```text
room_inventory
availability confidence
admin quick update
search integration
```

Acceptance:

- `live`, `verified_today`, `needs_confirmation`, `unknown`, `sold_out`;
- system never labels unknown as “còn phòng”;
- date-range quantity uses all nights;
- check-out is exclusive.

---

## PHASE 7 — BOOKING REQUEST ENGINE

Build:

```text
customers
stay_bookings
booking_events
private token
booking lookup
admin inbox
atomic create
atomic confirm
Telegram notification
```

Acceptance:

- guest-first;
- no customer account required;
- token stored only as SHA-256;
- invalid token does not disclose internal state;
- price snapshot stored;
- availability re-check on create/confirm where applicable;
- notification failure does not roll back booking.

---

## PHASE 8 — IMPORT / AUDIT / BULK DATA

Adapt Biker import architecture.

Build Stay workbook templates and safe apply/rollback.

Acceptance:

- preview;
- validation;
- deterministic matching;
- no accidental destructive blanks;
- audit before/after;
- conflict-aware rollback.

---

## PHASE 9 — WEATHER + CLOUD FORECAST + MAP

Port independent weather/cloud/map implementation.

Acceptance:

- Stay has own snapshots;
- Cloud Forecast separate from Cloud View;
- degraded states explicit;
- no fake data;
- property/area weather is not called redundantly for every room;
- SVG map is illustrative, Google Maps handles navigation.

---

## PHASE 10 — BIKER REFERRAL / COMBO CROSS-SELL

Build:

```text
Stay → Biker rental deep link
source/ref tracking
prefilled dates where supported
```

Acceptance:

- no customer PII in URL;
- no shared DB;
- Stay does not claim rental booking success;
- Biker remains independently operational.

---

## PHASE 11 — POLISH / PERFORMANCE / OPERATIONS

Review:

- Core Web Vitals;
- image sizes;
- responsive galleries;
- 360 loading strategy;
- a11y;
- SEO;
- Admin mobile usability;
- booking spam protection;
- data freshness dashboards;
- backup/recovery docs;
- deployment docs.

---

# 52. MVP ACCEPTANCE CRITERIA

A meaningful MVP is ready when an anonymous user can:

1. Search by date/guests.
2. Browse lodging.
3. Open a property.
4. See its real room types.
5. Understand each room's view confidence.
6. See actual room/view evidence.
7. See Road Verified data.
8. See price status.
9. See availability status.
10. Submit a booking request without creating an account.
11. Receive booking code/private status access.
12. Follow a clear optional link to rent a bike from Tà Xùa Biker.

An Admin/Staff user can:

1. Manage properties.
2. Manage rooms.
3. Manage amenities.
4. Manage media/360 evidence.
5. Score and verify Cloud View.
6. Verify road access.
7. Maintain rate plans.
8. Update availability quickly.
9. Process booking requests.
10. Import/bulk manage initial supply safely.
11. See freshness/data-quality warnings.

---

# 53. OUT OF SCOPE FOR MVP

Do NOT build unless specifically requested:

```text
online payment
full OTA instant-confirm guarantee
partner self-service portal
commission settlement engine
review system
loyalty wallet
shared Biker/Stay auth
shared Biker/Stay database
microservices
complex machine-learning Cloud prediction
complex dynamic pricing
bus booking engine
tour marketplace
chat system
```

---

# 54. DATA QUALITY KPIs

Do not measure launch quality only by number of properties.

Better operational targets:

```text
Verified Properties
Verified Room Types
Cloud View Verified Rooms
Rooms with actual view evidence
Rooms with 360
Properties with Road Verified
Rooms with current price
Rooms with fresh availability
Average booking confirmation time
```

Example launch target:

```text
30 verified properties
100 verified room types
50+ Cloud View Verified rooms
20+ rooms with 360 pilot
100% published rooms with price status
100% verified properties with road-access data
```

These are product targets, not hard-coded values.

---

# 55. DATA SOURCE-OF-TRUTH RULES

Each fact should have exactly one primary source.

Examples:

```text
Property identity → properties
Room facts → room_types
Room facilities → room_amenities
Media evidence → media_assets
Cloud View → verification component data
Rate → rate rules
Availability → room_inventory + confirmed blocks
Booking → stay_bookings
Booking history → stay_booking_events
Weather → provider + snapshots
Cloud Forecast → calculated engine
```

Do not allow Admin CMS content blocks to override calculated or transactional data.

---

# 56. NAMING GUIDELINES

Prefer clear domain terminology:

```text
property
room_type
room_inventory
rate_plan
verification
stay_booking
```

Avoid ambiguous reuse of Biker terminology:

```text
fleet
vehicle
rental
handover
motorbike_quantity
```

For URLs/customer copy, Vietnamese can be used naturally.

Internal schema/code may remain consistent English.

---

# 57. TESTING REQUIREMENTS

At minimum create tests for:

## Verification

- Cloud View rubric totals correctly;
- values out of range rejected;
- stale verification changes public badge;
- shared view cannot become “view from bed” accidentally.

## Rates

- weekday/weekend;
- peak;
- holiday;
- override priority;
- conflicting rules;
- integer VND.

## Inventory

- date overlap;
- check-out exclusive;
- multiple rooms;
- sold out;
- stale availability state;
- concurrent confirmation safety.

## Booking

- phone normalization;
- token generation/hash;
- price snapshot immutability;
- allowed state transitions;
- invalid token recovery;
- duplicate submission/idempotency if implemented.

## RLS/security

- public-safe reads only;
- anonymous writes denied;
- staff vs admin;
- service role not exposed.

## Import

- normalize;
- invalid rows;
- deterministic matching;
- preview;
- patch semantics;
- rollback conflicts.

## Weather/Cloud

Port/adapt Biker tests and add separation between:

```text
Cloud Forecast
Cloud View Score
```

---

# 58. CODEX WORKFLOW

When executing this master plan:

1. Confirm you are inside the NEW Stay repository.
2. Read `AGENTS.md`.
3. Inspect current tree before changing files.
4. Work one phase at a time.
5. Do not make unrelated refactors.
6. Review git diff before tests.
7. Run quality gates.
8. Commit only completed passing phases.
9. Use concise Conventional Commits.
10. Push only to the configured Stay upstream.
11. Never force-push.
12. Report:
   - files changed;
   - migrations added;
   - tests run;
   - commit hash;
   - blockers;
   - manual Supabase/Vercel actions required.

---

# 59. FIRST CODEX TASK

Do NOT ask Codex to build the full product immediately.

The first task should be:

> **Phase 0 — Create a clean Tà Xùa Stay baseline from the Biker technical foundation, in a NEW Stay repository. Preserve generic Next.js/Supabase/Auth/UI/testing patterns, remove all fleet/motorbike/rental-specific product code, replace Biker branding with a minimal Stay shell, and make lint/typecheck/test/build pass. Do not create Stay business tables yet except what is strictly needed for the independent baseline. Do not modify the Biker repository.**

After Phase 0 is reviewed, proceed to Phase 1.

---

# 60. FINAL ARCHITECTURE DECISION

The intended relationship is:

```text
┌─────────────────────────────┐
│ TÀ XÙA BIKER                │
│ Existing independent app    │
│ Existing independent DB     │
│ Motorbike / Cloud / Guide   │
└──────────────┬──────────────┘
               │
               │ external links / referral only
               │
┌──────────────▼──────────────┐
│ TÀ XÙA STAY                 │
│ New independent app         │
│ New independent DB          │
│ Rooms / View / Booking      │
└─────────────────────────────┘
```

Technical patterns may be copied and improved independently.

The long-term ecosystem is created through:

```text
brand consistency
cross-links
referral tracking
commercial benefits
customer journey
```

—not through forcing both products into one codebase/database.

---

# 61. PRIMARY PRODUCT PRINCIPLE

When implementation decisions conflict, prioritize:

> **Reduce uncertainty before the guest arrives.**

Tà Xùa Stay should consistently answer:

```text
Is this the actual room?
What does this exact room look like?
Can I actually see the valley/cloud-view direction from it?
Is that view private or shared?
What is the road like?
What is the current price confidence?
How fresh is the availability information?
What happens after I submit the booking?
```

That is the core of:

# **Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.**
