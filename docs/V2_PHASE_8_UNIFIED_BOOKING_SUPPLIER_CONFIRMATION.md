# V2 Phase 8 — Unified Booking + Supplier Confirmation

## Scope and production pre-audit

Phase 8 turns one traveler trip request into exactly one private `bookings` row with one or more immutable `booking_items`. Migration `202608290024_v2_unified_booking_supplier_confirmation.sql` is additive to immutable migrations 001–023. Linked DB lint after applying 024 found that pgcrypto was installed in Supabase's managed `extensions` schema while the creation RPC had an empty search path; immutable 024 was not edited, and additive `202608290025_fix_phase8_booking_code_generation.sql` restricts that RPC to `pg_catalog, extensions` only after asserting `anon` and `authenticated` cannot create there. Additive `202608290026_fix_phase8_selected_component_aggregation.sql` ensures a catalog-optional Package component becomes part of confirmation aggregation once the traveler selects it. Before implementation, `main` was clean at owner baseline `55067915fe9d241ee6ae26d7f91b4fa126e3ddd7`; Local and Remote were equal through 023. Linked table statistics showed one published Tà Xùa Destination and zero Property, Room Type, Inventory, Rate, Verification, Supplier, Motorbike Offering, Package or Package component rows. Phase 8 seeds no Booking, customer, price, confirmation or inventory fixture.

This phase does not implement Payment, Deposit, Checkout, Refund, Settlement, a hold, full My Trip, Bus Integration or Phase 9 behavior.

## Domain model

- `bookings` is the traveler-level request and private PII boundary. Its code, dates, party, contact, idempotency credential, quote policy and submission facts are immutable.
- `booking_items` contains ROOM, MOTORBIKE, PACKAGE and controlled Package CUSTOM snapshots. A Package is one price-authoritative parent item. Selected Package components are child items with `counts_toward_booking_total = false` and `included_in_package`, so component prices are never counted twice.
- `booking_item_confirmations` is the supplier/operator/internal confirmation workflow. It is deliberately separate from Booking lifecycle.
- `booking_events` is append-only. Updates and deletes are rejected by a database trigger.

Booking lifecycle is `submitted → active → completed`, with terminal `cancelled` or `expired`. Cancellation is Admin-only. Supplier confirmation is `pending → requested → confirmed`, with terminal `declined`, `expired` or `cancelled`. Overall Booking confirmation is derived as `pending`, `partial`, `confirmed`, `failed` or `cancelled`; it does not change Booking lifecycle by implication.

## Atomic submission and immutable truth

The mobile public form sends only dates, party, contact and source identities. The browser never supplies authoritative price, availability, verification, Supplier or confirmation facts. `create_public_booking_request` is one bounded `SECURITY DEFINER` transaction that:

1. validates input sizes and an opaque idempotency/access hash;
2. locks the idempotency key and returns the existing Booking for a duplicate submission;
3. re-resolves every source from current Stay tables;
4. re-runs deterministic Room nightly price precedence, availability freshness, current public verification, private cost economics and Supplier/contact context;
5. re-runs explicit Package total-price authority and validates selected optional components;
6. keeps Motorbike as a `taxua_biker` manual/reference source without reading Biker;
7. writes one Booking, all items, confirmation rows and the initial event atomically.

Missing or conflicting price remains `null`; it is never converted to zero. Required sources known to be unavailable are rejected rather than presented as held. Package component standalone facts remain snapshots for context but do not alter the explicit Package total.

## Security and privacy

All four Phase 8 tables have RLS. Anonymous users receive no table privilege and no direct Booking read/write policy. Only two narrow anonymous RPCs exist:

- `create_public_booking_request` creates a bounded, real-source request;
- `get_public_booking_status` requires Booking code plus the SHA-256 hash of a 256-bit opaque token and returns an allow-listed DTO without PII, Supplier/contact data, external references or internal notes.

The plaintext token is stored only in an HttpOnly, Secure-in-production, SameSite=Lax cookie scoped to `/booking`; the database stores only its hash. The request and status routes are always `noindex`, `nofollow`, `noarchive` and `nocache` and are absent from the sitemap. Server Action CSRF origin checking, a 1 MB framework body limit, Zod limits, a honeypot and a six-hour form lifetime provide the application anti-abuse boundary. Admin reads require the existing authenticated `admin`/`staff` role from `app_metadata`. No service-role key, Supabase Secret API key or privileged browser/server client exists.

## Public and Admin UX

`/booking/request` is a mobile-first single-request review/contact form. Entry points exist from Room, Motorbike, Package and Trip Finder results, including a unified Room + Motorbike composition. Copy consistently says that submission is a request, not a hold, booking confirmation or payment.

`/booking/[bookingCode]` is a token-cookie-protected, PII-free status page with service states and public event history. It is a bounded status surface, not the full future My Trip product.

`/admin/bookings` lists private requests. `/admin/bookings/[id]` shows PII, items, supplier confirmation forms, lifecycle actions and the append-only timeline. Staff may operate confirmations and ordinary lifecycle transitions; only Admin may cancel a Booking.

## Verification contract

The rollback-only SQL smoke at `supabase/tests/202608290024_unified_booking.sql` verifies atomic creation, exactly one Booking, many items, idempotency, Package no-double-counting, safe token reads, PII exclusion, anonymous table denial, confirmation aggregation, immutable snapshots, append-only events and Admin-only cancellation. Vitest covers migration ACL invariants, no later commerce tables, no privileged key, source-only request validation, anti-spam limits and missing-price semantics.

Phase 9 has not been started.
