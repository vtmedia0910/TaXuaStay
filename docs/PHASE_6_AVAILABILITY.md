# Phase 6 room inventory and availability

Phase 6 answers whether current recorded data supports a room type for selected lodging nights and a requested room count. It does not reserve inventory, confirm a booking, decrement stock from customer browsing, or create customer/payment data.

## Inventory model

`room_inventory` stores the latest operational state for one `(room_type_id, date)` pair:

- `available_quantity`: sellable units for that lodging night;
- optional `price_override_vnd`: non-negative integer-VND operational value, not public pricing in Phase 6;
- constrained `source`, `verified_at`, `updated_by`, and create/update audit timestamps.

The unique room/date constraint prevents duplicate current states. Quantity must be non-negative and cannot exceed `room_types.quantity`. That room-type field remains the physical number of units represented by the content record; inventory edits never overwrite it, and public availability never falls back to it. PostgreSQL also prevents lowering physical quantity below an existing inventory value.

No production inventory is seeded. Missing rows are meaningful: they produce unknown availability, never assumed availability.

## Dates and ranges

An inventory `date` is a lodging-night calendar date. Customer stays reuse the Phase 5 interval:

```text
[check_in, check_out)
```

A 15 November check-in and 17 November check-out requires inventory for 15 and 16 November, not the checkout date. Shared lodging-date helpers preserve ISO calendar values without local/UTC shifts and cap customer quotes at 31 nights.

For operational convenience, the Admin bulk editor uses an explicitly different inclusive interval `[date_from, date_to]`, capped at 365 dates. A single-date range is valid.

## Sources

Allowed sources are:

- `partner`: a direct lodging-partner update;
- `admin`: manual confirmation by Tà Xùa Stay staff;
- `booking_engine`: reserved for a later automated booking integration;
- `import`: a controlled bulk import.

All sources use the same Phase 6 freshness clock. The normal Admin form offers partner, Admin, and import; it does not impersonate the reserved booking-engine source.

## Freshness and nightly states

Freshness compares elapsed time between `verified_at` and `now`; it is independent of the lodging date and therefore needs no Vietnam calendar conversion. Boundaries are exact:

- age under 6 hours: `live`;
- age from 6 hours through 24 hours, inclusive: `verified_today`;
- age over 24 hours: `needs_confirmation`;
- missing, invalid, or future verification: `unknown`.

The enum names remain internal. Customer copy uses “Còn phòng”, “Còn phòng · xác nhận hôm nay”, “Cần xác nhận lại”, “Chưa có dữ liệu tình trạng phòng”, and “Hết phòng”. A current row with quantity below the requested room count is `sold_out`. A stale insufficient or zero row remains `needs_confirmation`; old data cannot support a current sold-out claim.

## Multi-night resolver

The pure resolver enumerates every night in `[check_in, check_out)` and tests `available_quantity >= requested_rooms` per night. It returns nightly lines, aggregate state, minimum quantity only for complete coverage, newest/oldest verification facts, sources, and missing/stale dates under policy version `phase6-v1`.

Aggregate precedence is deterministic:

1. any current insufficient night → `sold_out`;
2. otherwise any missing/invalid/future fact → `unknown`;
3. otherwise any stale night → `needs_confirmation`;
4. otherwise any six-to-24-hour night → `verified_today`;
5. otherwise every night is fresh and sufficient → `live`.

This precedence lets a known current blocker remain useful even if another date is missing. Unknown and stale states are never included in the explicit “currently confirmed available” filter.

## Public access and UI

`public_room_inventory` is an explicit `security_invoker` projection. Base-table RLS uses the existing public-room predicate, so inventory for draft/inactive rooms or properties remains private. Anonymous grants contain only room ID, night date, sellable quantity, source, and verification timestamp. Staff IDs, row IDs, audit timestamps, and the operational price override are not public. Anonymous users cannot mutate inventory, and the application has no service-role dependency.

With valid dates, `/tim-phong` batches inventory for candidate room IDs and shows natural per-room availability. The optional “Chỉ hiện phòng đang xác nhận còn” control retains only `live` and `verified_today` results. Without that control, current availability groups rank first, followed by needs-confirmation, unknown, and sold-out groups while existing relevance order is preserved inside each group. Missing data is not hidden by default.

Property cards resolve each room type separately. The room page shows aggregate and nightly detail, requested room count, timestamps/source wording, and the Phase 5 price in a separate section. Important decision surfaces state that availability can change until a booking request is confirmed.

## Admin workflow and concurrency

`/admin/availability` is protected by existing `admin`/`staff` authorization and RLS. It provides property/room filters, a mobile-friendly date list, a 14-night warning horizon, quantity/source/optional operational-price inputs, and one range save. Warnings cover missing dates, stale facts, current zero quantities, and any capacity inconsistency.

`set_room_inventory_range` checks authorization and input, locks the room type against a concurrent physical-quantity change, and performs one `generate_series` upsert statement in the surrounding PostgreSQL transaction. A validation failure rolls back the whole range. The unique room/date key and exact per-night rows are suitable for Phase 7 row locking and atomic rechecks, but Phase 6 intentionally adds no booking-specific RPC or hold mechanism.

Normal Admin saves set `verified_at` to database `now()`. PostgreSQL rejects future verification timestamps. Imported historical timestamps are supported only through an authorized integration that calls the RPC explicitly; the current form does not expose timestamp editing.

## Pricing boundary

`price_override_vnd` is stored but excluded from public reads and public quote resolution. An inventory row does not contain the rule-level provenance needed to claim Phase 5 price confidence, so silently replacing a verified rate would be unsafe. Phase 5 rate plans, precedence, confidence, `[check_in, check_out)` pricing, and `phase5-v1` snapshots remain unchanged.

## Explicit scope stop

Phase 6 contains no hold timer, customer booking request, booking event, availability decrement from browsing, payment flow, or booking confirmation. Those belong to a separately reviewed Phase 7.
