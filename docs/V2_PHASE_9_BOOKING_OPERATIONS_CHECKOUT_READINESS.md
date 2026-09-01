# V2 Phase 9 — Booking Operations + Checkout Readiness

## Scope and pre-audit

Phase 9 adds Booking operations and a truthful readiness boundary before any payment provider is called. The implementation started from clean `main` at owner baseline `0831d06a6bf9da7b0955e1b48c0acf7bf0b842a9`; `origin` pointed only to `vtmedia0910/TaXuaStay`, and migrations 001–026 were equal Local/Remote. Linked production inspection found zero Booking, Booking Item, Supplier Confirmation, quote, checkout, accommodation, Motorbike Offering or Package rows and one real Tà Xùa Destination. No stop condition was triggered and no production fixture was added.

Additive migration `202608290027_v2_booking_operations_checkout_readiness.sql` implements the domain. After 027 was applied, linked DB lint reported that PostgreSQL classifies the JSON expression in the table-free deposit calculator as `STABLE`; immutable 027 was not edited, and additive `202608290028_fix_phase9_deposit_function_volatility.sql` applies that behavior-preserving volatility declaration only. Migrations 001–028 remain immutable after deployment.

This phase does **not** collect money or implement a payment provider, QR code, payment link, webhook, payment transaction, paid state, bank-transfer proof, refund, payout, settlement or manual “Mark Paid” operation. The provider boundary is deliberately `unconfigured`.

## Separate state machines

Three independent state machines remain visible:

1. Booking lifecycle: `submitted / active / completed / cancelled / expired`.
2. Supplier Confirmation: `pending / partial / confirmed / failed / cancelled`, derived from item confirmations.
3. Checkout Readiness: `not_ready / needs_confirmation / needs_requote / ready / expired / blocked` under immutable policy version `phase9-checkout-readiness-v1`.

No state implies another. In particular, `ready` means only that authoritative prerequisites for a future payment step have been met. It never means held, booked, paid or provider-confirmed.

## Quote lifecycle and requote

`booking_quotes` stores versioned quote headers and `booking_quote_items` stores the item facts used by that version. Quote states are `valid / expired / superseded / needs_requote`; price states are `authoritative / missing / stale / conflict`. The current quote is unique per Booking, quote items are append-only and finalized monetary/source facts are immutable. Lifecycle fields may mark an old quote expired or superseded without rewriting its financial history.

Every initial quote and explicit requote is resolved inside the database from the current Stay pricing, availability, verification, manual-reference Motorbike and Package sources. The browser cannot submit quote facts. Room prices require deterministic resolved nightly lines, a trusted source, non-future verification and sufficient validity. Package price remains the explicit authoritative Package total; component rows have `counts_toward_booking_total = false` and cannot double-count it. Motorbike remains a local manual/reference projection with no Tà Xùa Biker access. Missing, stale or conflicting price sets total to `null` and blocks readiness; it is never replaced by zero.

`requote_booking` locks the Booking, supersedes the prior quote, creates a new version, preserves history, appends events and expires any active checkout session in one transaction. A valid quote expires at the earlier of 24 hours after creation or the first authoritative source-validity cutoff.

## Deposit and cancellation policy

`booking_deposit_policies` is a versioned, provider-neutral policy snapshot with types:

- `none`: amount due is 0 VND;
- `fixed_amount`: explicit integer VND, valid only when it does not exceed the authoritative total;
- `percentage`: 1–10,000 basis points with deterministic nearest-VND rounding;
- `full_payment`: amount due equals the authoritative total;
- `manual`: deliberately blocks readiness until an explicit computable policy replaces it.

For a valid policy:

`planned_remaining_balance_vnd = booking_total_vnd - amount_due_vnd`.

Missing total keeps both derived values `null`. Invalid fixed amount, percentage or conflicting `free_cancel_until` / `non_refundable_after` dates blocks readiness instead of silently correcting policy data. Policy versions and customer-visible cancellation terms are immutable; creating a replacement supersedes the prior version and invalidates an active checkout session. Policy mutation is Admin-only; Staff may view it.

## Checkout Readiness policy

The deterministic resolver requires all of the following for `ready`:

- Booking lifecycle is `active`;
- Supplier Confirmation is fully `confirmed`;
- one current quote is `valid`, unexpired and `authoritative`;
- authoritative total is known;
- one current deposit policy produces a valid amount due;
- cancellation cutoffs do not conflict.

Missing/stale/conflicting price yields `needs_requote`; expired quote yields `expired`; incomplete Supplier Confirmation yields `needs_confirmation`; terminal Booking, failed confirmation or invalid policy yields `blocked`. The resolver returns explicit blocker codes and public-safe Vietnamese explanations. Supplier tier, Partner tier, margin and contribution do not influence this policy.

## Checkout session and future provider boundary

`checkout_sessions` is preparation metadata, not a payment transaction. A session binds immutably to one Booking, quote version, deposit-policy version, total, amount due, remaining balance, VND currency, policy snapshot, readiness snapshot and expiry. At most one `draft` or `ready` session may exist per Booking. Repeated creation for the same current facts returns the active session. A new quote or policy, quote/session expiry, terminal Booking or readiness regression expires/cancels the stale session.

Supported session states are `draft / ready / expired / cancelled / consumed`; Phase 9 has no operation that consumes a session. `provider_state` is constrained to `unconfigured`, and provider key/reference must remain `null`.

`PaymentProviderAdapter` is only a typed future boundary. It advertises no payment-intent, webhook or refund capability. `FutureProviderEventContract` documents the future minimum binding and signature-verification result, but no handler, route, credential, secret or event store is active. Future provider integrations must preserve provider event idempotency, bind events to `checkout_session_id` plus quote version and verify amount/currency/signature before they may introduce any later payment state.

## Public and Admin UX

The secure `/booking/[bookingCode]` status page now shows quote version/expiry, readiness state and blockers, total/deposit/remaining values, cancellation terms and the explicit notice that online payment is unavailable. It contains no fake payment CTA, QR or link. The existing opaque-token cookie, safe RPC, PII allow-list and always-noindex metadata are unchanged.

`/admin/bookings/[id]` adds:

- current readiness, blocker and amount summary;
- explicit server-side requote;
- Admin-only versioned deposit/cancellation policy editing;
- checkout draft create/cancel controls;
- quote and session history;
- append-only Booking timeline events.

Staff can requote and manage checkout drafts but cannot change deposit policy. No Admin control can mark a Booking paid.

Public and Admin surfaces follow the persistent mobile-first standard: content stacks before desktop columns, money and blocker labels remain readable, controls meet minimum touch targets, focus stays visible, and no horizontal overflow is permitted at 390, 393, 412 or 430 px.

## Security, RLS and runtime

All four Phase 9 tables use RLS. `anon` has no direct table privilege. Authenticated reads still require `app_metadata.role` `admin` or `staff`; all mutations are narrow authenticated RPCs with their own role checks. The tokenized public Booking RPC returns an allow-listed readiness DTO and no PII, Supplier contact, net cost, internal note or future provider reference.

Normal runtime still uses only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. There is no legacy anon fallback, `service_role`, Supabase Secret API key, privileged application client or payment-provider secret. Customer Booking routes remain `noindex / nofollow / noarchive / nocache`, absent from sitemap, and the temporary Vercel hostname remains globally noindex/nofollow.

## Verification contract

Vitest covers readiness precedence, quote/price blockers, all deposit calculations and rounding, cancellation conflicts, Zod bounds, migration/RLS invariants, session invalidation, package no-double-counting, public noindex and truthful no-payment copy. Rollback-only SQL at `supabase/tests/202608290027_booking_checkout_readiness.sql` covers initial quote creation, server authority, anonymous denial, token-safe status, Supplier Confirmation gating, Admin-only policy, deterministic amount due, session idempotency, requote history, stale-session invalidation, invalid policy blocking, immutable financial snapshots and append-only events without retaining fixture data.

Real third-party Payment Integration has not been started.
