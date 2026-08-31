# V2 Phase 3 — Supplier + Partner Foundation

Status: **implemented** by additive migration `202608290016_v2_supplier_partner_foundation.sql` and the private Admin module at `/admin/suppliers`; lifecycle/contact semantics are corrected by Phase 3H migration `202608290017_harden_supplier_lifecycle.sql`.

This phase answers who supplies a product/service, who operations contacts, which accommodation entities they support, and what private relationship they have with Tà Xùa Trip. It deliberately stops before V2 Phase 4 commercial economics.

## Domain boundaries

- **Property** is the public accommodation entity and remains owned by the accommodation domain.
- **Supplier** is a private organization or individual that can supply accommodation, motorbike, bus, transport, activity, food, guide, or another future service.
- **Supplier ↔ Property** records who owns, operates, manages, handles reservations for, or otherwise works with a Property. It is many-to-many and historical.
- **Partner Relationship** records Tà Xùa Trip's private relationship with a Supplier. A Supplier can exist without being a Partner.
- **Verification** remains factual, evidence-backed trust data. Partner status and tier are never inputs to verification.
- **CMS** remains public/editorial content. Supplier data is not copied into CMS.

Supplier rows do not require a Property, so future non-accommodation providers are not forced into the lodging model. Public Property and room DTOs were not expanded with supplier identity, contact, tier, tax, audit, or external-reference fields.

## Private schema

### `suppliers`

The stable operational identifier is `supplier_code`, for example `SUP-TX-0001`. The database normalizes it to uppercase on insert, enforces uniqueness and format, and rejects every later code change. Display/legal names never define identity.

Supported types:

- `accommodation`
- `motorbike`
- `bus`
- `transport`
- `activity`
- `food`
- `guide`
- `other`

Lifecycle:

- `lead`
- `onboarding`
- `active`
- `paused`
- `inactive`
- `archived`

Hard delete is not granted. Phase 3H makes `archive_supplier` the single authoritative lifecycle path: it locks the Supplier, disables/closes children, then archives the parent in one transaction. Direct authenticated status changes to `archived` are blocked. An archived Supplier must first be reactivated before receiving a new current operational child, and reactivation never reopens historical children.

### `supplier_contacts`

Contacts are normalized child rows rather than columns on `suppliers`. Types are owner, manager, reservation, operations, accounting, emergency, and other. Each row needs a name and at least one of phone, email, or Zalo. Phone punctuation/spacing is normalized and email is lowercased. Only one active primary contact is permitted per Supplier.

Phone, email, Zalo, role, and notes are private. There is no anonymous grant, public view, or public DTO containing them. Contacts are disabled rather than deleted.

### `supplier_properties`

The join records owner, operator, manager, reservation partner, commercial partner, or other roles. `valid_from` / `valid_until` preserve history and invalid reverse ranges are rejected. Exact duplicate open Supplier/Property/role links are prevented. At most one open primary Supplier is allowed for each Property/role combination, without preventing legitimate shared non-primary operations or multiple different roles.

Supplier and Property ownership of an existing link is immutable. End-date a relationship instead of repointing or deleting it.

### `partner_relationships`

Relationship status is separate from Supplier lifecycle:

- `prospect`
- `onboarding`
- `active`
- `paused`
- `ended`

Only one non-ended relationship is allowed per Supplier; ended rows remain history. Active/paused/ended relationships get a start date, and an ended transition defaults its end date to the current database date when the Admin leaves it blank. Review dates cannot be in the future.

Partner tiers are private relationship classifications:

| Tier | Internal operational meaning |
| --- | --- |
| `standard` | Normal supply relationship |
| `verified` | Supplier identity/operational relationship reviewed internally |
| `preferred` | Deeper cooperation, not a quality rank |
| `cloud_partner` | Special cooperation around Cloud/View supply, not Cloud View Verified |
| `exclusive` | A recorded exclusivity scope, without Phase 4 economics |

The word `verified` in an internal Partner tier never produces a public Verified badge and must not be presented as Room/Exact Room verification.

### `supplier_external_refs`

An optional opaque identity bridge prepares future integration without copying another system. `(system_key, external_reference)` is unique and immutable; JSON metadata must be an object limited to 8 KiB. It must not contain credentials, API keys, tokens, customer data, fleet data, maintenance, rental history, handover, repair, plates, or bike QR data.

No Biker row is seeded and no runtime Biker call exists. Tà Xùa Biker remains the separate specialized motorbike source of truth.

All five tables carry `created_at`, `updated_at`, `created_by`, and `updated_by` audit ownership. Relationship tables also carry their relevant lifecycle dates.

## Authorization, RLS, and grants

RLS is enabled on every new table. All privileges are revoked from `anon`; there is no anonymous SELECT, INSERT, UPDATE, DELETE, view, or RPC execution path.

Authenticated access is still constrained by `app_metadata.role`:

| Capability | staff | admin |
| --- | --- | --- |
| Read private Supplier domain | yes | yes |
| Create/update contacts | yes | yes |
| Create/update/end Property links | yes | yes |
| Create/update Supplier identity and lifecycle | no | yes |
| Create/update/end Partner relationship or tier | no | yes |
| Create/update/deactivate external references | no | yes |
| Hard delete | no | no |

Server Actions repeat authentication/authorization and Zod validation. RLS and explicit grants remain the database backstop. No service-role client is used.

## Mutation safety

`save_supplier_profile_v2` atomically creates/updates the Supplier and optionally creates or updates the current primary contact. Existing primary-contact edits preserve the contact ID; a different person is added deliberately through the Contacts UI so the prior row remains history. The migration-016 profile RPC is no longer executable by authenticated callers. Contact saves atomically normalize one active primary contact. Property-link saves atomically clear another open primary link for the same Property/role before saving the selected one. Partner/external-reference saves are one-transaction RPCs. `archive_supplier` closes all current children before archiving the parent, and a controlled child failure rolls the full graph back.

Relationship `valid_until` dates are inclusive. Closing a relationship today records history through today; the corrected child-first ordering preserves that semantic without weakening the archived-Supplier guard. See `docs/V2_PHASE_3H_SUPPLIER_LIFECYCLE_HARDENING.md` for the root cause, direct-update policy, reactivation behavior, and rollback-only integration suite.

These functions use `security invoker`, explicit role checks, authenticated grants, and RLS. There are no function-level commits, partial follow-up writes, or hard-delete actions.

## Admin workflow

`/admin/suppliers` provides search and type/Supplier-status/Partner-status filters. Each result shows operational code, display name, type, lifecycle, primary contact, current linked Property count, Partner status/tier, updated date, and factual warnings for an active Supplier without a primary contact or an active but expired Partner relationship.

`/admin/suppliers/new` is Admin-only and offers an optional first primary contact in the same atomic save. `/admin/suppliers/[id]/edit` separates:

- Thông tin nhà cung cấp
- Liên hệ
- Cơ sở / dịch vụ liên kết
- Quan hệ đối tác
- Tham chiếu hệ thống
- Ghi chú nội bộ / lifecycle controls

Staff can maintain contacts and Property links. Admin controls Supplier lifecycle, Partner relationship/tier, and external identity. Property Admin shows a private Supplier summary and links back to Supplier Admin; it does not duplicate supplier fields into `properties`.

## Trust invariants

Partner status, tier, exclusivity, sponsorship, or preferred cooperation do not alter:

- Exact Room Verified
- Room Type Verified
- Cloud View
- Room Quality
- Road Verified
- verification dates/evidence or strengths/caveats
- price confidence or sell-price resolution
- availability truth/freshness
- public search ranking

A Supplier cannot pay to improve verification. No public Partner badge, supplier directory, Partner SEO page, sponsored ranking, or verification coupling is introduced.

## Production and scope boundary

Migration 016 inserts no Supplier, contact, Property link, Partner relationship, or external-reference data. Production remains empty until staff enters real data.

V2 Phase 3 contains no private cost, contract rate, commission, margin, markup, revenue share, settlement, payment terms, bank data, package, generic service catalog, booking, payment, supplier confirmation, transport inventory, or motorbike runtime integration. Those require later, separately authorized phases. The next planned phase is V2 Phase 4 — Commercial Economics, and it has not been started by this implementation.
