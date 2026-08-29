# V2 Phase 2 — Verified Room Profile

V2 Phase 2 adds evidence-backed Room Quality plus factual strengths/caveats while preserving the established Verified Standard. Migration `202608290010_v2_verified_room_profile.sql` is additive; migrations 001–009 remain immutable.

## Three trust concepts that remain separate

- **Room Type Verified** validates shared category facts and exact room-type evidence. Public copy says “Áp dụng cho loại phòng”; it does not claim every physical unit is identical.
- **Exact Room Verified** validates the identity/facts of one published Room ID using a current physical-room-targeted `room` record and approved evidence owned by that Room ID.
- **Room Quality** records transparent inspection dimensions. It does not change Room Type Verified, Exact Room Verified, Cloud View, pricing, availability, reviews, or ratings.

Cloud View continues to measure only the physical quality of a viewing position. Room Quality has no overall score and is never serialized as `aggregateRating` or `reviewRating`.

## Quality model and scale

`room_quality_assessments` belongs to one `verification_records` row of type `room_quality`. The target is exactly one `room_type_id` or `physical_room_id`, never a property and never both. Target/type immutability remains owned by the verification lifecycle.

Each observed dimension is stored as an integer from 0 through 100 and displayed as a decimal out of 10. For example, stored `87` is public `8.7 / 10`. Null means unknown and is displayed as **Chưa xác minh**, never zero.

The dimensions are:

| Dimension | Operational observation |
| --- | --- |
| Cleanliness | Surfaces, linen, dust, smell, and bathroom condition at the inspection time. |
| Soundproof | Intrusion from speech, footsteps, adjacent rooms, and shared areas under observed conditions. |
| Heating | Draft protection, heat retention, and suitable heating equipment; not a weather forecast. |
| Hot water | Warm-up delay, stability, and sustained hot water during inspection. |
| Wi-Fi | Stability and practical use inside the room. Mbps is not claimed unless measured. |
| Bathroom | Privacy, space, drainage, ventilation, and fixture condition. |
| Room Accuracy | Match to published size, beds, bathroom, balcony, window/view claims, furniture, layout, and photos. It is not satisfaction, Cloud View, or price. |
| Comfort | Bed, usable space, and light as an optional observed dimension; it remains separate from the other facts. |

All dimensions use the same customer label bands:

| Stored | Public score | Label |
| ---: | ---: | --- |
| 90–100 | 9.0–10.0 | Xuất sắc |
| 80–89 | 8.0–8.9 | Rất tốt |
| 70–79 | 7.0–7.9 | Tốt |
| 50–69 | 5.0–6.9 | Trung bình |
| 30–49 | 3.0–4.9 | Yếu |
| 0–29 | 0.0–2.9 | Kém |

Inspector-facing rubric help supplies observable anchors for every dimension at 0–20, 30–40, 50–60, 70–80, and 90–100. A dimension that was not observed stays null.

## Lifecycle and freshness

Room Quality reuses `verification_records`: status, method, staff audit, evidence, `verified_at`, `expires_at`, future-date rejection, and fresh re-verification semantics all remain shared with Phase 4. The default whole-assessment expiry is 12 months. Only `status = verified`, `verified_at <= now()`, `expires_at > now()`, a public target, and approved exact-target evidence can enter the public quality view.

Dimension freshness is centralized rather than scattered across components:

| Dimension | Freshness |
| --- | --- |
| Cleanliness | 90 days |
| Heating, hot water, Wi-Fi, comfort | 6 months |
| Soundproof, bathroom, Room Accuracy | 12 months, or earlier after a material change |

The resolver returns `current`, `stale`, or `unknown`. A stale number is not displayed as current; UI says **Cần kiểm tra lại**. Renovation, construction, equipment/network change, or another material event should move the lifecycle to `needs_review` immediately instead of waiting for time expiry.

## Evidence and inspection method

Verified quality requires at least one approved public evidence asset for the same target. Room/bathroom/view/balcony/verification evidence is accepted. Exact-room assessments accept only media owned by the same `physical_room_id`; Room A evidence cannot verify Room B.

Visual evidence supports cleanliness, bathroom, and Room Accuracy. Non-visual observations such as Wi-Fi and soundproofing may be documented through the lifecycle `method` (for example measured, inspected, observed, or partner-confirmed). Precise Mbps must not be invented. Evidence capture date, when present, remains distinct from the verification date.

## Exact Room Verified resolver

The centralized resolver returns `verified`, `expired`, `needs_review`, or `not_verified`. `verified` requires:

1. a real active/published physical-room row with stable Room ID;
2. public property and room-type parents;
3. a physical-room-targeted `room` verification;
4. `status = verified`, a non-future start, and future expiry;
5. approved public evidence owned by that exact Room ID.

`exact_room_bookable` is intentionally absent from this resolver. It controls whether operations may accept an exact-room request; it is not verification, availability, assignment, or a guarantee. Cloud View and Room Quality are independent badges/data: an exact room can be verified without either.

## Pros and cons

`room_profile_notes` stores one room-type or exact-room target, `pro`/`con`, a controlled category, factual text, public/private state, and deterministic sort order. Categories are view, noise, bathroom, access, Wi-Fi, space, privacy, temperature, location, and other.

Public notes are displayed as **Điểm mạnh** and **Điểm cần lưu ý**. Private notes remain under RLS and never enter the public view. Notes must avoid insults, unverified accusations, competitor comparisons, and exaggerated marketing. Partner tier, sponsorship, commission, or other commercial status cannot change scores or notes.

## Public and Admin workflows

The existing room-type route remains `/homestay/[propertySlug]/phong/[roomSlug]`. It loads a bounded profile summary without per-room N+1 queries:

- room-type verification, Cloud View, quality, notes, and evidence;
- verified physical rooms in that room type;
- batched exact-room badges, Cloud View, quality, notes, and evidence.

Exact-room cards expose only Room ID, public presentation fields, current badges, current dimension states, public notes, and approved exact-target evidence. Exact 360° is labeled `360° phòng cụ thể`; room-type panoramas are not presented as exact-room media. No physical-room SEO route or rating structured data is introduced.

Admin continues to use `/admin/verification` for lifecycle-backed Room Quality. `/admin/room-profiles` manages ordered strengths/caveats without redeploy. Both workflows select the target scope explicitly and show property, room type, and Room ID context.

## RLS and public DTOs

Both new tables have RLS. Anonymous users have no mutation grants and can read only current public quality or public notes attached to a public target. Public views use `security_invoker`, base-table RLS, and explicit column grants. Public DTOs exclude `notes_internal`, staff IDs, audit IDs, lifecycle method, private evidence, and private notes. The runtime still uses no service-role key.

## Scope boundary

Pricing remains room-type-level. Availability remains pooled and room-type-level. Search remains room-type-first with no quality threshold filters or major ranking change. Road Verified and the Cloud View rubric are unchanged. No Supplier, Partner, commercial economics, package, booking, payment, motorbike integration, bus, or Trip Dashboard domain is added.

V2 Phase 3 has not started.
