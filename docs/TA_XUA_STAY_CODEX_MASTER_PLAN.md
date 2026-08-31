# TÀ XÙA TRIP — CODEX MASTER PLAN V2.1
## Verified Local Travel Platform
### Stay Migration + Travel Commerce Architecture + Public UX / Brand System

**Version:** 2.1
**Ngày chốt định hướng:** 30/08/2026
**Target repository:** `vtmedia0910/TaXuaStay`  
**Read-only technical reference:** `vtmedia0910/taxuabiker2`  
**Canonical target file trong repo sau khi áp dụng:** `docs/TA_XUA_STAY_CODEX_MASTER_PLAN.md`
**Current product state:** Legacy Foundation 001–008 + V2 Phase 1 / migration 009 + V2 Phase 2 / migration 010 + application-only V2 Phase 2.5 + V2 Phase 2.6 / migrations 011–014 + V2 Phase 2.6H / migration 015 + V2 Phase 3 / migration 016 + corrective V2 Phase 3H / migration 017 + V2 Phase 4 / migrations 018–020 + V2 Phase 5 / migrations 021–022 + V2 Phase 6 / migration 023 đã hoàn thành. Phase 5 dùng manual/reference integration và không sao chép vận hành Biker. Phase 6 có Package domain, explicit sell-price authority, private economics và inquiry flow nhưng không tạo Booking/Payment. V2 Phase 7 — Trip Finder chưa bắt đầu và chỉ được thực hiện khi có task riêng.

---

# 0. TUYÊN BỐ SOURCE OF TRUTH

Tài liệu này là **Master Plan V2.1** và thay thế toàn bộ định hướng trước đó nếu có mâu thuẫn.

Nếu một tài liệu cũ nói:

- Tà Xùa Stay là master brand;
- homepage chính là website lưu trú;
- booking chỉ là room booking;
- Biker chỉ là outbound referral;
- package chỉ là tính năng phụ;
- hoặc UI tiếp tục xoay quanh homestay như sản phẩm trung tâm;

thì các điểm đó được coi là **superseded** bởi V2.1.

Từ V2.1:

# TÀ XÙA TRIP LÀ MASTER BRAND.

# TÀ XÙA STAY KHÔNG CÒN LÀ BRAND ĐỘC LẬP.

Toàn bộ code/data hiện tại của Tà Xùa Stay trở thành vertical:

# `/stay`

trong hệ sinh thái Tà Xùa Trip.

Không rewrite mù quáng.

Không bỏ dữ liệu đã xây.

Không đổi database chỉ để đổi tên.

Không phá SEO.

Không merge Biker vào Stay database.

---

# 1. QUYẾT ĐỊNH CHIẾN LƯỢC ĐÃ CHỐT

## 1.1 Master brand

```text
TÀ XÙA TRIP
```

## 1.2 Slogan

```text
Đi thật. Biết trước.
```

## 1.3 Campaign line

```text
Tà Xùa, trước khi bạn đến.
```

## 1.4 Positioning

```text
VERIFIED LOCAL TRAVEL
```

Nền tảng thẩm định và thiết kế hành trình địa phương.

## 1.5 Brand promise

```text
Biết rõ trước khi lên đường.
```

## 1.6 Core values

```text
THẬT — HIỂU — TRỌN VẸN
```

## 1.7 Principle

```text
Không bán cái đẹp. Bán cái phù hợp.
```

## 1.8 Culture rule

```text
Đừng bán cho khách một chuyến đi mà chính mình sẽ không chọn.
```

## 1.9 Operational promise

```text
Phần phức tạp để chúng tôi lo.
```

---

# 2. PRODUCT PURPOSE

Mục tiêu của Tà Xùa Trip không phải giúp khách thấy nhiều listing hơn.

Mục tiêu là thu hẹp khoảng cách giữa:

```text
THỨ KHÁCH THẤY TRÊN INTERNET
```

và:

```text
THỨ KHÁCH THẬT SỰ NHẬN ĐƯỢC KHI ĐẾN NƠI
```

Tà Xùa Trip phải giúp khách:

- biết đúng phòng;
- biết đúng view;
- biết đường vào;
- biết điểm mạnh;
- biết điểm yếu;
- biết mức giá;
- biết độ tin cậy của giá;
- biết tình trạng phòng;
- biết tình trạng đó mới đến đâu;
- biết dịch vụ nào còn chưa được xác nhận;
- biết nên chọn phương án nào;
- ghép phòng + xe khách + xe máy + dịch vụ thành một chuyến;
- có một đầu mối hỗ trợ.

---

# 3. PRODUCT POSITIONING — KHÔNG PHẢI OTA THÔNG THƯỜNG

Không xây:

```text
Booking.com bản Tà Xùa
```

Không xây:

```text
directory 100 homestay
```

Không xây:

```text
website review homestay
```

Xây:

# VERIFIED LOCAL TRAVEL PLATFORM

Giá trị cốt lõi:

```text
VERIFY
→ BUNDLE
→ OPERATE
→ DISTRIBUTE
```

---

# 4. 4 TRỤ CỘT HỆ THỐNG

## 4.1 VERIFY

Thẩm định:

- Property;
- Room Type;
- Physical Room;
- Room ID;
- Exact Room;
- Cloud View;
- View From Bed;
- Road Access;
- Parking;
- Media;
- 360;
- Room Quality;
- Pros;
- Cons;
- Price freshness;
- Availability freshness.

## 4.2 BUNDLE

Ghép:

- Stay;
- Bus;
- Motorbike;
- Transfer;
- Meal;
- Activity;
- Guide;
- Support;
- Package;
- Itinerary.

## 4.3 OPERATE

Vận hành:

- supplier confirmation;
- motorbike operations;
- availability;
- booking tasks;
- pickup;
- arrival instructions;
- trip support;
- after-sales.

## 4.4 DISTRIBUTE

Tạo demand:

- SEO;
- TikTok;
- Facebook;
- Reels;
- Shorts;
- Blog;
- comparison;
- verified content;
- room walkthrough;
- cloud content.

---

# 5. 6 NGUYÊN TẮC CÔNG KHAI

1. Thấy gì nói đó.
2. Không xác minh thì không khẳng định.
3. Không bán sự đánh giá.
4. Không ép khách chọn sản phẩm lợi nhuận cao nhất.
5. Giá trị chuyến đi quan trọng hơn giá rẻ nhất.
6. Phần phức tạp để chúng tôi lo.

---

# 6. BRAND ARCHITECTURE

Target:

```text
TÀ XÙA TRIP
│
├── Lưu trú / Stay
│   ├── Property
│   ├── Room Type
│   ├── Exact Room
│   ├── Verified Standard
│   ├── Cloud View
│   ├── 360
│   ├── Rate
│   └── Availability
│
├── Combo / Trip Package
│
├── Xe khách
│
├── Xe máy
│   └── nguồn vận hành: Tà Xùa Biker
│
├── Săn mây / Cloud Intelligence
│
├── Cẩm nang
│
└── My Trip
```

---

# 6A. NAMING ARCHITECTURE — LOCKED

V2.1 chốt ba lớp naming khác nhau để tối ưu đồng thời UX, SEO và khả năng mở rộng:

```text
MASTER BRAND
Tà Xùa Trip

CONSUMER TAXONOMY
Lưu trú

SEO / SEARCH LANGUAGE
Homestay Tà Xùa

TECHNICAL DOMAIN
Stay / /stay
```

Lý do:

- `Homestay` là vocabulary acquisition/search intent quan trọng.
- `Lưu trú` bao quát Homestay, Khách sạn, Bungalow, Villa, Nhà nghỉ và các loại hình tương lai.
- `Stay` ngắn, sạch cho code/namespace nhưng không phải từ bắt khách Việt phải hiểu.
- Không đổi `/stay` thành `/homestay` chỉ để SEO.
- SEO được tối ưu bằng title, H1, copy, internal links, landing pages, entity data và first-party verified content.
- Không biến `Homestay` thành taxonomy root vì khách sạn/villa/bungalow không phải homestay.

Canonical consumer hierarchy:

```text
Tà Xùa Trip
→ Lưu trú
→ Homestay / Khách sạn / Bungalow / ...
→ Cơ sở lưu trú
→ Loại phòng
→ Phòng cụ thể
```

---

# 7. TÀ XÙA STAY — VAI TRÒ MỚI

Tà Xùa Stay không bị xóa.

Nó được nâng cấp thành:

# STAY VERTICAL

Trong UI consumer cuối:

```text
TÀ XÙA TRIP
→ LƯU TRÚ
```

Trong codebase:

- giữ các table hiện tại;
- giữ module;
- giữ logic;
- giữ migration;
- giữ test;
- giữ admin tool;
- giữ SEO value;
- đổi role của homepage/brand.

---

# 8. TÀ XÙA BIKER — VAI TRÒ

Tà Xùa Biker tiếp tục là:

```text
SPECIALIZED MOTORBIKE OPERATIONS SOURCE-OF-TRUTH
```

Biker giữ:

- fleet;
- plate;
- maintenance;
- rental operations;
- bike QR;
- handover;
- repair;
- operational history.

Trip không copy Biker database.

Trip tích hợp Biker qua:

```text
manual confirmation
external reference
API later
signed server calls later
webhook later
```

Consumer copy có thể:

```text
Dịch vụ xe máy vận hành bởi Tà Xùa Biker
```

---

# 9. CURRENT CODEBASE — LEGACY FOUNDATION COMPLETED

Migrations đã có trước V2:

```text
001 Foundation
002 Property / Room / Amenity / Media
003 Accommodation Hardening
004 Verified Standard
005 Verification Hardening
006 Pricing
007 Pricing Hardening
008 Availability
```

V2 Phase 1:

```text
009 Destination + Physical Room
```

Các domain hiện đã có:

- settings;
- auth;
- admin;
- properties;
- room types;
- amenities;
- media;
- 360;
- verification;
- Cloud View;
- Road Verified;
- rates;
- room rate rules;
- availability;
- search;
- SEO;
- destinations;
- physical rooms.

Không rewrite.

---

# 10. CURRENT CODE DO-NOT-BREAK LIST

Bắt buộc preserve:

```text
/tim-phong
property page
room type page
Verified Standard
Cloud View
Road Verified
360
Pricing
Price Confidence
Availability
Availability freshness
Admin Settings
Admin Properties
Admin Room Types
Admin Physical Rooms
Admin Media
Admin Verification
Admin Rates
Admin Availability
```

---

# 11. V2.1 INFORMATION ARCHITECTURE

Target public IA:

```text
/
```

Homepage Tà Xùa Trip.

```text
/stay
```

Root taxonomy kỹ thuật và landing consumer cho **Lưu trú**.

Quy tắc naming đã chốt:

```text
Master brand: Tà Xùa Trip
Navigation category: Lưu trú
Category H1/SEO: Homestay & lưu trú Tà Xùa
Technical namespace: /stay
```

Không dùng “Stay” làm từ chính trên giao diện khách hàng. `stay` là technical namespace.

SEO acquisition routes ưu tiên ngôn ngữ người dùng thực sự tìm kiếm:

```text
/stay/homestay-ta-xua
/stay/khach-san-ta-xua
/stay/homestay-san-may-ta-xua
/stay/homestay-view-tu-giuong-ta-xua
/stay/homestay-cho-couple-ta-xua
/stay/homestay-cho-nhom-ta-xua
/stay/homestay-co-cho-do-o-to-ta-xua
```

Các route chỉ được tạo khi có nội dung/data đủ khác biệt; không tạo hàng loạt thin pages.

Entity routes:

```text
/stay/[propertySlug]
/stay/[propertySlug]/[roomSlug]
```

Taxonomy phải cho phép mở rộng:

```text
Homestay
Khách sạn
Bungalow
Villa
Nhà nghỉ
Camping / Glamping
```

Không dùng `Homestay` làm root taxonomy vì sẽ khiến khách sạn/bungalow/villa trở thành con của một loại hình không phù hợp.

Future:

```text
/trip-finder
/combo
/combo/[slug]
/bus
/motorbike
/cloud
/guide
/blog
/about
/partner
/my-trip/[bookingCode]
```

---

# 12. URL MIGRATION PRINCIPLE

Không xóa URL cũ.

Không redirect toàn bộ về homepage.

Phải map 1:1.

Ví dụ target:

```text
old /homestay-a
→ /stay/homestay-a
```

```text
old /homestay-a/phong-x
→ /stay/homestay-a/phong-x
```

```text
old /homestay-san-may-ta-xua
→ /stay/cloud-view
```

Giữ slug ổn định nếu có thể.

---

# 13. SEO MIGRATION

Khi chuyển brand:

- title suffix → `| Tà Xùa Trip`;
- canonical → domain Trip;
- sitemap → URL mới;
- robots không index version cũ;
- redirect 301 1:1;
- structured data giữ factual fields;
- không duplicate old/new.

Temporary `.vercel.app` tiếp tục:

```text
noindex,nofollow
```

until final domain.

---

# 14. PUBLIC NAVIGATION V2.1

Header target:

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

`Lưu trú` là nhãn navigation chính thức. Không dùng `Stay` trong navigation consumer và không dùng `Homestay` làm tên taxonomy cấp master.

Trong SEO title, H1, copy và landing pages, chủ động dùng **Homestay Tà Xùa** theo search intent khi phù hợp.

Không hiển thị:

```text
Quản trị
```

trên public navigation.

Admin:

```text
/admin/login
```

---

# 15. PUBLIC FOOTER V2.1

Master brand:

```text
TÀ XÙA TRIP
Đi thật. Biết trước.
```

Columns:

```text
DỊCH VỤ
Lưu trú
Combo
Xe khách
Xe máy
Cloud

HỖ TRỢ
FAQ
Chính sách
Liên hệ
My Trip

VỀ CHÚNG TÔI
Phương pháp
Cam kết
Đối tác
Cẩm nang
```

Footer không dùng Tà Xùa Stay làm master identity.

---

# 16. VISUAL DIRECTION — PRIMARY REFERENCE

V2.1 chọn visual direction:

# LIGHT BLUE / CLOUD / MOUNTAIN NAVY

Moodboard website + marketing màu xanh nhạt là primary reference.

Moodboard xanh lá/kem chỉ giữ làm secondary reference cho trust/local accents.

---

# 17. COLOR SYSTEM V2.1

Primary:

```text
TRIP NAVY
#083D76
```

Use:

- main CTA;
- header anchors;
- trust UI;
- footer;
- navigation active;
- premium cards.

Secondary:

```text
CLOUD TEAL
#0EA5A5
```

Use:

- verification;
- interaction;
- info;
- 360;
- data accent.

Positive:

```text
TRIP GREEN
#10B981
```

Use:

- availability;
- successful operation;
- confirmed states.

Accent:

```text
SUNRISE
#F59E0B
```

Use:

- Cloud Score highlight;
- accent CTA;
- sunrise content;
- selected badges.

Canvas:

```text
CLOUD WHITE
#F6FAFC
```

Cards:

```text
WHITE
#FFFFFF
```

Ink:

```text
#16324A
```

Avoid overusing dark blue background.

70–80% page area should be light/cloud.

---

# 18. VISUAL SYSTEM RULES

UI should feel:

- trustworthy;
- calm;
- clear;
- modern;
- airy;
- travel intelligence;
- local but not rustic;
- premium without luxury pretension.

Avoid:

- overly beige eco-lodge look;
- dark green everywhere;
- generic OTA blue clone;
- gradient overload;
- fake glassmorphism;
- decorative script in body/UI.

---

# 19. TYPOGRAPHY

Primary:

```text
Be Vietnam Pro
```

Use for:

- UI;
- body;
- navigation;
- CTA;
- cards;
- Admin.

Optional campaign decorative type:

only for:

```text
Đi thật. Biết trước.
```

in marketing/hero when readable.

No decorative font for:

- forms;
- table;
- body;
- filters;
- prices.

---

# 20. ICON SYSTEM

Line icons:

- Verified;
- Shield;
- 360;
- Cloud;
- Location;
- Bus;
- Motorbike;
- Support;
- Package;
- Road;
- Parking;
- Room;
- Bed;
- Sunrise;
- View.

Rounded line style.

No icon zoo.

---

# 21. PHOTOGRAPHY

Use real:

- Tà Xùa landscape;
- sunrise;
- cloud valley;
- room-from-bed;
- balcony POV;
- bathroom;
- road access;
- parking;
- exterior;
- bus;
- motorbike;
- human-in-landscape.

Avoid stock/fake.

People should often be secondary to place.

---

# 22. BRAND CORE COPY

Keep:

```text
Đi thật. Biết trước.
```

```text
Tà Xùa, trước khi bạn đến.
```

```text
Phần phức tạp để chúng tôi lo.
```

```text
Không bán cái đẹp. Bán cái phù hợp.
```

```text
Trước khi đặt, bạn biết mình sẽ nhận được gì.
```

---

# 23. HOMEPAGE V2.1 — MASTER PURPOSE

Homepage không được là Stay homepage đổi logo.

Homepage bán:

# TRIP

Stay là một section.

---

# 24. HOMEPAGE SECTION 01 — HERO

Eyebrow:

```text
TÀ XÙA • VERIFIED LOCAL TRAVEL
```

H1:

```text
Đi thật. Biết trước.
```

Sub:

```text
Chúng tôi trực tiếp thẩm định nơi ở, quay video 360°, chỉ rõ ưu nhược điểm và kết nối phòng, xe khách, xe máy thành một chuyến Tà Xùa trọn vẹn.
```

Primary CTA:

```text
Tìm chuyến đi phù hợp
```

Secondary:

```text
Xem phòng đã thẩm định
```

---

# 25. HOMEPAGE HERO SEARCH / TRIP ENTRY

Tabbed entry target:

```text
Lưu trú
Combo
Xe khách
Xe máy
```

MVP rule:

Tabs chưa implemented đầy đủ không được giả backend.

Allowed:

- functioning;
- disabled;
- preview;
- landing.

Core form:

```text
Ngày đi
Ngày về
Số người
Nhu cầu
```

CTA:

```text
Tìm chuyến đi
```

Until Trip Finder exists:

can route to Stay search with honest wording.

---

# 26. HOMEPAGE SECTION 02 — TRUST STRIP

Only factual metrics.

Allowed claims:

```text
Phòng được kiểm tra thực tế
Video 360°
Ưu & nhược điểm minh bạch
Hỗ trợ xuyên suốt chuyến đi
```

Do not show:

```text
50+
200+
5000+
99%
```

unless real data exists.

---

# 27. HOMEPAGE SECTION 03 — TẠI SAO CHÚNG TÔI TỒN TẠI?

Message:

```text
Ảnh đẹp không nói hết một căn phòng.
Một dòng “view núi” không cho bạn biết có nhìn thấy cảnh từ giường hay đường vào có khó không.
Chúng tôi kiểm tra những chi tiết đó trước.
```

---

# 28. HOMEPAGE SECTION 04 — CHÚNG TÔI LÀM GÌ KHÁC?

Cards:

```text
THẨM ĐỊNH TẠI CHỖ
```

```text
XEM TRƯỚC BẰNG 360°
```

```text
NÓI CẢ ĐIỂM CHƯA TỐT
```

```text
GHÉP CẢ CHUYẾN ĐI
```

---

# 29. HOMEPAGE SECTION 05 — VERIFIED ACCOMMODATION

Consumer title ưu tiên:

```text
Homestay & phòng Tà Xùa đã thẩm định
```

Supporting copy:

```text
Không chỉ xem ảnh của homestay. Xem đúng loại phòng, view thực tế, ưu nhược điểm và lần kiểm tra gần nhất.
```

Cards should show real:

- Property;
- Room Type / Room ID scope;
- Cloud View;
- verification date;
- View From Bed;
- 360;
- Pros/Cons preview;
- Price;
- Availability state.

No fake score.

---

# 30. HOMEPAGE SECTION 06 — TRẢI NGHIỆM TÀ XÙA TRỌN VẸN

Cards:

```text
Lưu trú
Xe khách
Xe máy
Combo
```

Each card can be:

- active;
- preview;
- landing.

No fake booking.

---

# 31. HOMEPAGE SECTION 07 — HOW WE VERIFY

Explain:

```text
Room identity
Room evidence
Cloud View
Road access
Quality
Freshness
```

CTA:

```text
Xem phương pháp thẩm định
```

---

# 32. HOMEPAGE SECTION 08 — TOP CLOUD VIEW

Only real current verification.

Do not equate:

```text
Cloud View Score
```

with:

```text
weather probability
```

---

# 33. HOMEPAGE SECTION 09 — PACKAGE

When package exists:

show real package.

Before package exists:

can show concept section only if clearly:

```text
Sắp có
```

or omit.

No fake price.

---

# 34. HOMEPAGE SECTION 10 — CUSTOMER PROOF

Only real review.

No seeded fake testimonial.

Before reviews:

omit or use factual process proof instead.

---

# 35. HOMEPAGE SECTION 11 — BRAND STATEMENT

Use:

```text
Không bán cái đẹp.
Bán cái phù hợp.
```

Supporting:

```text
Một lựa chọn tốt không phải lựa chọn đẹp nhất trên ảnh.
Đó là lựa chọn phù hợp nhất với cách bạn muốn đi.
```

---

# 36. HOMEPAGE SECTION 12 — FINAL CTA

Title:

```text
Phần phức tạp để chúng tôi lo.
```

Body:

```text
Bạn chỉ cần chọn kiểu Tà Xùa mình muốn trải nghiệm.
Chúng tôi giúp bạn ghép phần còn lại.
```

CTA:

```text
Bắt đầu tìm chuyến
```

---

# 37. `/stay` LANDING — HOMESTAY & LƯU TRÚ

Current Stay homepage logic migrates to:

```text
/stay
```

Consumer category name:

```text
Lưu trú
```

SEO/H1 acquisition language:

```text
Homestay & lưu trú Tà Xùa
```

Recommended H1:

```text
Homestay & lưu trú Tà Xùa đã được kiểm tra trước khi bạn đặt.
```

Recommended SEO title:

```text
Homestay Tà Xùa: Xem phòng, view thật & giá | Tà Xùa Trip
```

Recommended meta description:

```text
Tìm homestay Tà Xùa theo đúng loại phòng, Cloud View, view từ giường, video 360°, giá và tình trạng phòng được cập nhật.
```

Sub:

```text
Xem phòng thực tế, video 360°, góc nhìn, ưu nhược điểm và tình trạng theo ngày.
```

Primary:

```text
Tìm phòng phù hợp
```

Secondary:

```text
Xem phòng Cloud View
```

Nguyên tắc SEO/UX:

- `Homestay` là acquisition keyword quan trọng.
- `Lưu trú` là taxonomy rộng và bền vững.
- `Stay` chỉ là technical/internal terminology.
- `Chỗ ở` có thể dùng trong conversational UX, không phải tên vertical chính.
- Không keyword stuffing.

---

# 38. `/stay` SECTIONS

Recommended:

```text
Room Finder
Cloud View Verified
View From Bed
Couple Picks
Best Value
Verified Recently
How We Verify
360 Demo
Trip CTA
```

Only if data supports.

---

# 39. PROPERTY PAGE V2.1

Must show:

- Property name;
- destination;
- verification scope;
- room types;
- exact room where available;
- Road Verified;
- parking;
- map/location;
- policies;
- room cards;
- price;
- availability.

CTA:

```text
Xem phòng
Kiểm tra ngày
```

Secondary future:

```text
Thêm vào chuyến
```

---

# 40. VERIFIED ROOM PAGE V2.1

Header:

```text
[Tên phòng] • [Tên cơ sở]
```

Proof:

```text
Đã thẩm định
Verified [date]
360° available
```

Cloud:

```text
Cloud View Score x/10
```

Disclaimer:

```text
Đây là đánh giá chất lượng góc nhìn khi điều kiện phù hợp, không phải dự báo chắc chắn có mây.
```

---

# 41. ROOM DETAIL — REALITY CHECK

Sections:

```text
Điểm chúng tôi thích
```

```text
Điều bạn nên biết
```

Must allow negative factual truth.

---

# 42. ROOM DETAIL — FACTS

Display:

- view from bed;
- balcony;
- window;
- direction;
- sunrise;
- obstruction;
- soundproof;
- Wi-Fi;
- bathroom;
- hot water;
- bed;
- capacity;
- floor;
- Road context.

---

# 43. ROOM SCOPE

Public must show clearly:

```text
PHÒNG CỤ THỂ
```

or:

```text
LOẠI PHÒNG / PHÒNG MẪU
```

Do not confuse.

---

# 44. EXACT ROOM VERIFIED

Exact Room Verified requires:

- physical room;
- stable Room ID;
- current exact-room verification;
- exact evidence;
- correct scope;
- not expired.

Not equivalent to:

```text
exact_room_bookable
```

---

# 45. CLOUD VIEW

Keep current rubric.

Cloud View = physical view.

Not:

- overall quality;
- weather;
- review;
- popularity;
- sponsor score.

---

# 46. ROOM QUALITY

Separate dimensions:

```text
Cleanliness
Soundproof
Heating
Hot Water
Wi-Fi
Bathroom
Room Accuracy
Comfort optional
```

No overall score in initial V2.1.

---

# 47. PROS / CONS

Public:

```text
Điểm chúng tôi thích
Điều bạn nên biết
```

Must remain factual.

Partner cannot edit score to remove inconvenient truth without review process.

---

# 48. ROAD VERIFIED

Keep property-level.

Do not change to Room score.

Public:

- Grade;
- car access;
- motorbike access;
- sedan;
- parking;
- walk;
- last verified.

---

# 49. PRICE

Public customer sees:

```text
SELL PRICE
```

Internal future:

```text
NET COST
MARKET REFERENCE
SELL PRICE
```

Do not expose net cost.

---

# 50. PRICE CONFIDENCE

Keep:

```text
verified
recent
reference
unknown
```

Consumer copy:

```text
Giá đã xác minh
Giá cập nhật gần đây
Giá tham khảo
Chưa có giá cập nhật
```

---

# 51. AVAILABILITY

Keep:

```text
live
verified_today
needs_confirmation
unknown
sold_out
```

Consumer:

```text
Còn phòng
Đã xác nhận hôm nay
Cần xác nhận lại
Chưa có dữ liệu
Hết phòng
```

Do not infer from quantity.

---

# 52. PRICE != AVAILABILITY

A price does not imply room available.

Availability does not imply booking confirmed.

Keep separation across UI and logic.

---

# 53. DESTINATION

Current V2 Phase 1 established:

```text
destinations
```

Hierarchy:

```text
Destination
→ Property
→ Room Type
→ Physical Room
```

Keep.

---

# 54. PHYSICAL ROOM

Purpose:

- Room ID;
- exact evidence;
- exact verification;
- future assignment.

Do not move rates/availability to physical room prematurely.

---

# 55. MEDIA SCOPE

Media owner:

```text
Property
Room Type
Physical Room
```

Public scope label:

```text
Khu chung
Loại phòng
Đúng phòng
```

No ambiguous exact-room proof.

---

# 56. 360

360 can be:

```text
Room Interior
Actual View Position
Common Area
```

Public label must match scope.

---

# 57. SUPPLIER

Future private entity.

Never mix supplier private contact into public property DTO by default.

---

# 58. PARTNER

Commercial relation.

Partner tier independent from factual verification.

---

# 59. PARTNER TIERS

Possible:

```text
Standard
Verified
Preferred
Cloud Partner
Exclusive
```

Do not let tier change:

- Cloud View;
- quality;
- review;
- verification.

---

# 60. SPONSORED RULE

Sponsored placement must be labeled.

Sponsored cannot buy verification.

---

# 61. MOTORBIKE

Trip component.

Provider:

```text
taxua_biker
```

Biker remains operational source-of-truth.

---

# 62. BUS

Future structured:

- operator;
- route;
- time;
- pickup;
- dropoff;
- price;
- status;
- confirmation mode.

Manual MVP acceptable.

---

# 63. GENERIC SERVICE COMPONENT

Future types:

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

Do not hard-code package only room+bus+bike.

---

# 64. PACKAGE

Package must own value.

Not just visual bundle.

Value:

- coordination;
- combined pricing;
- verified component;
- support;
- trip dashboard;
- supplier confirmation.

---

# 65. PACKAGE EXAMPLES

Consumer concepts:

```text
Tà Xùa Easy
Cloud Hunter
Cloud Select
```

Not permanent DB enums.

---

# 66. PACKAGE ECONOMICS

Private:

```text
Component Cost
Package Cost
Sell Price
Gross Contribution
Gross Margin
```

All integer VND.

Margin bps preferred.

---

# 67. TRIP FINDER

Homepage/decision entry:

```text
Bạn muốn trải nghiệm Tà Xùa như thế nào?
```

Inputs:

- dates;
- guests;
- budget;
- cloud preference;
- view from bed;
- couple/group;
- road;
- privacy;
- transport;
- bike.

Output:

```text
3 lựa chọn phù hợp
```

---

# 68. TRIP FINDER PRINCIPLE

Ranking according to:

- user intent;
- verified data;
- real price;
- real availability;
- package completeness.

Not commission only.

---

# 69. BOOKING

Future trip-level.

```text
Booking
→ Booking Items
```

---

# 70. BOOKING ITEM TYPES

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

---

# 71. BOOKING STATUS

Target:

```text
DRAFT
PENDING_PAYMENT
PAID
PENDING_SUPPLIER_CONFIRMATION
PARTIALLY_CONFIRMED
CONFIRMED
READY_TO_TRAVEL
IN_PROGRESS
COMPLETED
CANCELLED
REFUNDED
FAILED
```

---

# 72. BOOKING ITEM STATUS

```text
pending
requested
confirmed
rejected
cancelled
failed
```

---

# 73. PAYMENT != CONFIRMATION

Payment success does not imply supplier confirmed.

---

# 74. SUPPLIER TASK

Future:

```text
Confirm Room
Confirm Bus
Prepare Motorbike
Arrange Pickup
```

---

# 75. MY TRIP

Future customer dashboard:

- booking;
- room;
- exact room;
- media;
- bus;
- motorbike;
- pickup;
- itinerary;
- balance;
- support;
- status.

---

# 76. ANTI-CIRCUMVENTION

Do not hide legitimate facts.

Build value stack.

---

# 77. GUARANTEE

Future Room Match Guarantee.

Do not launch legal guarantee before operations/policy.

---

# 78. CLOUD INTELLIGENCE

Keep separate:

```text
Cloud View
```

and future:

```text
Cloud Forecast
```

---

# 79. CLOUD ALERT

Future retention feature.

No false certainty.

---

# 80. REVIEW

Future verified context.

Dimensions can include:

- accuracy;
- cleanliness;
- soundproof;
- road;
- view accuracy.

---

# 81. CONTENT PILLARS

```text
VERIFY
COMPARE
KNOW BEFORE YOU GO
BUILD THE TRIP
LOCAL REALITY
```

---

# 82. CONTENT HOOKS

Examples:

```text
Phòng này view 9/10, nhưng có một nhược điểm bạn nên biết.
```

```text
Đừng chọn homestay chỉ bằng ảnh.
```

```text
Nếu có 2 triệu/người cho 2N1Đ, tôi sẽ ghép chuyến thế này.
```

---

# 83. SOCIAL CTA

```text
Xem 360°, điểm thẩm định và tình trạng ngày bạn đi trên website.
```

---

# 84. SEO CLUSTERS

Accommodation acquisition ưu tiên vocabulary người dùng:

- homestay Tà Xùa;
- homestay săn mây Tà Xùa;
- homestay view đẹp Tà Xùa;
- homestay view mây Tà Xùa;
- homestay view từ giường Tà Xùa;
- homestay Tà Xùa cho couple;
- homestay Tà Xùa cho nhóm;
- homestay Tà Xùa có chỗ đỗ ô tô;
- homestay Tà Xùa giá phù hợp;
- khách sạn Tà Xùa;
- bungalow Tà Xùa;
- phòng Tà Xùa;
- review phòng thực tế Tà Xùa.

Trip:

- Tà Xùa 2N1Đ;
- combo Tà Xùa;
- xe Hà Nội Tà Xùa;
- thuê xe máy Tà Xùa;
- săn mây Tà Xùa;
- Tà Xùa đi tháng nào.

SEO moat không phải số lượng listicle. Ưu tiên first-party verified data:
Cloud View, View From Bed, 360, Room ID, Road Verified, Price, Availability và Room Quality.

---

# 85. SEO CONTENT PRINCIPLE

Each page should contain unique verified data.

Avoid thin keyword pages.

---

# 86. STRUCTURED DATA

Use factual:

- LodgingBusiness;
- Hotel;
- offer only when real;
- no fake rating;
- no fake review.

---

# 87. ANALYTICS EVENTS

Future:

```text
trip_finder_started
trip_recommended
property_viewed
room_verified_viewed
video_360_opened
package_viewed
bike_added
bus_added
checkout_started
deposit_paid
booking_confirmed
trip_completed
review_submitted
partner_lead
```

---

# 88. BUSINESS METRIC

North Star:

# COMPLETED TRIP BOOKINGS

---

# 89. SECONDARY METRICS

- Room Nights;
- GBV;
- AOV;
- Contribution per Trip;
- Gross Margin;
- Package Attach Rate;
- Motorbike Attach Rate;
- Bus Attach Rate;
- Availability Freshness;
- Verification Coverage;
- Conversion.

---

# 90. MULTI-DESTINATION

Architecture reusable.

UI Tà Xùa-specific.

Do not hard-code data model.

---

# 91. DATA OWNERSHIP

```text
Property facts → Stay/Trip property domain
Cloud View → verification
Road → verification
Sell Price → pricing
Availability → inventory
Bike Fleet → Biker
Package → Trip
Booking → Trip
```

---

# 92. SECURITY

RLS business tables.

Anon explicit reads.

No public service-role.

App role from app_metadata.

No `select("*")` in sensitive public paths.

---

# 93. COMMERCIAL PRIVATE DATA

Never public:

- net cost;
- supplier margin;
- commission;
- supplier bank;
- private contact;
- internal note;
- gross contribution;
- contract.

---

# 94. CUSTOMER PRIVATE DATA

Booking/customer info only:

- authenticated;
- token;
- authorized staff.

No PII in public URL query.

---

# 95. ADMIN

Long-term modules:

```text
Dashboard
Destinations
Properties
Room Types
Physical Rooms
Verification
Media
Rates
Availability
Suppliers
Partners
Services
Motorbike
Bus
Packages
Bookings
Supplier Tasks
Payments
Reviews
Content
Analytics
Settings
```

Do not add empty nav.

---

# 96. ADMIN UX

Mobile-friendly for:

- availability;
- verification;
- confirmation;
- booking tasks;
- support.

---

# 97. COMPONENT ARCHITECTURE

Reusable:

```text
StaySearch
StayFilters
PropertyCard
RoomCard
VerificationBadge
VerificationSummary
CloudScoreBadge
Media360Viewer
ProsConsBlock
RateAvailabilityWidget
AddToTripButton
StayBookingItemSummary
PartnerBadge
```

Do not tie to old Stay homepage.

---

# 98. CURRENT PUBLIC BRAND MIGRATION

Do not merely replace text.

Need:

- master layout;
- logo;
- header;
- footer;
- homepage;
- Stay landing;
- routes;
- metadata;
- redirect plan;
- design tokens.

---

# 99. ADMIN PUBLIC NAV RULE

Remove Admin from public header.

Admin remains direct route.

---

# 100. LEGAL/TRUST PAGES BEFORE LAUNCH

Need review:

- booking terms;
- payment;
- cancellation/refund;
- Room Match Guarantee;
- bike rental;
- transport;
- privacy;
- partner rules;
- sponsored disclosure;
- complaints/support.

---

# 101. LAUNCH PRIORITY

## P0

- Master brand;
- Homepage;
- Stay;
- Verified Room;
- Rate;
- Availability;
- Motorbike;
- Package;
- Booking;
- Admin confirmation;
- policies.

## P1

- Trip Finder;
- 360 improvements;
- comparison;
- bus;
- My Trip;
- reviews;
- attribution.

## P2

- Partner dashboard;
- Cloud Alert;
- loyalty;
- allotment;
- recommendation improvement.

## P3

- AI assistant;
- B2B portal;
- multi-destination expansion;
- APIs.

---

# 102. ROADMAP V2.1

Historical:

```text
Legacy 001–008 ✅
V2 Phase 1 / migration 009 ✅
V2 Phase 2 / migration 010 ✅
V2 Phase 2.5 / no migration ✅
V2 Phase 2.6 / migrations 011–014 ✅
V2 Phase 2.6H / migration 015 ✅
V2 Phase 3 / migration 016 ✅
V2 Phase 3H / migration 017 ✅
V2 Phase 4 / migrations 018–020 ✅
V2 Phase 5 / migrations 021–022 ✅
V2 Phase 6 / migration 023 ✅
```

Later:

```text
V2 Phase 7
Trip Finder
```

```text
V2 Phase 8
Unified Trip Booking
```

```text
V2 Phase 9
Checkout / Deposit / Economics
```

```text
V2 Phase 10
Trip Operations / My Trip
```

```text
V2 Phase 11
Bus / Transfer / Add-ons
```

```text
V2 Phase 12
Growth / Reviews / Cloud / Loyalty / Partner Portal
```

```text
V2 Phase 13
Multi-destination hardening
```

---

# 103. V2 PHASE 2 — VERIFIED ROOM PROFILE

Goal:

- Exact Room Verified;
- Room Quality;
- Pros/Cons;
- exact evidence;
- scope clarity.

Migration expected:

```text
010
```

Do not change brand frontend heavily in this phase except Room Profile UI.

---

# 104. V2 PHASE 2.5 — MASTER BRAND + PUBLIC UX MIGRATION

This is mandatory.

No database migration required unless unavoidable.

Primary scope:

1. Tà Xùa Trip master branding.
2. New design tokens.
3. New header/footer.
4. Homepage Trip.
5. Current Stay homepage moved to `/stay`.
6. Stay namespace.
7. Old URL compatibility.
8. Metadata/canonical migration.
9. Remove Admin link from public.
10. Verified Room visual system.
11. Trip-service category cards.
12. Public UX aligned to light-blue visual direction.

---

# 105. PHASE 2.5 — BRAND ASSETS

Temporary brand assets allowed if final vector not ready.

Need placeholders:

```text
logo-trip-horizontal.svg
logo-trip-icon.svg
logo-trip-white.svg
favicon
```

Do not falsely claim legal trademark finality.

---

# 106. PHASE 2.5 — DESIGN TOKENS

Create centralized tokens.

No scattered hex.

Tokens:

```text
--trip-navy
--trip-teal
--trip-green
--trip-sunrise
--trip-cloud
--trip-ink
--trip-border
--trip-muted
```

Use in CSS/theme.

---

# 107. PHASE 2.5 — HEADER

Desktop:

```text
Logo
Khám phá
Lưu trú
Combo
Xe khách
Xe máy
Cẩm nang
Về chúng tôi
CTA
```

Mobile:

hamburger + CTA.

---

# 108. PHASE 2.5 — HOMEPAGE ROUTE

`/` becomes Trip homepage.

Do not break data-dependent sections when no production data.

Graceful empty state.

---

# 109. PHASE 2.5 — `/stay`

Existing room search entry migrates here.

Preserve query params.

---

# 110. PHASE 2.5 — COMPATIBILITY

Existing routes can remain temporarily as compatibility routes.

Do not delete until redirect plan.

---

# 111. PHASE 2.5 — SEO

Temporary Vercel still noindex.

If final domain not ready:

no need full permanent 301 yet.

But prepare redirect map.

---

# 112. PHASE 2.5 — PUBLIC COPY

Replace:

```text
Tà Xùa Stay
```

as master wordmark with:

```text
Tà Xùa Trip
```

Stay still appears as category label.

---

# 113. PHASE 2.5 — EMPTY SERVICE MODULES

No fake booking.

If package/bus not implemented:

use:

- overview content;
- waitlist;
- coming soon;
- external/manual CTA;

or omit.

---

# 114. V2 PHASE 3 — SUPPLIER / PARTNER

Add private commercial entities.

---

# 115. V2 PHASE 4 — ECONOMICS

Add net cost and market reference.

---

# 116. V2 PHASE 5 — MOTORBIKE

Biker integration.

---

# 117. V2 PHASE 6 — PACKAGE

Trip Package + component.

---

# 118. V2 PHASE 7 — TRIP FINDER

Decision Engine.

---

# 119. V2 PHASE 8 — BOOKING

Booking + BookingItem + Supplier Task.

---

# 120. V2 PHASE 9 — PAYMENT

Deposit + balance.

---

# 121. V2 PHASE 10 — MY TRIP

Trip Dashboard.

---

# 122. V2 PHASE 11 — TRANSPORT / ADD-ONS

Bus / transfer / activity.

---

# 123. V2 PHASE 12 — GROWTH

Reviews, attribution, Cloud, loyalty.

---

# 124. V2 PHASE 13 — MULTI-DESTINATION

Scale only after Tà Xùa proves.

---

# 125. MIGRATION DISCIPLINE

Before every DB phase:

```text
npx.cmd supabase migration list
```

Local = Remote expected.

Then new migration.

Then:

```text
npx.cmd supabase db push --dry-run
```

Then:

```text
npx.cmd supabase db push
npx.cmd supabase migration list
npx.cmd supabase db lint --linked
```

---

# 126. OLD MIGRATION IMMUTABILITY

Do not modify applied:

```text
001–009
```

and later 010 once applied.

---

# 127. NO FAKE PRODUCTION DATA

Allowed:

```text
Destination Tà Xùa
```

Not allowed:

- fake rooms;
- fake score;
- fake availability;
- fake price;
- fake review;
- fake package;
- fake customer;
- fake supplier.

---

# 128. QUALITY GATES

Every phase:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

---

# 129. SECRET SAFETY

No:

- service role committed;
- .env;
- password;
- DB credential;
- Biker secret.

---

# 130. STOP CONDITIONS

Stop if:

- wrong repo;
- wrong Supabase;
- migration mismatch;
- destructive migration;
- unclear commercial money semantics;
- risk to Biker;
- uncertain backfill;
- fake data required.

---

# 131. CODEX PHASE PROCESS

Every implementation:

1. Read AGENTS.
2. Read Master Plan V2.1.
3. Read architecture.
4. Read previous phase doc.
5. Audit.
6. Migration list.
7. Implement one phase.
8. Tests.
9. Dry-run.
10. Push migration if applicable.
11. Smoke test.
12. Commit.
13. Push.
14. Stop.

---

# 132. CODEX FINAL REPORT FORMAT

## Repository
- branch
- HEAD
- commit

## Audit
- issues

## Migration
- before
- new
- dry-run
- after

## App
- routes
- admin
- public

## Security
- anon
- staff
- private data

## Tests
- lint
- typecheck
- tests
- build

## Deployment
- Vercel
- noindex

## Scope stop
- next phase not started

---

# 133. DEFINITIONS

## Stay

Accommodation vertical.

## Property

Accommodation establishment.

## Room Type

Commercial pooled room category.

## Physical Room

Actual physical unit.

## Room ID

Stable business code.

## Exact Room

Specific physical room.

## Verification

Evidence-backed assessment.

## Cloud View

Physical viewing quality.

## Availability

Date-based room inventory state.

## Package

Trip bundle.

## Booking

Trip-level commercial transaction.

---

# 134. TERMINOLOGY — INTERNAL VS CUSTOMER

Internal / technical:

```text
stay
room_type
physical_room
verification_record
availability resolver
rate rule
```

Customer-facing:

```text
Stay → Lưu trú
Property → Cơ sở lưu trú / tên loại hình thực tế
Room Type → Loại phòng
Physical Room → Phòng cụ thể / Mã phòng
Verified Stay → Lưu trú đã thẩm định
Stay Search → Tìm homestay & phòng
Verification → Đã thẩm định
Availability → Tình trạng phòng
```

Conversational copy có thể dùng:

```text
chỗ ở
```

khi tự nhiên, ví dụ:

```text
Bạn muốn chỗ ở như thế nào?
```

nhưng không dùng `Chỗ ở` làm taxonomy/navigation chính.

---

# 135. AVAILABILITY COPY

Allowed:

```text
Còn phòng
Xác nhận hôm nay
Cần xác nhận lại
Chưa có dữ liệu
Hết phòng
```

No:

```text
Realtime
```

unless truly realtime.

---

# 136. VERIFICATION COPY

Allowed:

```text
Đã thẩm định
Cần thẩm định lại
Phòng mẫu
Đúng phòng
```

---

# 137. PRICE COPY

Allowed:

```text
Từ …
Tổng chuyến …
Đã bao gồm …
```

Only when factual.

---

# 138. WEATHER COPY

Allowed:

```text
Tiềm năng săn mây: Thấp / Trung bình / Cao
```

Only future forecast.

Must say:

```text
không phải cam kết thời tiết
```

---

# 139. SPONSORED COPY

```text
Được tài trợ — không ảnh hưởng điểm thẩm định.
```

---

# 140. CUSTOMER DECISION MODEL

The system should progressively answer:

```text
Phòng nào?
Có đúng không?
View thế nào?
Điểm yếu gì?
Giá bao nhiêu?
Còn phòng không?
Đi bằng gì?
Thuê xe gì?
Combo nào hợp?
Tổng chuyến bao nhiêu?
Ai xác nhận?
Ai hỗ trợ?
```

---

# 141. PRODUCT MOAT

Moat = data + operations.

Not frontend aesthetics alone.

Data moat:

- exact room;
- 360;
- view;
- road;
- quality;
- freshness.

Operations moat:

- Biker;
- supplier confirmation;
- packages;
- trip coordination.

---

# 142. WHY PUBLIC UX MATTERS

Backend is not enough.

Public interface must communicate:

```text
WE KNOW BEFORE YOU GO
```

without claiming certainty beyond evidence.

---

# 143. WEBSITE FEEL

Customer should feel:

```text
Đây là nền tảng biết Tà Xùa thật.
```

Not:

```text
Đây là một trang tổng hợp homestay.
```

---

# 144. DO NOT MAKE BRAND GENERIC

Avoid copy:

- “Book your stay”;
- “Best deals”;
- “Top hotels”;
- “Amazing experience”.

Use:

- evidence;
- scope;
- facts;
- suitability;
- transparency.

---

# 145. DO NOT OVERPROMISE

Never:

```text
100% có mây
đảm bảo room view nếu scope không exact
realtime nếu manual
best price nếu không prove
best room nếu subjective
```

---

# 146. EXACT ROOM CONTENT

When exact:

```text
Phòng TX-MAY-203
```

show:

- scope;
- evidence;
- score;
- pros;
- cons;
- date;
- 360.

---

# 147. ROOM CLASS CONTENT

When sample:

```text
Loại phòng Deluxe
```

say:

```text
Bằng chứng áp dụng cho loại phòng / phòng mẫu.
```

---

# 148. COMPARISON

Future comparison should compare:

- Cloud View;
- soundproof;
- road;
- room accuracy;
- price;
- availability;
- suitability.

Not just stars.

---

# 149. RECOMMENDATION EXPLANATION

Future:

```text
Vì sao phù hợp với bạn
```

Explain factors.

---

# 150. NO DARK PATTERN

No fake urgency.

No fake “3 people viewing”.

No fake countdown.

No fake sold-out.

---

# 151. NO COMMISSION-BIASED VERIFIED SCORE

Non-negotiable.

---

# 152. CURRENT ADMIN IDENTITY

Admin remains technical.

No public header.

Can use Tà Xùa Trip Admin wording after Phase 2.5.

---

# 153. ADMIN BRAND MIGRATION

Phase 2.5 may change:

```text
TÀ XÙA STAY Admin
```

to:

```text
TÀ XÙA TRIP Admin
```

but preserve auth.

---

# 154. REPOSITORY NAME

Keep:

```text
TaXuaStay
```

for now.

Repo name is technical legacy.

No need rename during product migration.

---

# 155. SUPABASE PROJECT NAME

Can remain existing.

Do not rename if operationally risky.

---

# 156. VERCEL PROJECT

Can remain current technical project until final domain.

---

# 157. FINAL DOMAIN

When chosen:

set:

```text
NEXT_PUBLIC_SITE_URL=https://...
```

then enable index.

---

# 158. FINAL DOMAIN STRATEGY

Preferred master domain concept:

```text
taxuatrip...
```

Exact domain decision separate.

Do not hard-code before chosen.

---

# 159. DESIGN ASSET CHECKLIST

Need later:

```text
logo-master.svg
logo-horizontal.svg
logo-stacked.svg
logo-icon.svg
logo-white.svg
favicon
og-default.jpg
hero-home-desktop.webp
hero-home-mobile.webp
verified-badge.svg
360-badge.svg
cloud-view-badge.svg
icon set
```

---

# 160. ASSET TRUTH

Moodboard images are visual reference.

Do not ship fake room images as real product assets.

---

# 161. HERO IMAGE

Use actual landscape when available.

If placeholder:

must be clearly non-product/decorative.

---

# 162. MARKETING VISUAL

Primary direction:

- blue;
- cloud;
- mountain;
- clean;
- trust;
- sunrise accent.

---

# 163. BRAND GREEN

Green becomes support color.

Not master canvas.

---

# 164. ACCESSIBILITY

Contrast compliant.

Buttons readable.

No script font for essential actions.

---

# 165. RESPONSIVE

Mobile-first.

Homepage search usable on phone.

Cards not too dense.

---

# 166. PERFORMANCE

No giant hero video blocking LCP.

360 lazy.

Images optimized.

---

# 167. EMPTY STATES

No data:

say no data.

Do not hide page errors as fake content.

---

# 168. PUBLIC DATA FALLBACK

If Supabase unavailable:

site should fail gracefully.

No stale fake content.

---

# 169. PACKAGE FUTURE COPY

Package public:

```text
đã bao gồm
chưa bao gồm
```

No hidden cost.

---

# 170. TRIP CUSTOMER VALUE

Trip combines:

- decision;
- booking;
- coordination;
- support.

---

# 171. PARTNER VALUE

Partner gets:

- verification;
- content;
- distribution;
- bookings;
- package inclusion;
- data.

---

# 172. PARTNER TRUST

Supplier cannot pay to change verification.

---

# 173. OPERATIONS FIRST

Manual is acceptable if state is accurate.

---

# 174. DATA BEFORE AI

No AI recommendation before verified structured data.

---

# 175. AI LATER

AI queries facts.

Never invents:

- availability;
- price;
- score;
- supplier confirmation.

---

# 176. MVP CUT

Commercial MVP target:

```text
Master Brand
Stay
Verified Room
Availability
Motorbike
Package
Booking
Supplier Confirmation
```

Trip Finder can be P1 if needed.

---

# 177. V2.1 IMPLEMENTATION ORDER

Completed under separate owner authorization:

```text
V2 Phase 3 — Supplier + Partner Foundation / migration 016
V2 Phase 3H — Supplier Lifecycle Hardening / migration 017
V2 Phase 4 — Commercial Economics / migrations 018–020
V2 Phase 5 — Motorbike Integration / migrations 021–022
```

Phase 2.5, Phase 2.6, Phase 2.6H, Phase 3 Supplier/Partner foundation, Phase 3H hardening, Phase 4 Commercial Economics, and Phase 5 Motorbike Integration are complete. The next separately authorized phase is V2 Phase 6 — Package Commerce.

---

# 178. V2 PHASE 2 INVARIANTS

- no overall score;
- exact room != bookable boolean;
- room type != exact room;
- Cloud View separate;
- pros/cons truthful.

---

# 179. V2 PHASE 2.5 INVARIANTS

- master brand Trip;
- stay → `/stay`;
- no fake future service;
- no SEO destruction;
- no admin public nav;
- visual system blue/cloud.

---

# 180. MASTER ACCEPTANCE TEST

When a user opens homepage:

they should understand within seconds:

1. This is Tà Xùa Trip.
2. This is not only a homestay website.
3. The platform checks things in real life.
4. It can show evidence.
5. It helps build a trip.
6. Stay is one part of the journey.
7. The brand is honest about uncertainty.

---

# 181. ONE-SENTENCE ARCHITECTURE

# Tà Xùa Trip là nền tảng Verified Local Travel, trong đó codebase Tà Xùa Stay trở thành vertical `/stay`; hệ thống dùng dữ liệu thẩm định để giúp khách chọn đúng, sau đó ghép lưu trú, vận chuyển, xe máy và dịch vụ thành một booking cấp chuyến và một trải nghiệm được điều phối xuyên suốt.

---

# 182. ONE-SENTENCE BRAND

# Đi thật. Biết trước.

---

# 183. NEXT IMPLEMENTATION

V2 Phase 2 / migration 010, V2 Phase 2.5, V2 Phase 2.6 / migrations 011–014, V2 Phase 2.6H / migration 015, and V2 Phase 3 / migration 016 are complete.

The next separately authorized implementation is:

# V2 PHASE 5 — MOTORBIKE INTEGRATION

This next phase is not authorized by completion of Phase 4.

---

# 184. V2 PHASE 2.5 — DETAILED TASK MAP

## Naming migration

Lock consumer naming:

```text
Master brand → Tà Xùa Trip
Navigation vertical → Lưu trú
SEO/H1 acquisition → Homestay & lưu trú Tà Xùa
Technical namespace → /stay
```

Do not rename database tables or feature folders merely for consumer SEO.

## App Layout

Change master consumer shell.

## Branding

Trip logo / wordmark.

## Navigation

Trip IA.

## Homepage

Trip homepage.

## Lưu trú / Stay technical vertical

Move current Stay entry to `/stay`.

Customer-facing navigation says `Lưu trú`.

`/stay` H1/metadata uses `Homestay Tà Xùa` naturally for acquisition intent.

Prepare SEO landing architecture under `/stay` rather than changing the root namespace to `/homestay`.

## Metadata

Trip suffix.

## Public Admin

Remove nav item.

## Styling

Use V2.1 blue/cloud system.

## Verified Components

Visually prominent.

## Compatibility

Keep old routes.

## SEO

Prepare redirects.

## Empty states

Truthful.

---

# 185. V2 PHASE 2.5 — NO DATABASE REQUIREMENT

Prefer no migration.

If database migration appears necessary:

stop and explain.

Brand/route migration should primarily be application-level.

---

# 186. V2 PHASE 2.5 — TESTS

Test:

- `/` Trip;
- `/stay`;
- old Stay routes;
- navigation;
- mobile;
- metadata;
- canonical;
- Admin hidden;
- existing search;
- rates;
- availability;
- verified room.

---

# 187. V2 PHASE 2.5 — VISUAL QA

Check screenshots:

Desktop:
- homepage;
- `/stay`;
- property;
- room.

Mobile:
- homepage;
- menu;
- search;
- room.

---

# 188. V2 PHASE 2.5 — DEPLOY

Temporary Vercel noindex unchanged.

---

# 189. V2 PHASE 3 — IMPLEMENTATION STATUS

Phase 3 is complete through migration 016 and the private `/admin/suppliers` workflow. Supplier/Property/Partner/Verification remain separate; anonymous access is zero; no Supplier rows were seeded; Biker remains an external source of truth with no runtime integration. See `docs/V2_PHASE_3_SUPPLIER_PARTNER_FOUNDATION.md`.

---

# 189A. V2 PHASE 3H — SUPPLIER LIFECYCLE HARDENING STATUS

Phase 3H is complete through corrective migration 017. Supplier archive is child-first and atomic, direct archive bypass is blocked, reactivation does not reopen historical children, and ordinary Supplier profile edits preserve the current primary-contact ID. `valid_until` remains inclusive. See `docs/V2_PHASE_3H_SUPPLIER_LIFECYCLE_HARDENING.md`.

## 189B. V2 PHASE 4 — COMMERCIAL ECONOMICS STATUS

Phase 4 is complete through migration 018, corrective function-ACL migrations 019–020, the private `phase4-economics-v1` resolver and `/admin/economics`. Existing public sell pricing remains authoritative. Net cost, market reference, contribution, margin, contract references and commercial notes remain private with zero anonymous access. Supplier archive closes economics atomically without deleting history. See `docs/V2_PHASE_4_COMMERCIAL_ECONOMICS.md`.

## 189C. V2 PHASE 5 — MOTORBIKE INTEGRATION STATUS

Phase 5 is complete through migrations 021–022, the manual/reference `MotorbikeProviderAdapter`, public `/motorbike`, and private `/admin/motorbike`. Migration 022 preserves immutable 021 while adding the public presentation-order column required by the adapter. The read-only Biker audit found no approved integration API, so Trip exposes only intentionally reviewed catalog facts linked through the existing `taxua_biker` external reference. It never claims live availability, seeds fake bikes, or copies fleet, customer, handover, maintenance, authentication, credential, or private Biker data. See `docs/V2_PHASE_5_MOTORBIKE_INTEGRATION.md`.

## 189D. V2 PHASE 6 — PACKAGE COMMERCE STATUS

Phase 6 is complete through migration 023, the pure `phase6-package-v1` resolver, public `/packages`, and private `/admin/packages`. Package composition is generic but activates only current ROOM, MOTORBIKE and CUSTOM sources. Sell price comes only from explicit current Package rules; missing/stale/conflicting authority displays `Cần xác nhận giá`. Package economics stays private, production remains unseeded, and no Booking, Booking Item, hold, Payment, Deposit, Bus Integration or Trip Finder domain was created. See `docs/V2_PHASE_6_PACKAGE_COMMERCE.md`.

The next separately authorized phase is V2 Phase 7 — Trip Finder. It has not started.

---

# 190. STOP RULE

Do not implement the next phase automatically.

---

# 191. MASTER PLAN STATUS

This V2.1 is the active plan.

All previous roadmaps are historical context only.

---

# END
