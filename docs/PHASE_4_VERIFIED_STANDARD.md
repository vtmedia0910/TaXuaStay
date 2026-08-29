# Phase 4 — Tà Xùa Stay Verified Standard

## Product promise and boundary

Phase 4 verifies facts and exact-target evidence under the promise:

> Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.

A current badge means a defined review was completed, supported by approved evidence for the exact target, and has not expired. It is not a legal certification and does not guarantee clouds, weather, road safety under every future condition, price, date availability, or booking confirmation.

Cloud View and a future Cloud Forecast are separate systems:

- **Cloud View Score** measures relatively stable physical characteristics of the viewing position at a room type.
- **Cloud Forecast** would estimate weather opportunity and belongs to a later phase. Phase 4 contains no forecast or cloud-probability model.

No migration or application path automatically verifies Phase 2 content. Existing properties, rooms, and approved media remain unverified until staff creates and completes a valid record.

## Normalized architecture

Migration `202608290004_verified_standard.sql` adds four tables. Applied migration 004 remains immutable; additive corrective migration `202608290005_harden_phase4_verification.sql` tightens lifecycle timing and anonymous column grants without changing the rubric or product model:

- `verification_records`: lifecycle, immutable target/type, status, verification/expiry times, method, internal notes, and staff audit references;
- `cloud_view_verifications`: one structured Cloud assessment per matching lifecycle record;
- `road_verifications`: one structured Road assessment per matching lifecycle record;
- `verification_evidence`: explicit many-to-many links from a verification to existing `media_assets`.

Supported lifecycle types are `property_identity`, `property_location`, `room`, `cloud_view`, `road_access`, and `media_360`. Supported stored states are `pending`, `verified`, `expired`, `rejected`, and `needs_review`.

The type determines exactly one target:

- property identity, property location, and road access target one property;
- room facts, Cloud View, and 360° target one room type.

Type and target are immutable after creation. Specialized Cloud/Road rows are trigger-checked against the lifecycle type. Partial unique indexes permit history while allowing only one stored `verified` record for each target/type; transaction RPCs expire the prior current record when a replacement is deliberately verified.

## Lifecycle and freshness

Reusable application and database policy uses these defaults:

| Verification | Default expiry |
|---|---:|
| Property identity/location | 12 months |
| Room facts | 12 months |
| Cloud View | 12 months |
| Road access | 6 months |
| 360° evidence | 12 months |

The database supplies `verified_at = now()` and a fresh default `expires_at` when a record first enters `verified`. The same default applies when a non-current record—stored as `needs_review`/`expired`, naturally expired by time, or carrying a future start—is deliberately re-verified. The Admin form clears the old cycle and explains this behavior instead of silently resubmitting its dates.

Staff may deliberately enable custom dates to record a valid historical inspection. That path requires both an explicit `verified_at` no later than the current time and an `expires_at` that is later than verification and still in the future. Historical backdating therefore remains supported, while accidental future starts and already-expired verified saves are rejected by both Admin validation and the database trigger. Construction, room renovation, obstruction changes, or major road/weather events should move a record to `needs_review` immediately rather than waiting for the scheduled expiry.

Public “current” resolution always requires `status = verified`, `verified_at <= now()`, and `expires_at > now()`. The exact verification instant is eligible; the exact expiry instant is stale. Future-start, pending, rejected, review, missing-date, and expired records never produce public badges, Cloud View, Road Verified, or public evidence. Admin lists a stored verified record with a future start as “Ngày xác minh chưa có hiệu lực” so legacy or externally written bad data is visible without becoming public.

## Cloud View component rubric

Admin enters continuous integer values within each range. PostgreSQL checks every range and generated stored columns derive the total and public score; neither Admin nor the application can persist a hand-entered final `9.2`.

| Component | Range | Reference rubric |
|---|---:|---|
| A. Direct valley/cloud-basin visibility | 0–30 | 0 none; 10 narrow/weak; 20 clear; 30 broad/direct |
| B. Horizontal useful view width | 0–20 | 0 blocked; 5 <30°; 10 30–60°; 15 60–100°; 20 >100° |
| C. Obstruction quality | 0–15 | 0 major close obstruction; 5 substantial; 10 limited; 15 almost unobstructed |
| D. View from bed | 0–15 | 0 no; 5 must stand/move; 10 natural sitting/turning; 15 strong direct resting view |
| E. Private viewing position | 0–10 | 0 shared only; 5 window/semi-private; 10 strong private balcony/terrace/window |
| F. Sunrise/orientation usefulness | 0–5 | 0 unsuitable/unknown; 3 partial; 5 strong |
| G. Evidence quality/freshness | 0–5 | 0 unsupported/stale; 2 recent ordinary photos; 5 recent useful metadata/panorama |

`total_points` is the sum out of 100 and `score_10 = total_points / 10`. Structured facts are stored alongside the score: view from bed, viewing position, cardinal direction, optional horizontal angle, sunrise orientation, obstruction notes, and a public Cloud note. Direction must come from inspection/compass/trusted metadata, never marketing-photo inference.

Public labels use one centralized resolver:

| Score | Label |
|---:|---|
| 9.0–10.0 | Xuất sắc |
| 8.0–8.9 | Rất tốt |
| 6.5–7.9 | Tốt |
| 5.0–6.4 | Một phần |
| 3.0–4.9 | Chủ yếu ở khu chung |
| 0–2.9 | Không phù hợp nếu mục tiêu là săn mây tại phòng |

## Evidence and View Thật

`media_assets.is_verified` continues to mean only “approved for public media use.” It does not create a Verified Standard badge. A badge additionally requires a current lifecycle record and an explicit `verification_evidence` link.

Database triggers enforce evidence ownership:

- room, Cloud, and 360° evidence must belong to the exact same room type and cannot be property-wide;
- property and Road evidence must belong to the exact same property and cannot be room-only;
- Cloud uses room-view, bed-view, balcony, sunrise, or verification evidence;
- Road uses road-access, parking, or verification evidence;
- a 360° verification requires approved public `panorama_360` evidence;
- an evidence link marked public must point to approved media.

Deferred completeness triggers validate the final transaction. A verified record must finish the transaction with approved public evidence and the required specialized Cloud/Road row. This lets an atomic RPC assemble the lifecycle, facts, and evidence in any safe order without permitting a partially complete committed badge.

Public View Thật shows the exact-room media, viewing-position facts, capture date, verification date, and expiry. Panorama evidence is labeled **Phòng** or **Vị trí ngắm view**. Drone imagery, a café/common area, property-wide imagery, or another room cannot represent a private exact-room view.

## 360° experience

The Phase 2 `panorama_360` type is presented through a small dependency-free client component:

- only an optional thumbnail is rendered before activation;
- the large panorama URL becomes an image request only after the visitor chooses to open it;
- pointer events support desktop drag and mobile touch/pan;
- left/right/Home keyboard controls and accessible labels are provided;
- an original-image link, invalid-data state, image-load failure state, and `<noscript>` link provide fallback.

To avoid a large WebGL dependency for the MVP, the current viewer pans horizontally across an equirectangular image and does not project it onto a spherical scene. It is a meaningful interactive presentation, but is not a full gyroscope/zoom/WebGL tour. Source media must not crop, zoom, replace scenery, or otherwise exaggerate the actual view.

## Road Verified and precedence

Road grades are A (easy), B (moderate/attention needed), C (difficult), and D (no direct car access). Facts include tri-state car, motorbike, sedan, and parking access; surface; steep/narrow/rain notes; parking location; walking distance; verification and expiry. Distance cannot be negative. Grade D requires both car and sedan access to be `no`.

Road Verified does not rewrite Phase 2 preliminary access facts. Public display follows one rule:

1. use the current evidence-backed Road DTO when it exists;
2. otherwise use the untouched preliminary property values and label them as preliminary.

This prevents expired verified data from silently surviving as apparently fresh preliminary data. Search filters remain based on the Phase 3 preliminary fields in this phase; Road summaries and cards display current verified facts when present.

## Public surfaces

- Room detail: current Room/360 badges, Cloud score/label, structured facts, dates, exact-room View Thật evidence, and truthful unverified wording.
- Property detail: Property Verified only when both identity and location records are current, plus current Road verification, dates, access facts, and a count computed from current Cloud-verified room records.
- Search cards: current Cloud score/view-from-bed and Road grade with verified-first preference inside each already-paginated result page.
- Cloud/view SEO landings: a verified section followed separately by rooms with unverified basic view descriptions.
- `/verified`: customer explanation of badge meaning, method, freshness, 360 evidence, and non-guarantees.

No public Phase 4 surface claims a price, rating/review, current room availability, booking confirmation, or cloud/weather probability. The `/verified` sitemap entry is added only when the existing final-domain indexing policy is enabled.

## Admin workflow

Protected routes are:

- `/admin/verification`
- `/admin/verification/new`
- `/admin/verification/[id]/edit`

Admin/staff can list and filter lifecycle records by state (including a future-start warning), property, or room; create each supported verification; enter Cloud components or Road facts; select only target-compatible existing media; review expiry; and move records among pending, verified, rejected, and review states. Re-verifying a non-current record starts a fresh timestamp/default expiry unless staff explicitly selects valid custom dates. Type/target lock after creation preserves audit history.

Cloud total, score, and label are previews calculated from the component inputs; there is no final-score field. Zod validates on the server and PostgreSQL is the final constraint backstop. All saves use one security-invoker RPC transaction, so lifecycle, specialized facts, evidence replacement, and prior-record expiry commit or roll back together.

Unapproved media may be linked while preparing a pending/review record, but the link remains private and the record cannot commit as verified until approved public evidence exists.

## RLS and public DTOs

RLS is enabled on every Phase 4 table. Anonymous base-table select grants are column-limited, policies require the current-public resolver, and public application queries use explicit views/allowlists—never `select("*")`. Corrective migration 005 revokes the original table-wide anonymous SELECT on Cloud/Road detail tables and grants only the exact columns consumed by the current public views. Authenticated staff retains its existing table grants and RLS checks; future internal columns do not become anonymously readable by default.

Anonymous output excludes lifecycle method, lifecycle/internal notes, creator/updater/verifier user IDs, pending/rejected/review history, and private evidence. Anonymous roles have no mutation grant. Authenticated mutations still require `app_metadata.role` of `admin` or `staff` in RLS and inside the RPC path.

`is_verification_public(uuid)` is the only new `SECURITY DEFINER` helper. It is a boolean RLS helper because direct policies across lifecycle, evidence, media, property, and room tables would recurse. It uses an empty fixed `search_path`, receives only an ID, exposes no row contents, has PUBLIC execute revoked, and is executable only by anonymous/authenticated roles that evaluate the corresponding policies/views. Mutation RPCs are `SECURITY INVOKER`, have fixed search paths, revoke PUBLIC execute, and grant execute only to authenticated users.

## Storage and environment

Phase 4 reuses validated HTTPS URLs in Phase 2 `media_assets`; no new bucket or secret is required. The planned Stay-owned verification/panorama/road buckets remain deferred until upload ownership and separate access policies are needed. Biker Storage is never used.

Runtime still needs only:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`NEXT_PUBLIC_SITE_URL` remains intentionally unset until the final brand domain is selected. No runtime code uses `SUPABASE_SERVICE_ROLE_KEY`; the owner should remove it from Vercel if it still exists.

## Explicit scope stop

Phase 4 adds no rates, inventory, date availability, bookings, payments, customer PII, weather forecasting, imports, or Biker runtime integration. Phase 5 is not part of this implementation.
