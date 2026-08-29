# TÀ XÙA STAY / VERIFIED LOCAL TRAVEL COMMERCE
## CODEX MASTER PLAN V2
### Kiến trúc chuyển đổi từ nền tảng verified accommodation sang Travel Operating System cho Tà Xùa

**Version:** 2.0  
**Ngày định hướng lại:** 2026-08-29  
**Target repository:** `vtmedia0910/TaXuaStay`  
**Read-only technical reference:** `vtmedia0910/taxuabiker2`  
**Current Stay production database:** Supabase project riêng của Tà Xùa Stay  
**Current deployment:** Vercel project riêng của Tà Xùa Stay  

---

# 0. MỤC ĐÍCH CỦA MASTER PLAN V2

Master Plan V2 thay thế định hướng cũ coi Tà Xùa Stay chủ yếu là một nền tảng accommodation booking / booking request.

Từ phiên bản này, hệ thống phải được thiết kế như:

# VERIFIED LOCAL TRAVEL COMMERCE

với mục tiêu dài hạn:

# TRAVEL OPERATING SYSTEM CHO TÀ XÙA

Hệ thống không chỉ giúp khách:

- tìm homestay;
- xem phòng;
- xem giá;
- kiểm tra tình trạng phòng.

Hệ thống phải dần giúp khách hoàn thành toàn bộ hành trình:

```text
TÌM HIỂU
→ SO SÁNH
→ XÁC MINH
→ CHỌN TRẢI NGHIỆM
→ CHỌN PHÒNG
→ CHỌN VẬN CHUYỂN
→ CHỌN XE MÁY
→ GHÉP PACKAGE
→ ĐẶT CHUYẾN
→ THANH TOÁN / ĐẶT CỌC
→ SUPPLIER CONFIRMATION
→ TRIP DASHBOARD
→ HỖ TRỢ TRƯỚC / TRONG CHUYẾN
→ REVIEW
→ LOYALTY / REFERRAL
```

Tà Xùa Stay hiện tại là nền tảng kỹ thuật đã có nhiều module quan trọng.

Không được rewrite từ đầu.

Master Plan V2 yêu cầu:

1. bảo tồn những gì đã làm đúng;
2. thêm lớp kiến trúc còn thiếu;
3. chuyển trọng tâm từ `ROOM BOOKING` sang `TRIP COMMERCE`;
4. giữ Verified data là moat cốt lõi;
5. giữ Biker độc lập về repo / database / operations;
6. nhưng thiết kế Travel Commerce để có thể tích hợp Biker như một service provider thực sự;
7. không biến website thành directory;
8. không biến website thành clone Booking.com.

---

# 1. CURRENT SYSTEM BASELINE — KHÔNG LÀM LẠI

Tại thời điểm Master Plan V2 được viết, codebase Stay đã có nền tảng hoạt động.

Các migration hiện có và đã được coi là immutable sau khi apply remote:

```text
202608290001_stay_foundation.sql
202608290002_properties_rooms_amenities_media.sql
202608290003_harden_phase2_accommodation.sql
202608290004_verified_standard.sql
202608290005_harden_phase4_verification.sql
202608290006_rate_plans_and_pricing.sql
202608290007_harden_phase5_pricing.sql
202608290008_room_inventory_and_availability.sql
```

Các domain hiện có:

```text
SITE SETTINGS
AUTH / ADMIN / STAFF
PROPERTY
ROOM TYPE
AMENITY
MEDIA
PHOTO / VIDEO / PANORAMA
VERIFICATION
CLOUD VIEW
ROAD VERIFIED
PRICE / RATE PLAN
ROOM RATE RULE
ROOM INVENTORY
AVAILABILITY
ROOM-FIRST SEARCH
SEO LANDING PAGES
```

Các điểm đã làm đúng và phải giữ:

- Supabase riêng của Stay;
- Vercel riêng của Stay;
- Biker không phải runtime dependency;
- `app_metadata.role`;
- RLS;
- public DTO / allow-list;
- integer VND;
- `[check_in, check_out)` lodging-night semantics;
- Cloud View khác Cloud Forecast;
- `unknown` là first-class state;
- Price khác Availability;
- Verification có freshness;
- evidence đúng target;
- 360 không được dùng sai vị trí;
- temporary Vercel hostname noindex;
- không fake rating;
- không fake availability;
- không fake price;
- không fake Cloud View.

Master Plan V2 KHÔNG yêu cầu xóa các domain này.

Master Plan V2 yêu cầu mở rộng chúng.

---

# 2. NHỮNG GÌ THAY ĐỔI SO VỚI MASTER PLAN CŨ

Master Plan cũ có product center:

```text
ROOM
→ PRICE
→ AVAILABILITY
→ BOOKING REQUEST
```

Master Plan V2 đổi product center thành:

```text
DESTINATION
→ VERIFIED INVENTORY
→ SERVICE COMPONENTS
→ TRIP OPTION
→ PACKAGE
→ BOOKING
→ OPERATIONS
```

Thay đổi quan trọng:

## 2.1 Property không còn là root cao nhất

Kiến trúc mới:

```text
Destination
    ↓
Property
    ↓
Room Type
    ↓
Physical Room
```

## 2.2 Room Type không đủ để đại diện "đúng phòng"

Hệ thống phải support:

```text
Room Type
+
Exact Physical Room
```

## 2.3 Pricing không chỉ có Sell Price

Travel Commerce cần phân biệt:

```text
Net Cost
Market Reference
Sell Price
```

và sau này:

```text
Trip Cost
Trip Sell
Gross Contribution
Gross Margin
```

## 2.4 Availability không phải end goal

Availability là một input của Decision Engine và Booking.

## 2.5 Biker không còn chỉ là referral marketing

Biker vẫn là hệ thống vận hành riêng.

Nhưng Travel Commerce phải có abstraction để motorbike trở thành:

```text
BOOKABLE / CONFIRMABLE TRIP COMPONENT
```

không phải chỉ một outbound link.

## 2.6 Booking không còn chỉ là room booking

Booking mới phải support:

```text
Booking
    ↓
Booking Items
        ROOM
        MOTORBIKE
        BUS
        TRANSFER
        ACTIVITY
        MEAL
        GUIDE
        SERVICE
        CUSTOM
```

## 2.7 North Star đổi

Không tối ưu:

```text
room booking count
```

North Star:

```text
COMPLETED TRIP BOOKINGS
```

và economics:

```text
CONTRIBUTION PER TRIP
```

---

# 3. PRODUCT POSITIONING

Không định vị:

> Website đặt homestay Tà Xùa.

Không định vị:

> Booking.com phiên bản Tà Xùa.

Định vị:

# NỀN TẢNG XÁC MINH VÀ THIẾT KẾ CHUYẾN ĐI TÀ XÙA

hoặc consumer proposition:

# XEM ĐÚNG PHÒNG. GHÉP ĐÚNG CHUYẾN.

Brand accommodation hiện tại vẫn có thể giữ:

```text
TÀ XÙA STAY
Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.
```

Không bắt buộc rename repo / domain trong giai đoạn V2 foundation.

Architecture phải đủ generic để sau này brand ecosystem có thể là:

```text
TÀ XÙA ECOSYSTEM
├── Tà Xùa Stay
├── Tà Xùa Biker
└── Trip / Travel Commerce layer
```

hoặc Tà Xùa Stay tự mở rộng thành consumer travel brand.

Brand decision không được hard-code vào data model.

---

# 4. PRODUCT PROMISE

Khách không chỉ mua một room night.

Khách mua:

- certainty;
- verified data;
- less research;
- less coordination;
- less risk;
- local support;
- better trip design;
- bundle value.

Mọi feature phải trả lời ít nhất một câu:

1. Có giúp khách quyết định nhanh hơn không?
2. Có giảm rủi ro chuyến đi không?
3. Có tăng conversion không?
4. Có tăng AOV không?
5. Có tăng gross contribution không?
6. Có tăng trust không?
7. Có giảm khả năng cắt cầu không?
8. Có làm supplier phụ thuộc hơn vào platform value không?

Nếu không giải quyết ít nhất một mục trên:

không ưu tiên build.

---

# 5. 4 TRỤ CỘT SẢN PHẨM

# VERIFY

Xác minh:

- exact room;
- room facts;
- actual view;
- view from bed;
- view direction;
- Cloud View;
- Road access;
- price freshness;
- availability freshness;
- 360;
- pros / cons;
- later room quality.

# BUNDLE

Ghép:

- room;
- motorbike;
- bus;
- transfer;
- meal;
- activity;
- guide;
- support;
- itinerary.

# OPERATE

Kiểm soát local operations:

- motorbike;
- supplier confirmation;
- local support;
- trip tasks;
- arrival instructions;
- later pickup / guide / photographer.

# DISTRIBUTE

Tạo demand:

- SEO;
- TikTok;
- Reels;
- Shorts;
- comparison content;
- verified room content;
- cloud alert;
- referrals.

---

# 6. ANTI-CIRCUMVENTION PRINCIPLE

Không chống cắt cầu bằng:

- giấu tên property;
- giấu địa chỉ;
- giấu location;
- khóa khách;
- UI gây khó chịu.

Chống cắt cầu bằng VALUE STACK.

Direct supplier có thể bán:

```text
ROOM
```

Platform bán:

```text
VERIFIED ROOM
+ VERIFIED VIEW
+ AVAILABILITY CONFIDENCE
+ MOTORBIKE
+ BUS
+ ITINERARY
+ LOCAL SUPPORT
+ GUARANTEE POLICY
+ PACKAGE ECONOMICS
```

Mục tiêu:

> Khách có thể bỏ platform nhưng không muốn bỏ platform.

Supplier:

> Có thể cắt một booking nhưng mất một channel lâu dài có traffic, content, booking và data.

---

# 7. SYSTEM BOUNDARIES

## 7.1 Stay infrastructure

Stay vẫn có:

```text
GitHub riêng
Supabase riêng
Auth riêng
Storage riêng
Vercel riêng
Staff riêng
Customer data riêng
Travel Commerce data riêng
```

## 7.2 Biker infrastructure

Biker vẫn có:

```text
GitHub riêng
Supabase riêng
Fleet riêng
Rental operations riêng
Auth riêng
Vercel riêng
```

## 7.3 Không shared database

Không:

```text
Stay SQL query trực tiếp Biker DB
Biker SQL query trực tiếp Stay DB
shared auth table
shared service-role
shared customer table
```

## 7.4 Integration sau này

Dùng:

```text
API
signed server-to-server call
manual supplier task
opaque external reference
event/webhook
```

Tùy phase.

MVP không cần microservice architecture phức tạp.

---

# 8. CORE DOMAIN MODEL V2

Kiến trúc target:

```text
Destination
    ↓
Property
    ↓
RoomType
    ↓
PhysicalRoom
    ↓
Verification / Media

Destination
    ↓
Supplier / Partner
    ↓
Services

Service
    ↓
ROOM
MOTORBIKE
BUS
TRANSFER
ACTIVITY
MEAL
GUIDE
OTHER

TripPackage
    ↓
PackageComponent
    ↓
Service / Inventory / Price

Booking
    ↓
BookingItem
    ↓
SupplierConfirmation

Booking
    ↓
Trip
    ↓
TripDashboard
```

---

# 9. DESTINATION DOMAIN

Add:

```text
destinations
```

Suggested fields:

```text
id
slug
name
short_name
province
country_code
timezone
latitude
longitude
altitude_reference_m
description
is_active
publish_status
created_at
updated_at
```

Initial record:

```text
slug = ta-xua
name = Tà Xùa
timezone = Asia/Ho_Chi_Minh
```

Do not hard-code Tà Xùa forever in domain relationships.

Add:

```text
properties.destination_id
```

Future:

```text
Mộc Châu
Sa Pa
Hà Giang
Y Tý
Măng Đen
```

Destination affects:

- SEO;
- weather location;
- property scope;
- package scope;
- service scope;
- search;
- analytics.

---

# 10. PROPERTY DOMAIN V2

Current `properties` remains.

Do not replace it.

Add relationship:

```text
destination_id
```

Keep:

- location;
- public facts;
- access;
- facilities;
- publish lifecycle.

Future partner fields MUST NOT be added directly into public property table unless needed.

Separate partner/business-private data.

Property ≠ Partner.

One property may have one or more commercial partner relationships over time.

---

# 11. ROOM TYPE VS PHYSICAL ROOM

This distinction becomes mandatory.

## 11.1 Room Type

Represents commercial category:

```text
Deluxe Valley View
Bungalow Couple
Family Room
Dorm 6
```

Contains shared facts:

- base capacity;
- bed configuration;
- base facilities;
- room size range if identical;
- commercial rate;
- pooled availability.

## 11.2 Physical Room

Add:

```text
physical_rooms
```

Suggested fields:

```text
id
property_id
room_type_id
room_code
display_name
floor_label
unit_label
position_notes
is_active
publish_status
exact_room_bookable
created_at
updated_at
```

Example:

```text
TX-LALA-201
TX-LALA-202
TX-LALA-B02
```

Constraints:

```text
unique(property_id, room_code)
room_type.property_id = physical_room.property_id
```

## 11.3 Exact Room

Exact Room means:

customer-visible physical unit can be specifically assigned or guaranteed.

Do not claim Exact Room if supplier only confirms room type.

Fields later:

```text
assignment_policy
exact_room_guarantee_supported
```

---

# 12. ROOM ID PRINCIPLE

Every physical room can have stable Room ID:

```text
TX-MAY-203
TX-LALA-B02
```

Room ID should link:

- property;
- room type;
- floor;
- exact view evidence;
- verification;
- 360;
- room-quality data;
- future assignment;
- future booking item allocation.

Do not derive Room ID from mutable room name.

Use stable code.

---

# 13. VERIFICATION V2

Existing Phase 4 remains valid.

Do not delete:

```text
verification_records
cloud_view_verifications
road_verifications
verification_evidence
```

Extend target model to support:

```text
physical_room_id
```

where appropriate.

## 13.1 Verification target hierarchy

Possible:

```text
PROPERTY
ROOM TYPE
PHYSICAL ROOM
```

Example:

Property identity:

```text
property
```

Road:

```text
property
```

Room type facts:

```text
room_type
```

Exact view:

prefer:

```text
physical_room
```

when physical unit exists.

If supplier inventory is pooled and rooms are truly identical:

room-type verification may remain valid.

## 13.2 Never silently reinterpret existing room-type verification

Existing records stay historically valid.

New exact-room verification is additive.

---

# 14. CLOUD VIEW SCORE

Keep current 100-point rubric unless separately approved.

Cloud View means:

physical viewing quality.

Never weather probability.

Keep separate:

```text
Cloud View Score
Cloud Forecast Score
```

Potential exact-room rule:

If physical rooms of same room type have materially different view:

Cloud View must move to exact-room level.

Room-type score may be:

- omitted;
- range;
- derived summary.

Do not average away material differences.

---

# 15. ROOM QUALITY PROFILE

Add later as separate score dimensions.

Do NOT contaminate Cloud View.

Possible dimensions:

```text
cleanliness
soundproof
heating
hot_water
wifi
bathroom
room_accuracy
comfort
```

Public page can show:

```text
Cloud View: 9.3
Soundproof: 5.5
```

This transparency builds trust.

Avoid a single opaque "overall score" until enough data exists.

---

# 16. PROS / CONS

Verified Room Profile should eventually support:

```text
pros
cons
```

Examples:

Pros:

- sunrise trực diện;
- view rộng;
- ban công riêng.

Cons:

- cách âm trung bình;
- WC nhỏ;
- đường vào khó.

Do not hide real disadvantages because partner is Preferred.

Sponsored status and Verification must remain independent.

---

# 17. MEDIA / 360 V2

Existing media_assets remains.

Add optional:

```text
physical_room_id
```

A media asset should target exactly one logical content owner where possible:

```text
property
room_type
physical_room
```

Exact-room evidence must never use another room's media.

360 concepts:

```text
ROOM INTERIOR
ACTUAL VIEW POSITION
```

Public strategy:

show enough evidence to create trust and conversion.

Do not hide core proof behind booking.

Post-booking can unlock:

- exact arrival details;
- assigned unit details;
- proprietary instructions;
- operational notes.

---

# 18. PRICE ARCHITECTURE V2

Existing Phase 5 sell-price engine remains.

It currently answers:

> Giá bán áp dụng cho room type và lodging date là bao nhiêu?

Do not rewrite it.

Introduce new economics layer later.

Three concepts:

```text
NET COST
MARKET REFERENCE
SELL PRICE
```

Current:

```text
room_rate_rules.price_vnd
```

should be treated as public/commercial sell price unless migration docs say otherwise.

Do not overload one field to represent all three.

Future tables may include:

```text
supplier_cost_rules
market_reference_rates
package_component_costs
```

---

# 19. PRICE CONFIDENCE

Keep:

```text
verified
recent
reference
unknown
```

Price confidence is about fact freshness.

It is separate from:

```text
commercial margin
supplier cost
discount
package saving
```

Never call Net Cost "verified price" publicly.

---

# 20. AVAILABILITY ARCHITECTURE V2

Current `room_inventory` remains.

For MVP:

```text
room_type_id
date
available_quantity
```

is correct.

Do not delete.

Future exact room support can add:

```text
physical_room_status
physical_room_assignment
```

without replacing pooled inventory.

Availability must continue to distinguish:

```text
live
verified_today
needs_confirmation
unknown
sold_out
```

Unknown != available.

Stale sold out != sold out forever.

---

# 21. INVENTORY MODES

Target support later:

```text
POOLED
EXACT_UNIT
ALLOTMENT
MANUAL_CONFIRMATION
```

## Pooled

Supplier says:

```text
Deluxe còn 3
```

## Exact unit

Supplier supports:

```text
TX-MAY-203 available
```

## Allotment

Platform holds:

```text
5 units / night
```

with release period.

## Manual confirmation

No trusted real-time inventory.

System accepts request then supplier confirms.

MVP can remain manual/pooled.

Do not build guaranteed allotment early.

---

# 22. SUPPLIER DOMAIN

Add later:

```text
suppliers
```

Supplier is commercial/service provider.

Types:

```text
PROPERTY_OPERATOR
BUS_OPERATOR
MOTORBIKE_OPERATOR
TRANSFER_PROVIDER
ACTIVITY_PROVIDER
GUIDE
FOOD_PROVIDER
OTHER
```

Private fields:

- legal / operator name;
- phone;
- Zalo;
- payment details;
- contract status;
- notes.

Never expose supplier private contact via public DTO by default.

Property operator supplier can be linked to property.

---

# 23. PARTNER DOMAIN

Partner is commercial relationship, not public property.

Suggested:

```text
partners
partner_properties
partner_tiers
partner_terms
```

Tiers:

```text
standard
verified
preferred
cloud_partner
exclusive
```

Partner tier may influence:

- distribution;
- commercial access;
- packages;
- ranking within allowed rules.

Partner tier MUST NOT change:

- Cloud View score;
- verified facts;
- review score.

Sponsored != Verified.

---

# 24. PARTNER VALUE

Platform sells partner:

- content production;
- 360;
- verification;
- SEO;
- social distribution;
- bookings;
- support;
- packages;
- data;
- channel revenue.

Do not pitch only:

> commission.

Commercial model can combine:

- room margin;
- supplier commission;
- package margin;
- promoted listing;
- premium services.

---

# 25. MOTORBIKE INTEGRATION ARCHITECTURE

Do not copy Biker fleet into Stay.

Biker remains source-of-truth for:

- bike identity;
- plate;
- maintenance;
- fleet status;
- rental operations.

Stay Travel Commerce needs a Motorbike Service Adapter.

Phase 1 MVP adapter can support:

```text
manual_confirmation
external_ref
deep_link
```

Later:

```text
availability API
reservation API
webhook
```

Never:

```text
shared database joins
shared service-role key
```

Stay booking item stores:

```text
provider = taxua_biker
external_reference
supplier_confirmation_state
```

not Biker fleet rows.

---

# 26. BUS / TRANSPORT DOMAIN

Target entities:

```text
bus_operators
bus_routes
bus_trips
bus_stops
bus_fares
bus_inventory
```

MVP may use manual confirmation.

Required data:

- operator;
- vehicle type;
- departure;
- pickup;
- drop-off;
- duration;
- net cost;
- sell price;
- cancellation;
- contact;
- confirmation method.

Do not block package MVP waiting for realtime bus API.

---

# 27. GENERIC SERVICE CATALOG

To avoid hard-coding Room + Bus + Bike:

add generic service abstraction later.

Possible:

```text
services
```

Types:

```text
ROOM
MOTORBIKE
BUS
TRANSFER
ACTIVITY
MEAL
GUIDE
SERVICE
CUSTOM
```

Each service has:

- supplier;
- destination;
- availability model;
- pricing model;
- confirmation model;
- public metadata.

Room can remain a specialized domain and be referenced as a service component.

Do not force every room fact into generic services table.

---

# 28. PACKAGE DOMAIN

Add:

```text
trip_packages
package_components
```

TripPackage:

```text
id
destination_id
slug
name
duration_days
duration_nights
package_type
description
target_margin_bps
publish_status
is_active
```

Component:

```text
id
package_id
component_type
service_ref
quantity
required
optional
display_order
pricing_strategy
```

Package components must be flexible.

No hard-coded assumption:

```text
Room + Bus + Bike only
```

---

# 29. PACKAGE TYPES

Initial consumer concepts:

```text
Tà Xùa Easy Trip
Cloud Hunter
Ultimate Cloud
```

These names are product examples, not DB enums forever.

Package recommendation criteria can include:

- Cloud View;
- budget;
- couple/group;
- road access;
- verified room;
- motorbike;
- transport.

---

# 30. PACKAGE PRICING

Package price is not simple sum of public retail.

Need support:

```text
component net cost
component market reference
component sell allocation
package sell price
target margin
```

Margin equation:

```text
Selling Price = Cost / (1 - Target Margin)
```

All money:

integer VND.

Margin percentage can use basis points:

```text
2500 = 25.00%
```

Avoid floating-point financial storage.

---

# 31. PACKAGE ECONOMICS

For each trip/package quote later calculate:

```text
Gross Booking Value
Supplier Cost
Variable Cost
Discount
Payment Fee
Refund
Gross Contribution
Gross Margin
```

Primary business optimization:

# CONTRIBUTION PER TRIP

not:

# PROFIT PER ROOM

---

# 32. TRIP FINDER / DECISION ENGINE

Search remains useful.

Do not remove `/tim-phong`.

But homepage primary flow evolves into:

# TÌM CHUYẾN ĐI PHÙ HỢP

Inputs:

```text
dates
guests
budget
travel style
cloud/view preference
couple/group
road preference
transport needed?
motorbike needed?
privacy
sunrise
amenities
```

Output:

```text
Top 3 Trip Options
```

not:

```text
83 homestays
```

Recommendation v1 should be deterministic.

No ML required.

No AI hallucination.

---

# 33. SEARCH ENGINE VS DECISION ENGINE

Keep:

```text
/tim-phong
```

for:

- SEO;
- advanced search;
- self-directed users.

Add:

```text
/tim-chuyen-di
```

or equivalent later for guided recommendation.

Search returns inventory.

Decision Engine returns opinionated options.

Both can share core data.

---

# 34. RECOMMENDATION V1

Input normalized.

Score components can include:

- requirement match;
- current availability;
- price budget fit;
- Cloud View;
- Room Verified;
- Road fit;
- exact room evidence;
- package completeness.

Never let partner payment alter Verified score.

Sponsored options must be labeled.

Avoid opaque AI language.

Explain:

> Vì sao chúng tôi đề xuất lựa chọn này.

---

# 35. BOOKING V2

Booking becomes trip-level.

Add:

```text
bookings
booking_items
booking_events
```

Booking:

- customer;
- trip dates;
- currency;
- total;
- status;
- private token;
- source attribution.

BookingItem:

```text
ROOM
MOTORBIKE
BUS
TRANSFER
ACTIVITY
MEAL
GUIDE
OTHER
```

Each item stores:

- supplier;
- external ref;
- quantity;
- unit snapshot;
- cost snapshot;
- sell snapshot;
- confirmation state;
- cancellation policy snapshot.

---

# 36. BOOKING STATUSES

Long-term status model:

```text
DRAFT
PENDING_PAYMENT
PAID
PENDING_SUPPLIER_CONFIRMATION
CONFIRMED
PARTIALLY_CONFIRMED
READY_TO_TRAVEL
IN_PROGRESS
COMPLETED
CANCELLED
REFUNDED
FAILED
```

MVP may start with subset.

Do not create uncontrolled status strings.

Use tested state machine.

---

# 37. BOOKING ITEM CONFIRMATION

Each item can have:

```text
pending
requested
confirmed
rejected
cancelled
failed
```

Trip can be:

```text
PARTIALLY_CONFIRMED
```

if some components remain pending.

Example:

```text
ROOM        CONFIRMED
MOTORBIKE   CONFIRMED
BUS         PENDING
```

Admin dashboard must show unresolved components.

---

# 38. SUPPLIER TASKS

MVP can create:

```text
supplier_tasks
```

Examples:

```text
Confirm Room
Confirm Bus
Prepare Motorbike
Arrange Pickup
```

Task fields:

- booking item;
- supplier;
- due time;
- state;
- owner;
- notes.

Avoid external workflow engine initially.

---

# 39. ROOM BOOKING ALLOCATION

Booking item can initially reserve:

```text
room_type_id
```

Optional later:

```text
physical_room_id
```

Rules:

If product sold as Exact Room Guaranteed:

physical_room assignment becomes required before final confirmation.

If product is pooled:

room_type confirmation is sufficient.

Do not claim exact room guarantee if not assigned.

---

# 40. BOOKING TOKEN SECURITY

Keep current intended pattern:

- 32 random bytes;
- base64url raw token;
- SHA-256 stored;
- raw token never stored;
- private route noindex;
- allow-listed DTO;
- server-only lookup.

Trip dashboard later uses same security pattern.

---

# 41. PAYMENT

Not required in first alignment phase.

Future support:

```text
deposit
full payment
bank transfer
QR
online payment
```

Store:

```text
deposit_amount
balance_due
balance_due_date
```

Do not design payment state only around one provider.

---

# 42. PAYMENT ≠ SUPPLIER CONFIRMATION

A paid trip may still be:

```text
PENDING_SUPPLIER_CONFIRMATION
```

Flow:

```text
payment
→ supplier tasks
→ item confirmation
→ trip confirmed
```

Do not show "Confirmed" merely because payment succeeded.

---

# 43. CANCELLATION

Cancellation can differ by item.

Snapshot policy per booking item.

Example:

```text
Room: D-7 free
Bus: non-refundable
Bike: D-1 free
```

Refund engine later sums item-level result.

Do not hard-code one booking-wide cancellation percentage.

---

# 44. TRIP DASHBOARD

Customer page:

# MY TÀ XÙA TRIP

Contains:

- booking code;
- dates;
- room;
- exact room if assigned;
- verified evidence;
- bus;
- pickup;
- motorbike;
- itinerary;
- map;
- weather/cloud later;
- support;
- payment balance;
- supplier confirmation state.

This becomes major anti-circumvention utility.

---

# 45. CONTENT STRATEGY

Do not produce only:

> Review Homestay ABC.

Produce platform-centered content:

- 5 phòng thật sự nhìn được mây từ giường;
- phòng Cloud View 8+ dưới ngân sách;
- view đẹp nhưng cách âm yếu;
- phòng tốt cho couple;
- phòng dễ đi ô tô.

CTA:

```text
Xem View Thật
Xem 360
Kiểm tra tình trạng
Xem các phòng tương tự
Tìm trip phù hợp
```

---

# 46. SEO STRATEGY V2

Keep:

- property pages;
- room type pages;
- SEO landings.

Add later:

- physical-room profiles where enough unique content;
- comparison pages;
- trip pages;
- itinerary pages;
- transport pages;
- verified guides.

Do not generate thousands of thin exact-room pages automatically.

A physical-room page should index only if it has unique substantive content.

---

# 47. HOMEPAGE V2 DIRECTION

Future hero:

# Đi Tà Xùa nhưng không biết phòng nào thật sự nhìn thấy mây?

Sub:

> Chúng tôi kiểm tra phòng thực tế, quay 360°, đánh giá view và giúp bạn ghép cả chuyến đi.

Primary CTA:

# TÌM CHUYẾN ĐI PHÙ HỢP

Secondary:

# XEM PHÒNG ĐÃ XÁC MINH

Do not change homepage purely cosmetically before core domains support the promise.

---

# 48. TRUST SYSTEM

Non-negotiable:

Sponsored != Verified.

Partner tier != score.

Payment != ranking truth.

Cloud View cannot be purchased.

Verification cannot be purchased.

Ads may influence placement only when labeled:

```text
Sponsored
```

and never alter factual score.

---

# 49. GUARANTEE

Future:

# ROOM MATCH GUARANTEE

Possible promise:

If delivered room materially differs from the verified booked room/room class/view conditions:

- support;
- alternative room;
- voucher;
- partial refund according to policy.

Do not launch Guarantee before operational process and financial rules exist.

No weather guarantee.

---

# 50. CLOUD ALERT

Future retention feature.

Input:

- preferred dates;
- budget;
- guests;
- room needs.

When environmental forecast indicates good window:

notify customer.

Show real:

- verified room availability;
- bike availability;
- bus seat data if available.

No fake urgency.

---

# 51. CLOUD FORECAST

Future separate from Cloud View.

Uses weather signals.

Possible public output:

```text
Low
Medium
High potential
```

Do not claim certainty.

No:

```text
92% chắc chắn có mây
```

without validated statistical model.

---

# 52. REVIEW SYSTEM

Review should support room/exact room context.

Future dimensions:

- room accuracy;
- view accuracy;
- cleanliness;
- soundproof;
- staff;
- road;
- WiFi;
- bathroom;
- value.

Important question:

> View thực tế có giống bằng chứng không?

This creates verification feedback loop.

---

# 53. ATTRIBUTION

Track:

```text
content_source
campaign
video_id
landing
search
room_viewed
trip_option
package_viewed
checkout
booking
revenue
gross_contribution
```

Do not store unnecessary sensitive tracking.

Use first-party attribution where possible.

---

# 54. KEY METRICS

North Star:

# COMPLETED TRIP BOOKINGS

Secondary:

```text
Room Nights
GBV
AOV
Gross Contribution
Gross Margin
Conversion Rate
Cancellation Rate
Repeat Rate
Package Attach Rate
Motorbike Attach Rate
Bus Attach Rate
Partner Retention
Inventory Utilization
```

---

# 55. PARTNER HEALTH

Future score:

- rate competitiveness;
- availability freshness;
- confirmation speed;
- cancellations;
- accuracy;
- customer rating;
- circumvention incidents.

This can influence commercial ranking.

But verification scores remain factual.

---

# 56. MULTI-DESTINATION DESIGN

Do not hard-code Tà Xùa deeply in relational model.

Reusable hierarchy:

```text
Destination
→ Property
→ Room Type
→ Physical Room
→ Verification
```

and:

```text
Destination
→ Service
→ Package
```

UI can remain Tà Xùa-specific initially.

Architecture should not require total rewrite to add Mộc Châu.

---

# 57. ADMIN TARGET MODULES

Long-term Admin:

```text
Dashboard
Destinations
Properties
Room Types
Physical Rooms
Verification
Media / 360
Rates
Availability
Suppliers
Partners
Services
Motorbike Integration
Bus
Packages
Trip Finder Rules
Bookings
Supplier Tasks
Customers
Payments
Reviews
Content
Attribution
Analytics
Settings
```

Do not add empty nav items before feature implementation.

---

# 58. DATA OWNERSHIP

Facts must have clear owner.

Examples:

```text
Property facts → Stay property domain
Cloud View → Stay verification domain
Road → Stay verification domain
Sell room rate → Stay pricing domain
Room availability → Stay inventory
Bike fleet state → Biker
Bus seat state → Bus supplier / Stay mirror
Package economics → Stay Travel Commerce
Booking → Stay
```

Avoid duplicate competing source-of-truth.

---

# 59. SECURITY PRINCIPLES

Keep:

- RLS on business tables;
- anon explicit reads;
- no anonymous writes;
- no service-role in public flow;
- app_metadata roles;
- public DTOs;
- internal cost fields private;
- supplier contact private;
- payment details private;
- booking token hashed;
- no PII in referral URL.

Travel Commerce adds sensitive commercial data.

Never expose:

```text
net cost
supplier bank
internal margin
supplier direct contact
internal task notes
staff IDs
```

publicly.

---

# 60. COMMERCIAL DATA SECURITY

Public:

```text
sell price
market comparison if intentional
package price
verified facts
public supplier/property brand
```

Private:

```text
net rate
supplier cost
target margin
gross contribution
contract terms
partner tier internal reason
```

Use separate views/DTO.

Do not rely only on UI hiding.

---

# 61. MIGRATION DISCIPLINE V2

Existing migrations 001–008 are immutable if remote-applied.

Every V2 phase:

```text
npx.cmd supabase migration list
```

must confirm expected Local = Remote.

New migration:

```text
db push --dry-run
```

must show only expected new migrations.

Then:

```text
db push
migration list
db lint --linked
```

Never:

```text
db reset
migration repair
drop schema
force history
```

without explicit owner approval.

---

# 62. QUALITY GATE

Every phase:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

No phase completion if gates fail.

Also:

```text
git status
git diff
git log --oneline
```

No secret files.

No fake production data.

---

# 63. MASTER PLAN V2 ROADMAP

The V2 roadmap restarts numbering from Phase 1.

These phases are NOT the old Phase 1–11.

The previous implementation is treated as:

# LEGACY FOUNDATION COMPLETED

The new Phase 1 begins from the CURRENT repository state.

---

# PHASE 1 — ARCHITECTURE ALIGNMENT
## DESTINATION + PHYSICAL ROOM + EXACT ROOM FOUNDATION

This is the first V2 phase.

It exists specifically because the current system was built around:

```text
Property
→ Room Type
```

and V2 requires:

```text
Destination
→ Property
→ Room Type
→ Physical Room
```

## Phase 1 goals

1. Add Destination.
2. Add Physical Room / Room ID.
3. Make current domains compatible with exact-room data.
4. Preserve all existing functionality.
5. Do not yet build Package, Booking, Supplier or Motorbike commerce.
6. Do not remove room-type pooled inventory.
7. Do not invalidate migrations 001–008.

## Phase 1 current-code changes

### Database

Create additive migration after 008.

Suggested:

```text
202608290009_v2_destination_and_physical_rooms.sql
```

Add:

```text
destinations
physical_rooms
```

Add:

```text
properties.destination_id
```

Backfill all existing properties to initial:

```text
ta-xua
```

only if existing production property rows exist and the mapping is objectively known.

Do not fabricate property-specific facts.

Initial destination record is infrastructure/business identity, not fake accommodation data.

### properties

Update:

```text
property schema
types
queries
Admin
public DTO where destination is needed
test fixtures
```

Destination should default to Tà Xùa in current Admin UX but be an actual foreign key.

### physical_rooms

Fields:

```text
id
property_id
room_type_id
room_code
display_name
floor_label
unit_label
position_notes
exact_room_bookable
is_active
publish_status
created_at
updated_at
created_by
updated_by
```

Constraints:

- same property as room type;
- unique property + room code;
- stable code;
- no hard delete by default.

### media_assets

Add optional:

```text
physical_room_id
```

Refactor ownership constraint safely.

Media may belong to exactly one:

```text
property
room_type
physical_room
```

Do not break existing rows.

### verification

Extend target support.

Existing records remain valid.

New verification may target physical room for:

```text
room
cloud_view
media_360
```

Do not force all Cloud View to exact room immediately.

Create explicit target resolution.

### public pages

Do not create indexed physical-room pages automatically.

Room-type page can show:

```text
Các phòng cụ thể đã xác minh
```

when exact rooms exist.

### Admin

Add:

```text
/admin/rooms/physical
```

or property-scoped equivalent.

Staff can:

- create room ID;
- link room type;
- set floor;
- identify exact-room bookability;
- attach media;
- start exact-room verification.

### Availability

Current room-type inventory remains unchanged.

Do not move availability to physical room yet.

### Pricing

Current room-type rate remains unchanged.

### Search

Still returns room types.

Optionally enrich with:

```text
exact_room_verified_count
```

only if truthfully derived.

### SEO

Do not create thin physical-room pages.

### Tests

Test:

- destination ownership;
- room code uniqueness;
- room/room-type property consistency;
- media exact target;
- verification exact target;
- existing room-type flows still pass;
- existing search/rate/availability unchanged.

### Acceptance

Current public site behaves as before when no physical rooms exist.

New exact-room data is additive.

---

# PHASE 2 — VERIFIED ROOM PROFILE V2
## EXACT ROOM + QUALITY + PROS / CONS

Goal:

turn Verified Standard from room-type heavy into exact-room-capable trust layer.

Build:

- Exact Room Verified;
- exact view evidence;
- physical-room Cloud View;
- physical-room 360;
- Room ID display;
- strengths;
- weaknesses;
- later quality dimensions.

Do not merge quality into Cloud View.

Potential new tables:

```text
room_quality_assessments
room_profile_notes
```

or normalized verification extensions.

Customer UI:

```text
Room ID
Cloud View
View from Bed
View position
Direction
Verification date
360
Pros
Cons
```

Fallback:

If physical room not assigned:

clearly say verification applies to room type, not exact unit.

Do not overpromise exact-room assignment.

---

# PHASE 3 — SUPPLIER + PARTNER FOUNDATION
## COMMERCIAL RELATIONSHIP SEPARATE FROM PUBLIC PROPERTY

Add:

```text
suppliers
partners
partner_properties
partner_terms
```

Goals:

- private supplier data;
- commercial relationship;
- confirmation method;
- partner tier;
- cancellation terms;
- room supplier mapping.

Do not add partner portal yet.

Do not expose owner phone / bank publicly.

Introduce Partner Tier independently from Verification.

---

# PHASE 4 — COMMERCIAL ECONOMICS
## NET COST + MARKET REFERENCE + SELL PRICE

Preserve Phase 5 sell-price engine.

Add private economics.

Potential:

```text
supplier_rate_costs
market_reference_rates
```

Do not modify public price semantics silently.

Admin must distinguish:

```text
Sell Rate
Net Cost
Market Reference
```

Add:

- contribution preview;
- margin calculation;
- weekday negotiation support;
- future package economics primitives.

All integer VND.

No dynamic pricing ML.

---

# PHASE 5 — MOTORBIKE SERVICE INTEGRATION
## BIKER AS OPERATIONS SOURCE-OF-TRUTH

Do not copy Biker fleet.

Build Stay Travel Commerce adapter.

MVP:

```text
motorbike_service_offers
provider = taxua_biker
confirmation_mode = manual / external
```

Optional server integration only if Biker exposes safe API.

Stay can quote/add motorbike to Trip Option.

No shared DB.

No customer PII in public query strings.

Prepare external reference model.

---

# PHASE 6 — PACKAGE COMMERCE FOUNDATION
## TRIP PACKAGE + GENERIC COMPONENTS

Create:

```text
trip_packages
package_components
```

Support component types:

```text
ROOM
MOTORBIKE
BUS
TRANSFER
ACTIVITY
MEAL
GUIDE
SERVICE
CUSTOM
```

Initial package examples may be:

```text
Easy Trip
Cloud Hunter
Ultimate Cloud
```

Do not hard-code only those.

Build package cost / sell calculation.

No checkout yet.

---

# PHASE 7 — TRIP FINDER / DECISION ENGINE V1

Build guided flow.

Inputs:

- dates;
- guests;
- budget;
- view preference;
- couple/group;
- road preference;
- transport;
- bike;
- amenities.

Output:

```text
3 recommended trip options
```

Deterministic rules only.

Each result shows:

- why recommended;
- room;
- verification;
- availability;
- price;
- package components;
- total trip price.

Do not hallucinate.

Do not hide alternatives.

---

# PHASE 8 — UNIFIED TRIP BOOKING
## BOOKING + BOOKING ITEMS + SUPPLIER CONFIRMATION

Create:

```text
customers
bookings
booking_items
booking_events
supplier_tasks
```

Booking is trip-level.

Items support multiple service types.

Reuse secure token pattern.

Snapshot:

- customer;
- dates;
- room;
- pricing lines;
- inventory state;
- component costs/sell;
- package version.

Atomic room availability recheck.

Motorbike/bus can initially use manual confirmation.

No payment required to complete initial MVP request if not ready.

---

# PHASE 9 — CHECKOUT + DEPOSIT + BOOKING ECONOMICS

Add:

```text
payment records
deposit
balance
payment state
```

Booking economics:

```text
GBV
Supplier Cost
Discount
Payment Fee
Variable Cost
Gross Contribution
Gross Margin
```

Do not expose economics publicly.

Payment success != trip confirmation.

---

# PHASE 10 — TRIP OPERATIONS + CUSTOMER TRIP DASHBOARD

Build:

```text
My Tà Xùa Trip
```

Show:

- booking;
- component confirmations;
- room;
- exact room if assigned;
- 360;
- bus;
- bike;
- itinerary;
- support;
- payment balance;
- arrival instructions.

Admin operations:

- supplier tasks;
- unresolved confirmation;
- upcoming trips;
- check-in;
- transport dependencies.

---

# PHASE 11 — BUS + TRANSFER + ADD-ON SERVICES

Add structured supplier services:

- bus;
- pickup;
- transfer;
- BBQ;
- photography;
- guide;
- trekking;
- meals.

Use generic component architecture.

Do not turn every service into unrelated custom tables unless facts require it.

Manual confirmation acceptable.

---

# PHASE 12 — GROWTH / DATA / INTELLIGENCE

Subphases may be separately reviewed:

```text
Review system
Content attribution
Cloud Forecast
Cloud Alert
Referral
Loyalty
Partner Dashboard
Import expansion
Analytics
```

AI only after trusted data.

Partner extranet only after operational demand.

---

# PHASE 13 — MULTI-DESTINATION HARDENING

After Tà Xùa proves demand:

- remove remaining hidden Tà Xùa assumptions;
- destination-aware SEO;
- destination configuration;
- destination service catalogs;
- per-destination policies.

Do not prematurely optimize before Tà Xùa operational fit.

---

# 64. PHASE 1 — DETAILED CODE CHANGE MAP

This section is mandatory for the first implementation after V2 adoption.

The current codebase already has:

```text
src/features/properties
src/features/rooms
src/features/media
src/features/verification
src/features/pricing
src/features/availability
```

Phase 1 should add:

```text
src/features/destinations
src/features/physical-rooms
```

and modify existing domains.

## Properties modifications

Add:

```text
destination_id
```

Update:

- DB migration;
- types;
- schemas;
- data queries;
- Admin form;
- public DTO only if useful;
- test fixtures.

Do not remove `area_name`.

Area is within destination.

## Room Types modifications

Keep `room_types`.

Clarify naming in docs:

```text
room_type = commercial/pool category
physical_room = exact unit
```

Do not rename DB table unless necessary.

## Media modifications

Ownership moves from:

```text
property XOR room_type
```

to:

```text
exactly one of:
property
room_type
physical_room
```

Update:

- DB check;
- media schema;
- admin selector;
- public queries;
- verification evidence checks.

## Verification modifications

Current target rules should be extended.

Do not make target polymorphism uncontrolled.

Use explicit columns:

```text
property_id
room_type_id
physical_room_id
```

with constraints based on verification_type.

Exact Cloud View rules:

If physical_room_id exists:

evidence must target same physical room.

Room-type Cloud View remains allowed for genuinely equivalent pooled rooms.

## 360 viewer

No change to renderer needed.

Only target ownership / labels.

## Pricing modifications

None required in Phase 1 except type references if shared room types change.

Rates remain room_type-level.

## Availability modifications

None required in Phase 1 except compatibility tests.

Inventory remains room_type-level.

## Search modifications

No forced physical-room search.

Search remains room-type-first.

May expose:

```text
Exact Room Verified available
```

only as derived badge when facts exist.

## Admin modifications

Add Destination management minimally.

Because only Tà Xùa exists initially, Admin can have:

```text
Settings / Destination
```

or dedicated route.

Add physical-room management.

Do not expose irrelevant multi-destination complexity to normal operator workflow.

---

# 65. PHASE 1 MIGRATION SAFETY

Expected current migrations:

```text
001
002
003
004
005
006
007
008
```

Before Phase 1:

```text
npx.cmd supabase migration list
```

All must match Local = Remote.

New:

```text
009_v2_destination_and_physical_rooms
```

Do not edit old migration.

After implementation:

```text
npx.cmd supabase db push --dry-run
```

Only 009 pending.

Then:

```text
npx.cmd supabase db push
npx.cmd supabase migration list
npx.cmd supabase db lint --linked
```

---

# 66. PHASE 1 BACKFILL POLICY

Destination backfill:

If all existing Stay properties are objectively Tà Xùa properties:

safe to backfill destination_id to Tà Xùa.

This does not invent lodging facts.

Physical rooms:

Do NOT auto-generate fake physical room IDs from `room_types.quantity`.

Example forbidden:

```text
Deluxe quantity=4
→ auto create Room 1,2,3,4
```

unless real unit identities are known.

No fake Room ID.

Existing room types may have zero physical_room rows.

That is valid.

---

# 67. EXACT ROOM PUBLIC CLAIM RULE

Badge:

```text
Exact Room Verified
```

requires:

1. physical_room exists;
2. current Room verification;
3. current exact-target evidence;
4. room code/identity known;
5. required verification not expired.

Do not derive Exact Room Verified solely from room_type verification.

---

# 68. PACKAGE ANTI-CIRCUMVENTION RULE

Do not design package as just UI grouping.

Package must eventually own value:

- bundled price;
- support;
- verified component selection;
- operational coordination;
- supplier confirmation;
- trip dashboard.

Otherwise customer can reconstruct it manually.

---

# 69. SUPPLIER COMMERCIAL RULE

Net Cost is private.

Never send supplier net rates to browser.

Admin and server-only computations may use net cost.

If public client needs package price:

server provides computed public DTO.

RLS alone is not enough if raw cost columns are in a public view.

---

# 70. PRICING / PACKAGE SNAPSHOT RULE

Any final/requested booking must snapshot pricing.

Do not recalculate historical booking from current rate tables.

Snapshot:

```text
component
quantity
net cost
sell price
market reference if used
subtotal
discount
fees
total
policy version
source
```

---

# 71. INVENTORY / BOOKING ATOMICITY

When Phase 8 arrives:

```text
public availability check
→ atomic booking create re-check
→ supplier confirmation / inventory lock
```

For trusted inventory:

use transaction / row locks.

No overbooking.

For manual confirmation:

booking status must reflect pending confirmation.

Do not pretend inventory is locked.

---

# 72. LOCAL OPERATIONS FIRST

MVP can be operationally manual.

Examples:

- admin updates availability;
- admin enters rates;
- supplier confirms via Zalo;
- staff clicks confirmed;
- Biker confirms manually;
- bus confirms manually.

Do not overbuild APIs before volume.

Core requirement:

system records state accurately.

---

# 73. IMPORT V2

Current/future import should eventually support:

```text
Destinations
Properties
RoomTypes
PhysicalRooms
Amenities
Media
Verification
Rates
Inventory
Suppliers
Partners
Packages
```

Use preview / audit / rollback.

Do not import Net Cost via public-safe paths.

---

# 74. VERCEL / SEO POLICY

Keep current:

Temporary `.vercel.app`:

```text
noindex,nofollow
```

Final brand domain only enables indexing when:

```text
NEXT_PUBLIC_SITE_URL
```

is explicitly configured.

When product architecture changes:

do not accidentally index internal or unfinished Trip routes.

---

# 75. URL STRATEGY

Existing URLs can remain.

Examples:

```text
/tim-phong
/homestay/[slug]
/homestay/[propertySlug]/phong/[roomSlug]
/verified
```

Future:

```text
/tim-chuyen-di
/trip/[slug]
/booking/[token]
/trip-dashboard/[token]
```

Do not expose physical room internal UUID.

If exact-room public URL exists:

use stable room_code slug carefully.

---

# 76. CUSTOMER ACCOUNT

Do not require account for MVP booking.

Private token flow is acceptable.

Account can later add:

- trip history;
- loyalty;
- referral;
- cloud alerts.

Avoid forcing auth early and harming conversion.

---

# 77. MOBILE-FIRST OPERATIONS

Admin workflows used locally must be usable on phone:

- availability update;
- supplier confirmation;
- booking tasks;
- verification;
- quick customer support.

Do not design Admin only for desktop.

---

# 78. ANALYTICS / EVENT PRINCIPLE

Events should have clear business purpose.

Suggested future:

```text
search_started
room_viewed
verification_viewed
trip_finder_completed
package_viewed
booking_started
booking_submitted
payment_completed
trip_confirmed
trip_completed
```

No invasive surveillance.

---

# 79. AI RULE

AI is not a source-of-truth.

Future AI Trip Assistant only queries verified/current data.

If no data:

say unknown.

AI cannot create:

- price;
- availability;
- Cloud View;
- supplier confirmation.

---

# 80. PRODUCT COPY RULE

Consumer language:

Use:

```text
phòng
loại phòng
phòng cụ thể
nơi lưu trú
tình trạng phòng
giá đã xác minh
view thật
chuyến đi
gói
```

Avoid exposing:

```text
room_type
physical_room
resolver
priority
policy version
supplier task
```

outside Admin/debug context.

---

# 81. LAUNCH DATA STRATEGY

Do not optimize listing count.

Better:

```text
20 properties
50 high-quality rooms
verified evidence
accurate price
fresh availability
```

than:

```text
100 properties
unknown data
```

Track:

- properties verified;
- room types verified;
- exact rooms verified;
- rooms with 360;
- fresh price coverage;
- fresh availability coverage;
- package-ready properties.

---

# 82. TRIP PACKAGE READINESS SCORE

Future internal indicator:

A property/room becomes package-ready when:

- verification current;
- rate exists;
- supplier linked;
- cancellation rule known;
- availability process known;
- room policy known.

Do not expose fake score publicly.

---

# 83. PARTNER / VERIFIED SEPARATION

Partner may be:

```text
Preferred
```

but room may be:

```text
Unverified
```

That is allowed.

Room may be:

```text
Cloud View Verified 9.4
```

while partner tier is Standard.

Commercial relationship cannot alter factual result.

---

# 84. SPONSORED SEPARATION

If paid placement later:

label Sponsored.

Ranking architecture should support:

```text
organic score
sponsored placement
```

as different dimensions.

Do not modify Cloud score for ads.

---

# 85. AVAILABILITY FUTURE ALLOTMENT

Current room_inventory represents reported sellable units.

Future allotment requires separate concept.

Do not repurpose available_quantity to mean guaranteed allotment.

Potential:

```text
inventory_allotments
release_date
committed_quantity
```

Only after volume.

---

# 86. STOP-SELL

Future inventory may include:

```text
stop_sell
minimum_stay
```

Do not add until supplier workflow requires it.

Avoid turning MVP into full OTA engine.

---

# 87. CUSTOMER GUARANTEE LANGUAGE

Until Room Match Guarantee operational policy exists:

Use:

```text
Đã xác minh
View Thật
```

Do not say:

```text
Đảm bảo hoàn tiền
Guaranteed
100% exactly
```

unless policy supports it.

---

# 88. PUBLIC SUPPLIER CONTACT

Property public contact strategy should be reconsidered as Travel Commerce matures.

Do not suddenly hide current legitimate public information solely for anti-circumvention.

Instead improve platform CTA and utility.

Commercial private supplier contact stays private.

---

# 89. REPOSITORY STRATEGY

Keep current repository:

```text
TaXuaStay
```

Do not create a new Travel repo now.

Reason:

- current code already contains core verified accommodation data;
- replatform cost unnecessary;
- Travel Commerce can evolve modularly.

If future org needs separate orchestration service:

decide later with evidence.

---

# 90. CODE MODULE PRINCIPLE

Suggested future feature directories:

```text
src/features/destinations
src/features/properties
src/features/rooms
src/features/physical-rooms
src/features/verification
src/features/media
src/features/pricing
src/features/availability
src/features/suppliers
src/features/partners
src/features/services
src/features/motorbike-integration
src/features/packages
src/features/recommendations
src/features/bookings
src/features/supplier-tasks
src/features/payments
src/features/trips
src/features/reviews
src/features/attribution
```

Avoid giant `travel.ts`.

---

# 91. PUBLIC VS INTERNAL DTO PRINCIPLE

For every new domain ask:

```text
What may anonymous users know?
What may customers with token know?
What may staff know?
What may admin know?
```

Create explicit selectors.

Never:

```text
select("*")
```

on public/commercial sensitive paths.

---

# 92. CURRENT CODE DO-NOT-BREAK LIST

Phase 1 V2 must preserve:

```text
/tim-phong
property page
room type page
Verified Standard
Cloud View
Road Verified
360
pricing
price confidence
availability
availability freshness
Admin settings
Admin properties
Admin rooms
Admin media
Admin verification
Admin rates
Admin availability
```

No regression acceptable.

---

# 93. CURRENT DATA MIGRATION RULE

No existing production accommodation data may be silently reinterpreted.

Examples:

Do not:

```text
room_type quantity 4
→ infer four room IDs
```

Do not:

```text
room-type Cloud View
→ claim every physical room identical
```

Do not:

```text
public price
→ infer net cost
```

Do not:

```text
current inventory
→ infer guaranteed allotment
```

Unknown remains unknown.

---

# 94. MVP V2 CUT LINE

Do not try to build all V2 phases before validating market.

Recommended commercially meaningful MVP:

```text
Destination
Physical Room
Verified Room Profile
Availability
Supplier
Motorbike Component
Package
Trip Finder
Booking Items
Supplier Confirmation
Trip Dashboard
```

Payment can initially remain manual/deposit workflow.

Bus can initially be manual.

Partner portal later.

---

# 95. V2 SUCCESS SCENARIO

Customer:

1. enters dates;
2. says budget and preferences;
3. sees 3 trip options;
4. sees exact evidence;
5. knows price and availability confidence;
6. chooses package;
7. submits booking;
8. staff confirms room + bike + bus;
9. customer receives trip dashboard;
10. customer travels with one coordinated plan.

Supplier:

1. has property verified;
2. gets traffic;
3. supplies rates;
4. supplies availability;
5. confirms bookings;
6. sees bookings generated;
7. has reason to remain partner.

---

# 96. NON-GOALS FOR NEAR TERM

Do not build yet:

- global OTA;
- multi-currency;
- complex yield management;
- ML dynamic pricing;
- real-time integrations with every homestay;
- full supplier extranet;
- blockchain;
- shared Biker/Stay database;
- giant microservice fleet;
- AI hallucinated itinerary;
- guaranteed weather;
- nationwide expansion.

---

# 97. CODEX EXECUTION RULES

For every new V2 phase:

1. read:
   - AGENTS.md
   - STAY_ARCHITECTURE.md
   - this Master Plan V2
   - previous phase docs;
2. inspect migration state;
3. audit prior phase;
4. implement only requested phase;
5. run tests;
6. dry-run migration;
7. push migration safely;
8. run remote smoke;
9. commit;
10. push;
11. stop.

Do not autonomously continue into next phase.

---

# 98. STOP CONDITIONS

Codex must stop if:

- wrong Git remote;
- Supabase Local/Remote mismatch;
- Biker could be modified;
- destructive migration needed;
- schema assumptions conflict with production;
- data backfill would invent facts;
- external API requires owner credentials;
- commercial policy unclear enough to affect money/booking;
- security boundary unclear;
- tests cannot pass without changing agreed business behavior.

Report exact blocker.

---

# 99. V2 PHASE COMPLETION REPORT FORMAT

Every phase report:

## Repository

- branch;
- HEAD;
- commit.

## Pre-audit

- issues;
- fixes.

## Migration

- before;
- new migration;
- dry-run;
- push;
- after;
- db lint.

## Database

- tables;
- constraints;
- RLS;
- views/RPC.

## Application

- public routes;
- Admin;
- integrations.

## Data integrity

- backfill;
- unknown handling;
- production fake data check.

## Security

- anon;
- staff;
- admin;
- private commercial data.

## Tests

- lint;
- typecheck;
- test count;
- build.

## Vercel

- deployment;
- noindex policy.

## Scope stop

Explicitly confirm next phase not started.

---

# 100. MASTER ACCEPTANCE PRINCIPLES

The completed V2 architecture must support:

```text
TÀ XÙA STAY
= verified accommodation intelligence

PLUS

TRIP COMMERCE
= packaging + booking + local operations
```

without making Biker a database dependency.

The final product should make customer think:

> Website này giúp tôi tránh chọn sai và đỡ phải tự ghép cả chuyến đi.

Not:

> Đây là nơi có danh sách homestay.

---

# 101. FINAL PRODUCT NORTH STAR

The system wins if customers ask:

> Bên này đã verify phòng nào đẹp?

and then:

> Có gói nào phù hợp cho lịch của tôi?

and suppliers ask:

> Làm sao để phòng của tôi được Verified và được đưa vào các trip option?

That is the intended moat.

---

# 102. ONE-SENTENCE ARCHITECTURE SUMMARY

# Tà Xùa Stay V2 là nền tảng Verified Local Travel Commerce: Destination → Verified Accommodation → Local Services → Package → Trip Booking → Supplier Operations, trong đó dữ liệu xác minh tạo trust, package tạo value, local operations tạo margin và distribution tạo network moat.

---

# 103. IMMEDIATE NEXT ACTION

Do NOT run the old post-Phase-6 roadmap.

The immediate next implementation is:

# V2 PHASE 1 — ARCHITECTURE ALIGNMENT

Specifically:

```text
Destination
Physical Room
Room ID
Exact-room-compatible Media
Exact-room-compatible Verification
```

while preserving:

```text
Rate
Availability
Search
SEO
Verified Standard
```

This Phase must be completed and reviewed before Supplier / Package / Booking expansion.

---

# END OF TÀ XÙA STAY / VERIFIED LOCAL TRAVEL COMMERCE — CODEX MASTER PLAN V2
