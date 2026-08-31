# V2 Phase 5 — Motorbike Integration

## Status and scope

V2 Phase 5 is implemented by additive migration `202608290021_v2_motorbike_integration.sql`, corrective migration `202608290022_fix_motorbike_public_ordering.sql`, the shared `src/features/motorbike` domain, `/motorbike`, and the private `/admin/motorbike` workflow. Migration 022 preserves immutable 021 and appends `sort_order` to the public view so the adapter's stable presentation order is an explicit database contract. It does not add Package Commerce, Trip Finder, unified Booking, Booking Items, payment, deposit, bus, My Trip, or fleet operations.

The attached mobile-first product UI standard is preserved at `docs/product/MOBILE_FIRST_PRODUCT_UI_STANDARD.md` and is a cross-phase implementation standard, not a competing roadmap.

## Integration audit and selected mode

The read-only `vtmedia0910/taxuabiker2` reference was inspected for a documented public catalog API, stable public endpoint, server-to-server contract, webhook, and reusable rental flow. Its public rental page is implemented inside the Biker Next.js application and uses Biker-owned Server Actions/RPCs. The inspected route handlers cover other operational purposes; they do not establish an approved public motorbike catalog/availability contract for Trip.

No safe API contract or credentials are available. Phase 5 therefore selects:

```text
integration mode: manual_reference
provider key: taxua_biker
confirmation mode: manual
```

Trip does not scrape Biker pages, query the Biker database, import Biker secrets, poll a private endpoint, or infer live availability. A future adapter can replace the manual implementation only after a separately approved, documented integration contract exists.

## Source-of-truth boundary

| Fact or workflow | Owner |
| --- | --- |
| Fleet, exact vehicles, plates, maintenance, handover/return, customer rentals, staff operations, live availability | Tà Xùa Biker |
| Supplier identity and relationship | Trip Supplier domain |
| Opaque Biker identity link | `supplier_external_refs` with `system_key = taxua_biker` |
| Intentionally published customer catalog snapshot | Trip `motorbike_offerings` |
| Public price snapshot and its provenance/freshness | Trip offering, entered from an approved real source |
| Net cost, margin, contribution, contracts | Private Commercial Economics; not populated or exposed by Phase 5 |
| Booking, payment and supplier confirmation | Future Trip commerce phases; absent in Phase 5 |

An offering is not a physical bike. It is a small public service/catalog projection. No fake Supplier, external reference, offering, price, or image is seeded.

## Schema and lifecycle

`motorbike_offerings` links exactly one motorbike Supplier to exactly one active `taxua_biker` external reference. It stores:

- immutable Supplier/source identity and public slug;
- bounded public name, category, transmission, engine class, suitability, helmet tri-state, pickup/return summaries and description;
- optional active CMS media;
- optional complete integer-VND price snapshot;
- manual availability/confirmation state and source freshness;
- approved HTTPS request URL;
- draft/published/paused/archived lifecycle, sort order, internal notes and audit fields.

The lifecycle is archival. Anonymous reads require `published`, an active motorbike Supplier, and an active matching Biker reference. An archived offering is immutable. Supplier archive first archives its motorbike offerings, then closes existing operational/economics children and the Supplier in the same transaction.

The trigger rejects a mismatched Supplier/reference, future source/price check time, identity changes, publishing without source freshness, or publishing without an HTTPS manual-confirmation URL. `save_motorbike_offering` is a transaction RPC and is Admin-only in application, function, grants, and RLS.

## Adapter boundary

Application code depends on `MotorbikeProviderAdapter`, not on Biker implementation details. `ManualMotorbikeProviderAdapter` reads only the allow-listed `public_motorbike_offerings` view through the anonymous Trip client.

Adapter behavior is explicit:

- missing Trip public Supabase configuration → `unconfigured`;
- query failure → `error`;
- zero published rows → `empty`;
- published rows → normalized safe DTOs;
- unknown detail slug → `null` and the route returns 404.

There is no service-role client, background sync, browser credential, Biker fetch call, or fallback sample data.

## External references

Phase 5 reuses `supplier_external_refs` rather than adding Biker IDs to an ad-hoc column. The external reference value and metadata remain private. Public output contains only the intentionally fixed provider label `Tà Xùa Biker` and source key; it never exposes Supplier IDs, external-reference IDs/values, contacts, Partner tier, or metadata.

Admin owner setup requires a real active Supplier with `supplier_type = motorbike` and a real active external reference with `system_key = taxua_biker`. The offering form presents only valid combinations. Production remains honestly empty until those records exist.

## Price semantics

`public_price_vnd` is optional and whole-VND only. When present it must have all of:

- `price_source`;
- `price_checked_at` not in the future;
- `price_valid_until` on or after the Vietnam date of the check.

The public resolver shows the amount only while that snapshot is current. Missing, incomplete, future-checked, or expired price data is displayed as `Cần xác nhận giá`; it never becomes a fabricated “giá từ”, discount, market price, or availability signal. Net cost, margin, contribution and commercial notes are neither queried nor exposed.

## Availability and confirmation semantics

Because no safe live Biker integration exists, Phase 5 permits only:

- `needs_confirmation` → `Cần xác nhận`;
- `unknown` → `Chưa có dữ liệu tức thời`;
- `unavailable` → `Tạm chưa nhận yêu cầu`.

It deliberately has no `available` or `live` state. Listed does not mean available; price does not mean available; request does not mean confirmed; payment does not mean confirmation. Source facts older than seven days are labeled as needing another check. The request CTA opens an approved external HTTPS channel and creates no Trip booking, hold, payment, or customer record.

## Public UX

`/motorbike` is the single service landing and `/motorbike/[slug]` is the bounded option detail route. Homepage/header/footer discovery links use the same route. No thin SEO variants or offer structured data are created. The existing environment-aware robots policy still leaves the temporary Vercel hostname `noindex,nofollow`.

The phone flow is:

```text
homepage / public navigation
→ motorbike truth and service context
→ concise option cards
→ option detail
→ Yêu cầu xác nhận
```

Cards prioritize real image, public name/category, a few decision facts, current price wording, confirmation/freshness, and one detail CTA. Detail uses image, status, price, key-fact cards, caveat and a safe-area-aware sticky mobile CTA. It avoids a fleet-management table and adds no public client-side JavaScript. Images reuse the controlled CMS asset model, focal point, optimized responsive rendering and required alt text.

No filters are implemented because the current integration is a deliberately small manually curated catalog and production may contain zero rows. Adding unsupported filters would imply data breadth that does not exist. Empty, unconfigured, loading, error and 404 states are explicit and never use sample bikes.

Desktop expands the same facts into multi-column cards and a two-column detail layout. It does not issue a second data request or use different business rules.

## Admin operations

`/admin/motorbike` and its create/edit routes are Admin-only. Staff retains no offering mutation path. Admin can select a valid Supplier/Biker mapping, manage public facts and media, enter a complete optional public-price snapshot, set the manual public state, record freshness, configure the approved request URL and control publication.

Warnings cover only implemented facts: missing mapping, inactive source/Supplier, missing image, missing price, missing request URL, stale source, unavailable state and manual confirmation. The workflow does not reproduce Biker fleet, handover, maintenance, customer, staff or authentication screens.

## Security and privacy

- RLS is enabled on the new table.
- Anonymous users can select only the explicit columns required by the public security-invoker view and only current published source rows.
- Supplier/external-reference IDs, reference values, contacts, Partner data, internal notes and audit IDs receive no anonymous grant.
- Staff/admin authenticated reads remain private; only Admin can insert/update through policy plus the guarded RPC.
- Anonymous mutation and delete are not granted.
- Public CMS media access is extended only to active media referenced by a published offering; archiving referenced media is blocked.
- No Biker credential or service-role dependency exists in server or browser code.

The rollback-only SQL smoke test proves anonymous safe-view access, denies anonymous base private fields, denies staff mutation, checks the CMS reference guard and future timestamp guard, and verifies child-first Supplier archive.

## Performance

The public catalog is one bounded anonymous query with an explicit column list and no N+1 lookups. Detail is one bounded query. Rendering is server-first; there is no polling, autoplay media, large new dependency, duplicated mobile/desktop fetch, or browser-side Biker call. Responsive CMS images use existing Next image optimization.

## Known limitations and owner actions

Before publishing a real offering, the owner must:

1. Create or confirm the real active motorbike Supplier.
2. Add the real opaque `taxua_biker` external reference in Supplier Admin.
3. Upload/approve public imagery in the Trip CMS media library with accurate alt text.
4. Create the offering in Motorbike Admin using real public facts only.
5. Add a currently approved HTTPS manual-confirmation URL.
6. Enter price only when its public authority, checked time and validity are known.
7. Record source freshness and publish only after review.
8. Recheck or pause stale/unavailable information operationally.

Manual mode cannot answer real-time fleet availability, reserve a bike, persist traveler intent, confirm a rental, collect payment, or synchronize changes automatically. The public UI says so.

## Phase 6 boundary

V2 Phase 6 — Package Commerce has not started. Phase 5 does not add generic package components, package pricing, Trip Finder, unified booking, Booking Items, supplier confirmation tasks, payment/deposit, bus, or My Trip. Any later package work must consume this bounded motorbike component without moving Biker fleet operations into Trip.
