# V2 Phase 4 — Commercial Economics

## Status and boundary

V2 Phase 4 adds the private accommodation economics foundation through migration `202608290018_v2_commercial_economics.sql`, corrective function-ACL migration `202608290019_harden_commercial_function_grants.sql`, narrow authenticated-predicate migration `202608290020_restore_authenticated_relationship_predicate.sql`, and the protected Admin route `/admin/economics`. Migration 019 was added after the first linked integration run showed Supabase had materialized explicit default `anon`/`authenticated` execute ACLs on trigger helpers. Migration 020 restores only authenticated execution of the RLS-protected relationship predicate required by security-invoker validation triggers; anonymous execution and every other helper RPC remain revoked. It does not start V2 Phase 5 Motorbike Integration and does not add packages, bookings, payment, settlement, commission, tax, bank details or Biker runtime access.

The pre-migration production audit found zero rows in `suppliers`, `supplier_properties`, `partner_relationships`, `properties`, `room_types`, `rate_plans` and `room_rate_rules`. Migration 018 is therefore schema-only. It inserts no Supplier, Property, room, plan, rule, cost or market-reference row. Real commercial facts remain empty until staff records them from a real source.

## Domain definitions

- **Giá bán** remains the customer-facing integer-VND amount resolved by the existing `rate_plans`, `room_rate_rules`, `public_room_rate_rules` and `phase5-v1` resolver. Phase 4 neither copies nor recalculates it.
- **Giá vốn** (`net_cost_vnd`) is the private integer-VND amount Tà Xùa Trip expects to owe, pay or recognize for the applicable accommodation component under a recorded commercial rule. It is not a customer price, settlement or payment.
- **Tham chiếu thị trường** (`market_reference_vnd`) is a private observed benchmark for a comparable room/date context. It is not automatically a lowest price, public strike-through price or guarantee.
- **Đóng góp gộp** is `sell_subtotal_vnd - net_cost_total_vnd` when both sides are complete. It is not net profit.
- **Biên gộp BPS** is `round(gross_contribution_vnd * 10000 / sell_subtotal_vnd)` only when sell subtotal is positive. Otherwise it is `null`.

Missing cost or market information remains `null`; it never becomes zero and is never inferred from a percentage of sell price. Negative contribution is retained and shown as an internal warning. It never mutates public sell price.

## Private schema

`commercial_rate_plans` groups terms for one immutable Supplier + Property scope. It stores a stable code, VND-only currency, inclusive plan dates, priority, source, private contract-reference label, notes, lifecycle (`draft`, `active`, `paused`, `expired`, `archived`) and audit ownership.

`room_commercial_rules` stores one immutable plan + Supplier + Property + Room Type scope. It supports the existing calendar types (`weekday`, `weekend`, `peak`, `holiday`, `override`), nullable non-negative cost and market facts, inclusive effective dates, optional ISO weekdays, priority, provenance, verification freshness, operational active state, notes and audit ownership. At least one of cost or market reference is required.

Database triggers enforce:

- Room Type belongs to Property and the plan owns the same Supplier/Property;
- owner links and rule scope cannot be repointed;
- active terms require a current inclusive Supplier–Property relationship and a non-archived Supplier;
- active rule and plan date ranges overlap;
- special-date rules are bounded;
- effective ranges do not reverse;
- `verified_at` is not in the future;
- freshness `valid_until` is not before the Vietnam business date of verification;
- archived plans cannot be reactivated;
- ending the last current Supplier–Property link is blocked while an active commercial plan remains.

Plan expiry/archive deactivates its rules in the same transaction. Supplier archive now deactivates every commercial rule, expires every non-terminal commercial plan, closes the Phase 3H operational children, and only then archives the Supplier. A failure anywhere rolls back the full graph. Supplier reactivation never reopens historical economics.

## Resolver contract

`src/features/economics/resolver.ts` is pure and has policy version `phase4-economics-v1`. It combines an existing sell quote with private rules; the sell quote stays authoritative.

Nights are `[check_in, check_out)`, with the existing 31-night maximum. Calendar precedence is:

```text
override > holiday > peak > weekend > weekday
> higher rule priority
> higher commercial-plan priority
```

Monday–Thursday are weekday; Friday–Sunday are weekend unless explicit ISO weekdays are present. Equal effective winner priority is a conflict even when the amounts match; the resolver never picks the lowest, highest, newest or first row.

Each nightly line includes date, sell amount/source rule, cost, market reference, private source/rule, commercial freshness, contribution, conflict IDs and warnings. Aggregates include sell/cost/market totals, contribution, margin BPS, status, missing/conflict dates and policy version. Market absence is diagnostic but does not invalidate an otherwise complete sell/cost contribution quote.

Commercial freshness (`verified`, `recent`, `reference`, `unknown`) is independent from public sell-price confidence. Trusted verified sources require an explicit inclusive `valid_until` covering the later of the quoted night and the current Vietnam business date. The 30-day recent window is only a separate internal diagnostic.

## Security and authorization

Both tables have RLS. `PUBLIC` and `anon` receive no table or function access. `authenticated` receives only explicit read and content-column insert/update privileges; audit IDs and immutable ownership links are not writable through updates. There is no authenticated hard delete and no public economics view or RPC.

Both `admin` and `staff` may read private economics. Staff may create/update draft plans, manage rules belonging to draft plans and preview. Only Admin may activate, pause, expire or archive plans and manage contract references. RLS repeats these boundaries; hiding form controls is not the authorization mechanism.

Public pricing grants/view/DTOs are unchanged and contain no cost, market reference, contribution, margin, contract reference, commercial notes or audit IDs. Public search ranking and verification do not import economics. No service-role runtime client is introduced.

## Admin operations

`/admin/economics` provides separate management for private cost instead of mixing it into `/admin/rates`. It supports Property, Room Type, Supplier, lifecycle and warning filters; plan/rule create/edit flows; and a nightly comparison of Giá bán, Giá vốn, Tham chiếu thị trường, Đóng góp gộp and Biên gộp.

Warnings cover sell without cost, cost without sell, missing market reference, negative contribution, commercial or sell conflict, expired/stale verification, stale market reference, inactive Supplier relationship, and an active plan with no active rule. Draft economics can be previewed internally. No preview mutates or publishes sell price.

## Downstream contract and limitations

A later booking phase may snapshot sell amount, cost, source rule IDs, verification timestamp, market reference, contribution and policy version. Phase 4 creates no booking or package row and makes no commission, settlement, tax or accounting assumption. Public customers still see only the existing sell-price experience.

V2 Phase 5 — Motorbike Integration has not been started.
