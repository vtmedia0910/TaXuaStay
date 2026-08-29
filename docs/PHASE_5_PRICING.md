# Phase 5 — Rate plans and pricing engine

## Scope and invariant

Phase 5 answers: “What recorded room price applies to these dates?” It does not answer whether a physical room is free. There are no inventory calendars, availability blocks, holds, bookings, discounts, or fabricated seed prices in this phase.

The domain migration is `supabase/migrations/202608290006_rate_plans_and_pricing.sql`. The additive hardening migration is `supabase/migrations/202608290007_harden_phase5_pricing.sql`; migrations 001–006 remain immutable.

## Database model

`rate_plans` belongs to one property and groups manageable pricing rules. It stores a unique per-property code, internal name/description, optional inclusive `DATE` validity range, integer priority, active/publish lifecycle, VND-only currency, and audit fields.

`room_rate_rules` belongs to one rate plan and one room type. It stores:

- rate type: `weekday`, `weekend`, `peak`, `holiday`, or `override`;
- integer `price_vnd` and optional integer extra-adult/extra-child amounts;
- optional inclusive `DATE` range and optional ISO weekday mask (`1` Monday through `7` Sunday);
- integer rule priority, source, verification timestamp, inclusive price-valid-until date, active state, internal notes, and audit fields.

Prices and extras are non-negative PostgreSQL integers. Currency is currently exactly `VND`; there is no conversion. Plan/rule ranges reject an end before a start. `peak`, `holiday`, and `override` require explicit bounded dates. A trigger rejects future price verification timestamps and requires the plan and room to belong to the same property. When both verification fields exist, `price_valid_until` must be on or after the Vietnam calendar date of `price_verified_at`; `timestamptz at time zone 'Asia/Ho_Chi_Minh'` is the database backstop, so a UTC day boundary cannot move the business date. A missing `price_verified_at` remains valid and produces only reference confidence.

An active rule must overlap its plan's inclusive validity interval. Open-ended and partial overlaps are valid; completely disjoint bounded ranges are rejected. The rule trigger protects inserts/updates, and a plan trigger prevents later plan-date edits from stranding existing active rules. Inactive rules may be stored as future preparation even when currently disjoint, but Admin marks them as non-effective until their dates overlap and they can be safely activated.

The schema indexes plan property/status/priority, rule room/active/date applicability, and plan/type/priority. Records have no hard-delete grant or UI; operators deactivate rules and deactivate/archive plans.

## Calendar and precedence policy

Stay nights use local lodging calendar dates, never timestamps:

```text
[check_in, check_out)
```

The check-out date is exclusive. A 1 November check-in and 3 November check-out prices the nights of 1 and 2 November only. UTC parsing is used only as a stable implementation technique for ISO dates; it cannot shift a lodging date. Quotes are bounded to 31 nights.

Default ISO weekday groups are centralized:

- weekday: Monday–Thursday (`1–4`);
- weekend: Friday–Sunday (`5–7`).

An explicit rule weekday mask replaces the default for that rule. Holiday dates are never inferred from locale or an external API; Admin supplies the real date range.

For each night, the resolver first filters by plan range, rule range, and weekday. It then resolves in this order:

1. rate type: `override > holiday > peak > weekend > weekday`;
2. higher rule priority;
3. higher plan priority.

If multiple rules remain at the winning effective priority, the night is a conflict. This remains a conflict even when their prices are identical because the configuration is ambiguous. The resolver never uses row order, creation time, highest/lowest price, or newest record as a silent tiebreaker. A gap or conflict makes the quote total non-authoritative (`null`) while retaining per-night diagnostic lines.

## Resolver output and policy version

The pure resolver in `src/features/pricing/resolver.ts` returns:

- `currency: VND`;
- check-in/check-out and number of nights;
- every nightly line with date, state, base price, type, plan/rule ID, source, verification/validity facts, and conflicts;
- subtotal, `discount_vnd: 0`, `fees_vnd: 0`, and total;
- quote status/confidence and conflict dates;
- policy version `phase5-v1`.

The zero discount/fee fields are stable snapshot primitives, not a discount or fee engine. Whole-VND inputs are bounded so summing at most 31 nights remains an exact JavaScript integer.

Extra-adult and extra-child amounts are retained on matched internal lines, but `extra_charges_applied` is always false. Phase 5 has no safe base-occupancy model, so neither customer nor Admin preview totals silently add these amounts.

## Price confidence

Confidence is evaluated per night, then the complete quote uses its weakest nightly confidence. Validity is inclusive.

- `verified`: the applicable rule source is `partner`, `admin`, or `contract`; `price_verified_at` exists and is not in the future; and `price_valid_until` covers both the relevant night and the current Vietnam calendar date.
- `recent`: verified is not satisfied, but source is `partner`, `admin`, `contract`, or `import`, and a non-future verification timestamp is at most 30 elapsed days old.
- `reference`: an applicable recorded rule exists but is neither verified nor recent, including `reference`/`other` sources, missing verification timestamps, or older facts.
- `unknown`: the dates are invalid/out of bounds, no applicable rule covers a night, or a winning-priority conflict exists.

An expired verified record therefore degrades to `recent` while its update is within 30 days, then to `reference`; it is never presented as currently verified. `price_valid_until` equal to the relevant/latest required date is still valid. “Giá đã xác minh” means supported by a currently valid price record, not a permanent commercial guarantee.

## Public data and UI

Pricing resolves through a regular anonymous RLS-backed query plus the application resolver. `public_room_rate_rules` is a `security_invoker` view with an explicit projection. Base-table anonymous grants are column-level. RLS requires an active published plan, active rule, public room, and public property. Public data excludes names/descriptions, internal notes, staff IDs, and audit columns. Anonymous roles receive no pricing mutation grants, and there is no service-role call site.

The search result batch requests only current page room IDs and rules whose plan/rule ranges can overlap the selected stay. This is one fixed query, not an N+1 query.

- `/tim-phong`: with valid dates, cards show the complete stay total and confidence; without dates, they ask the customer to choose dates.
- `/homestay/[slug]`: the customer can select dates and see a per-room complete quote without an invented minimum price.
- `/homestay/[slug]/phong/[roomSlug]`: the authoritative surface shows nights, per-night prices/types, total, confidence, source wording, and verified-through date where applicable.

All three surfaces explicitly say that price is not room availability. Missing/conflicting nightly data never produces a complete total or a fabricated “from” price.

## Admin workflow

`/admin/rates` is protected by the existing `admin`/`staff` authorization and database RLS. It supports:

- filters for property, room, plan, and rate type;
- plan list/create/edit, validity, priority, active and publish lifecycle;
- room-rule list/create/edit, dates, weekday mask, whole-VND price/extras, priority, source, verification facts, and active state;
- warnings for active expired plans, stale verification facts, public rooms missing a public rule, and overlapping equal-priority rules;
- rejection of active disjoint plan/rule dates, with a visible non-effective warning for inactive preparation rules;
- a nightly preview with total/confidence and exact conflict rule IDs. Preview may include active drafts so staff can validate them before publication.

Admin errors remain accurate: a failed single-table mutation does not report success. No service-role key is required.

## Downstream contract

Phase 6 implements availability as a separate inventory domain and preserves checkout-exclusive pricing unchanged. Its optional per-night operational price override is not consumed by the public pricing resolver because it lacks the full verification provenance required by Phase 5 confidence. A later booking phase can snapshot currency, exact nightly price lines, subtotal, zero/real discount and fees when supported, total, source/rule facts, verification timestamp, and `phase5-v1` policy version. Phase 5 itself still has no booking table or booking dependency.
