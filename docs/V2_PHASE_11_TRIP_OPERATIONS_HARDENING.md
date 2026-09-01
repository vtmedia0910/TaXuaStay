# V2 Phase 11 — Trip Operations Hardening + System Administration

## Purpose and scope

Phase 11 turns the existing Phase 8–10 Booking foundation into a daily operating system. It adds a bounded Admin work queue, deterministic attention/priority policy, confirmation aging, controlled Booking changes and item replacement, consistent expiry processing, concrete Data Health, and operational audit history.

This phase does not create another Booking, Supplier Confirmation, quote or Checkout Readiness state machine. It composes those existing authoritative states. It adds no customer account, AI decisioning, real payment provider, paid state, QR/link, webhook, refund/settlement, Bus, Transfer, Add-on, or Biker runtime/database access.

## Pre-audit and migration

Implementation started from clean `main` at owner baseline `2b15923665f4e42068193e80b32a738a4d1f6444`, with `origin` pointing to `vtmedia0910/TaXuaStay` and migrations 001–029 equal Local/Remote. Read-only production counts were zero for Bookings, Booking Items, Supplier Confirmations, Booking Events, quotes, deposit policies, checkout sessions, Suppliers, Supplier–Property links, motorbike offerings, Packages, Rooms and Properties. No production fixture was needed or created.

Additive migration `202609010030_v2_trip_operations_hardening.sql` adds only the Phase 11 operational model and hardening. Linked lint then required additive resolver correction 031, and rollback smoke required additive trigger-field correction 032. Migrations 001–029 and applied 030–032 remain unchanged. Final migration state is 001–032 Local = Remote.

## Operations model

`/admin/operations` is the daily operating home. It loads one bounded, role-protected aggregate RPC instead of an item-by-item query. The first mobile viewport shows `Cần xử lý ngay`, urgent count and up to three real urgent Booking cards. It also exposes factual counts for pending/overdue confirmations, quote expiry, requote, replacement, Checkout Readiness and Data Health.

`/admin/bookings` reuses the same policy as a searchable operational inbox. Authorized search covers Booking code, customer name/phone, dates, Room/Property, Package, Motorbike and Supplier snapshot. Filters cover needs-attention, confirmation, overdue, requote, quote expiry, decline/replacement, checkout blocker/readiness and terminal states. Sorting is deterministic by policy priority, oldest pending, trip date, quote expiry or newest Booking. Results are bounded and paginated.

## Attention engine

The code policy is `phase11-operations-v1`; priority is versioned independently as `phase11-operations-priority-v1`.

Supported reason codes are:

- `confirmation_pending`, `confirmation_overdue`, `confirmation_declined`, `confirmation_expired`;
- `quote_expiring`, `quote_expired`, `needs_requote`, `checkout_blocked`;
- `booking_stuck`, `booking_change_requested`, `replacement_required`;
- `missing_price`, `missing_supplier_mapping`, `data_conflict`.

Only observable facts emit a reason. `unknown` is not treated as `false`; for example, missing Supplier mapping produces its own resolution task and never becomes a false decline or availability claim. Priority buckets are `urgent`, `high`, `normal`, and `low`, derived from trip proximity, internal confirmation due time, source decline/expiry, quote expiry and explicit blockers. Margin, contribution, customer spend, Supplier tier and Partner tier are not inputs.

Next actions are controlled values: `REQUEST_CONFIRMATION`, `FOLLOW_UP_CONFIRMATION`, `REPLACE_ITEM`, `REQUOTE`, `REVIEW_CHANGE`, `RESOLVE_DATA`, `READY_NO_ACTION`, and `CLOSE_COMPLETED`. They are deterministic internal guidance, not AI advice.

## Confirmation aging and follow-up

`booking_item_confirmations` gains `due_at`, `last_reminded_at`, `reminder_count`, and `overdue_event_at`. Existing requested confirmations receive a deterministic four-hour internal due time from `requested_at`; this is explicitly an internal operations target, not a Supplier contractual SLA.

The queue derives request age, overdue count, oldest request and earliest deadline. Recording a follow-up requires an active requested confirmation, a reason and the exact `updated_at` loaded by the operator. A repeated click within five minutes is an idempotent no-op. No SMS, Zalo or email is sent automatically.

Every confirmation transition/follow-up is copied to private append-only `booking_confirmation_events`, including timestamps, reminder count and the historical Supplier snapshot. Existing public `booking_events` remains sanitized for My Trip.

## Controlled Booking changes

`booking_change_requests` supports only four implemented structured types: `dates`, `guest_count`, `room_quantity`, and `replace_item`. Payload keys and ranges are database-validated; arbitrary JSON mutation is rejected. A reason is required.

Lifecycle is `requested → reviewing → approved → applied`, with `rejected` and `cancelled` terminal alternatives. Staff can create requests and move routine work into review. Only Admin can approve, reject, cancel or apply. Request creation never changes the Booking.

Each request stores the Booking operations revision observed at creation. Review, application, lifecycle changes, Supplier Confirmation and follow-up reject a stale revision rather than overwrite a newer operator action. High-impact forms show a confirmation prompt and Server Actions repeat authorization server-side.

## Applying changes and replacement

Application is one PostgreSQL transaction. It locks the request and Booking, validates Admin role/revision/state, changes only the allowed facts, resets affected confirmations, creates an authoritative quote version, invalidates stale checkout sessions, recomputes Booking confirmation/Checkout Readiness, appends audit events and records old/new resolution snapshots. Any failure rolls the entire statement back.

Replacement supports existing ROOM→ROOM and MOTORBIKE→MOTORBIKE sources only. The old Booking Item is never rewritten: it becomes `replaced`, retains its immutable submission snapshot and links to a new item. The new item gets a fresh real Room/Motorbike snapshot and a new pending confirmation. Public My Trip, current confirmation aggregation and quote totals include only active operational items; Admin retains both items and their lineage.

Package explicit total remains authoritative. Package component rows with `counts_toward_booking_total = false` remain included-in-package and cannot double-count. Missing/stale/conflicting prices remain null/blocking and never become zero. Motorbike resolution remains `taxua_biker_manual_reference`; the function reads only Trip-owned reviewed mappings and makes no Biker call.

## Expiry and stuck states

`process_operational_expiries(limit)` is bounded to 1–500, role-protected and safe to rerun. It expires confirmations only at stored `expires_at`, appends one overdue event per due condition, synchronizes expired quote/checkout truth, expires non-terminal Bookings only after trip end, and returns factual counts. It performs no external notification.

The policy detects stuck combinations including submitted/no confirmation request, active confirmation waiting too long, active expired quote, failed confirmation without an open change, and contradictory ready/expired checkout facts.

## Data Health and alerts

`/admin/operations/data-health` uses derived, current issues rather than persisted alert rows. Each issue has a deterministic non-PII fingerprint from category, code and entity ID, so page refresh cannot manufacture duplicates.

Checks include published Property without public Room, public Room without current authoritative price/verification/Supplier relationship, invalid required Package component, motorbike offering without active confirmation contact, active Booking Item missing price, and Booking with unresolved confirmation. Labels are concrete; there is no quality score.

## Permissions and security

New tables have RLS enabled. `anon` has no direct read or write; `authenticated` receives SELECT only and policies require `app_metadata.role` of `staff` or `admin`. Mutations occur through narrow fixed-`search_path` functions with explicit role/intent checks; internal helpers have no public execute grant. Anonymous Booking tables remain inaccessible and the public status RPC still requires Booking code plus opaque token hash.

The public projection includes only active item snapshots and does not expose priority, attention reasons, changes, confirmation history, PII, Supplier data, internal notes, staff/audit IDs, net cost, margin or contribution. The runtime still uses only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; there is no legacy anon fallback, service-role, Supabase Secret key or privileged browser client.

## Metrics and mobile UX

Internal metrics use actual rows/timestamps only: Bookings created, needs attention, pending/overdue confirmations, quote-expiring/requote/replacement counts, average response minutes, decline count/rate, Checkout-ready count and completed count. No BI score or marketing attribution is added.

Admin layouts are single-column first, wrap long identifiers, avoid horizontal tables and use existing minimum touch targets. Queue cards show lifecycle/confirmation, reasons, deadline and next action without relying on color alone. Booking detail places blocker/action context before service cards, supports confirmation/follow-up/change/replacement on mobile, and preserves full historical cards visibly as inactive.

QA targets are 390×844, 393×873, 412×915, 430×932, 768×1024, 1024×768, 1366×768 and 1440×900.

## Operational limitations

- Maintenance is manual Admin/Staff execution; no external scheduler or outbound reminder integration is installed.
- Replacement is deliberately bounded to same-type ROOM and MOTORBIKE catalog sources; Package composition and unsupported verticals are not rewritten.
- Derived alerts have no acknowledge/dismiss lifecycle because persistence is unnecessary for the implemented use case.
- Production contains no Booking data, so production QA covers empty state, auth guard, deployment and read-only schema/projection checks; mutation acceptance is performed only in a rollback transaction.

AI Customer Assistant, real third-party Payment Integration, and new service verticals are outside Phase 11 and are not implemented.
