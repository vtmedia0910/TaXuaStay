# V2 Phase 10 — My Trip + Customer Trip Dashboard

## Purpose and scope

Phase 10 turns the existing secure Booking status surface into a mobile-first customer dashboard. It remains a customer-facing projection of the Phase 8 Booking, Booking Item, Supplier Confirmation, event and opaque-token boundary plus the Phase 9 quote, deposit-policy and Checkout Readiness boundary; corrective migration 029 adds only the missing immutable verification allow-list.

It creates no second lifecycle and no customer account. Booking lifecycle, Supplier Confirmation and `phase9-checkout-readiness-v1` remain the only operational state machines. This phase adds no payment provider, QR code, payment link, webhook, payment transaction, paid state, refund, payout, settlement, Customer Assistant or AI runtime.

## Pre-audit and migration 029

Implementation began from clean `main` at owner baseline `260e76a131c57efb1cb72bf4b005936ebec7a079`. `origin` pointed to `vtmedia0910/TaXuaStay`; migrations 001–028 were equal Local/Remote. Production contained zero Booking, Booking Item, Supplier Confirmation, Booking Event, quote, deposit-policy and checkout-session rows. No fake Booking was added.

The initial audit found one genuinely missing safe field: `get_public_booking_status` did not expose any verification fact, while the immutable Booking Item already stored the submission-time `verification_snapshot`. Owner-approved additive migration `202609010029_phase10_my_trip_verification_projection.sql` replaces only that existing secure RPC and adds a narrow `verification` object per item: `room_verified`, `cloud_view_verified`, `road_verified`, and validated `road_grade`.

Migration 029 does not return raw `verification_snapshot`, query current verification/source tables, grant anonymous table SELECT, or change RLS. The same Booking-code plus opaque-token-hash predicate remains mandatory. A rollback-only linked smoke test proved correct-token projection, wrong-token null, raw/private field exclusion, snapshot immutability, anonymous table denial and enabled Booking RLS. Migrations are 001–029 Local = Remote.

## Canonical route and secure access

`/booking/[bookingCode]` remains the canonical My Trip route because it already owns the secure customer access contract and the HttpOnly cookie is intentionally scoped to `/booking`. Creating a parallel `/my-trip` dashboard would duplicate the experience or require broadening cookie scope.

Access still requires both:

- a syntactically valid Booking code; and
- the matching 256-bit opaque token from the HttpOnly, SameSite=Lax, Secure-in-production cookie.

Only the SHA-256 token hash reaches the allow-listed RPC. Code-only, phone-only and email-only lookup do not exist. Invalid code, missing/wrong token and unknown Booking all produce the same generic not-found experience, preventing enumeration. The plaintext token is never rendered, logged or added to analytics.

All customer Booking routes remain `noindex`, `nofollow`, `noarchive` and `nocache`; they are absent from sitemap. No customer-specific Open Graph metadata is generated.

## Customer-safe DTO boundary

`buildCustomerTripDashboard` converts the existing `PublicBookingStatusDto` plus public Site Settings into one structured `CustomerTripDashboardDto`. It includes only:

- Booking code, immutable dates and guest summary;
- customer labels derived from the existing three state machines;
- immutable Booking Item display snapshots and public confirmation state;
- current safe quote/deposit/readiness projection;
- customer-visible Booking event messages;
- configured public support actions.

It excludes customer PII, Supplier identity/contact, external references, net cost, contribution, margin, Partner tier, internal notes, staff/audit IDs, raw source/verification/private-policy JSON, provider config and access token. This is also the only suitable future input boundary for a separately authorized Customer Assistant; such an assistant must never query raw Booking tables.

The safe RPC never exposes raw `verification_snapshot`. Migration 029 derives only four allow-listed values inside PostgreSQL from that immutable snapshot. Phase 10 neither refreshes them from mutable source data nor invents detailed evidence.

## Customer status and next action

The view-model maps existing truth to natural Vietnamese:

- submitted → `Đã nhận yêu cầu`;
- active + pending → `Đang chờ xác nhận dịch vụ`;
- partial → `Đã xác nhận một phần`;
- confirmed → `Các dịch vụ chính đã xác nhận`;
- failed/cancelled confirmation → `Có dịch vụ không thể xác nhận`;
- ready → `Sẵn sàng cho bước thanh toán`;
- needs_requote → `Cần cập nhật báo giá`;
- expired quote → `Báo giá đã hết hiệu lực`;
- cancelled Booking → `Chuyến đi đã hủy`;
- expired Booking → `Yêu cầu đã hết hiệu lực`;
- completed Booking → `Chuyến đi đã hoàn tất`.

Lifecycle terminal states take precedence, followed by failed confirmation and quote/readiness truth. This is presentation precedence only, not a new stored state machine.

Exactly one primary action is derived: view components, inspect quote, inspect the next-step explanation, view timeline, or use a real configured support channel. A ready state is informational because online payment is not connected.

## Booking Item cards

ROOM, MOTORBIKE, PACKAGE and CUSTOM render from immutable item display snapshots. Cards show natural type label, name, parent context when available, immutable trip period, quantity, price snapshot state, availability snapshot state, minimum verification labels, Supplier Confirmation state, description and a practical caveat.

Missing price is `Cần xác nhận giá`, never 0 VND. Package children are `Đã bao gồm trong giá gói` and cannot double-count the explicit Package total. Motorbike states clearly remain manual/reference and do not imply live Biker availability. Details use accessible native disclosure with a minimum 44px summary target.

## Quote, deposit and Checkout Readiness

The Phase 9 card now displays quote version, quote status, price authority, creation time, expiry, total, amount due, expected remaining balance, deposit-policy type/details and snapshotted cancellation terms. Missing amounts remain `Chưa xác định`.

Checkout Readiness customer labels are:

- not_ready → `Chưa sẵn sàng cho bước thanh toán`;
- needs_confirmation → `Đang chờ xác nhận dịch vụ`;
- needs_requote → `Cần cập nhật báo giá`;
- ready → `Sẵn sàng cho bước thanh toán`;
- expired → `Thông tin thanh toán đã hết hiệu lực`;
- blocked → `Chưa thể tiếp tục`.

The page explicitly says readiness is not payment and that no QR, payment link or working payment action exists.

## Timeline, policies and support

The timeline consumes only non-null database-controlled `public_message` values, converts raw event type to a small customer category, shows newest first and caps the projection at the newest 50 messages. It never renders raw enum, internal detail, Supplier response note, staff identity or audit metadata.

Only snapshotted/current Phase 9 deposit and cancellation policy fields are shown. The dashboard does not read current mutable Property check-in/out policy as if it were historical Booking truth.

Support actions come only from configured public `site_settings`: Zalo HTTPS URL, sanitized telephone link and Facebook HTTPS URL. No 24/7 claim is made. If no channel is configured, the page says so instead of inventing a contact path.

## Mobile and accessibility

The phone first viewport uses a compact product header rather than a marketing Hero. It prioritizes brand context, Booking code, dates, duration, guest summary, one primary action and overall status. The remaining order is components, quote/deposit/readiness, timeline and support.

Layouts are single-column first, use `min-width: 0` and break-safe text, then expand at tablet/desktop widths. Buttons meet 48px primary sizing, disclosures meet 44px, headings and status have semantic labels, timeline uses an ordered list, focus remains visible and no horizontal table is used. Loading, generic error and generic invalid-access states are implemented within the route segment.

## Limitations and boundaries

- no customer account, profile, registration or login;
- no customer self-edit, self-cancellation or itinerary mutation;
- no raw verification/private snapshot expansion beyond migration 029's four customer-safe derived fields;
- no real Payment or provider integration;
- no AI Customer Assistant;
- no review/rating flow for completed trips;
- no fake Booking or customer production data;
- no Biker database/API access.

Real third-party Payment Integration and AI Customer Assistant have not been started.
