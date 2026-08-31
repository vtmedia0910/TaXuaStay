# V2 current-state mapping

This document bridges the **Legacy Foundation Completed** (migrations 001–008) and completed V2 Phases 1–6 to the target architecture in Master Plan V2.1. “Target” means planned future capability, not current application behavior.

## Current implementation → V2 target

| Current implementation | V2 target | Bridge status |
| --- | --- | --- |
| Public shell uses Tà Xùa Trip, `Lưu trú`, `Homestay Tà Xùa`, and canonical `/stay` routes | Tà Xùa Trip master homepage with truthful accommodation discovery and room-level evidence | Implemented in V2 Phase 2.5. Historical `/tim-phong` and `/homestay/...` URLs remain compatibility pages with `/stay` canonicals. |
| Structured website copy, page SEO, presentation media and publish workflow live in `cms_*` tables | Admin-managed content within a code-managed public structure | Implemented in V2 Phase 2.6 and operationally hardened in Phase 2.6H. Staff owns drafts/uploads/preview; admin owns publishing/archive. CMS cannot override search, Room IDs, verification, Cloud View, Room Quality, price or availability truth. |
| `destinations` owns destination identity; every property has `destination_id` | `Destination → Property` with reusable destination ownership | Implemented in V2 Phase 1. The only seeded identity is Tà Xùa; no fake geo facts are seeded. |
| `properties` is the current lodging/business entity | Property belongs to a Destination; private commercial Partner/Supplier data stays separate | Destination ownership and private many-to-many Supplier links are implemented. Supplier PII/tier remains outside public Property DTOs. |
| `room_types` represents the commercial category and pooled physical quantity | Room Type remains the commercial/pooled category beneath Property | Already compatible in concept; documentation and future relationships must preserve this meaning. |
| `physical_rooms` stores known exact units with stable uppercase `room_code` beneath one Property/Room Type | Physical Room with stable Room ID beneath Room Type | Implemented in V2 Phase 1. The table starts empty and is never backfilled from quantity. |
| Verification targets property, room type, or exact physical room according to type | Property + Room Type + exact Physical Room verification where material unit differences exist | Implemented additively. Historical room-type records remain valid; exact-room evidence must use the same Room ID. |
| `media_assets` belongs to exactly one property, room type, or physical room | Property / Room Type / Physical Room media with exact-target evidence | Implemented in V2 Phase 1; existing media ownership is unchanged. |
| Room Quality dimensions and factual strengths/caveats target a room type or exact Room ID | Transparent Verified Room Profile without contaminating Cloud View | Implemented in V2 Phase 2. Quality has per-dimension freshness and no overall score; public/private notes remain independent of commercial status. |
| `room_rate_rules.price_vnd` and the resolver provide public room sell price; `commercial_rate_plans` / `room_commercial_rules` provide private accommodation economics; `package_price_rules` and the Package resolver own explicit Package totals | Sell-price engines plus private Net Cost, Market Reference, and Package economics | Room sell pricing remains authoritative for rooms. Phase 4 private accommodation economics remains separate. Phase 6 adds explicit Package totals and private aggregate economics without changing either room authority. |
| `room_inventory` provides latest pooled room-type availability by lodging night | Pooled availability remains; future modes may add exact-unit, allotment, and manual-confirmation models | Pooled mode is implemented. Exact-unit/allotment modes are not. |
| Room-first search, SEO landings, Verified Standard, price and availability summaries | Search remains; later deterministic Trip Finder composes verified trip options | Room search is implemented. Trip Finder and package recommendations are not. |
| Biker is a read-only technical/operations reference; no safe public/server API contract was found | Motorbike service adapter using API/manual confirmation/external reference while Biker remains the fleet/rental source of truth | Implemented in V2 Phase 5 as a bounded `manual_reference` adapter. Trip publishes only reviewed catalog snapshots linked through `supplier_external_refs`; there is no Biker runtime/DB dependency or live-availability claim. |
| `suppliers`, contacts, Property links, Partner lifecycle/tier and external refs | Private Suppliers, commercial Partners, future terms, confirmation methods, and service ownership | Identity and relationship foundation implemented in V2 Phase 3; Phase 3H makes archive child-first/atomic and preserves the current primary-contact ID on ordinary profile edits. Economics, terms, confirmation and generic Service ownership remain future. Public Property is not overloaded. |
| `packages`, `package_components`, and `package_price_rules` compose existing sources | Generic service components and flexible Package composition | V2 Phase 6 implements generic component taxonomy and activates only real ROOM/MOTORBIKE/CUSTOM sources. BUS/TRANSFER/ACTIVITY/MEAL/GUIDE/SERVICE stay inactive until their domains exist. The model is not hard-coded to room + bike or room + bus + bike. |
| No customer/trip booking tables | Trip-level Booking + Booking Items + Supplier Confirmation + supplier tasks | Not implemented. Browsing availability still creates no hold or booking. |
| No payment, bus, trip operations, or customer dashboard | Item-aware payment/deposit, transport services, Trip Operations, and Trip Dashboard | Not implemented. Payment must remain distinct from supplier/trip confirmation. |

## What is actually implemented today

- site settings, Supabase Auth, `admin`/`staff`, RLS, and Admin shell;
- Destination-owned properties, room types, stable physical Room IDs, amenities, and exclusive property/room-type/physical-room media;
- verification lifecycle, Cloud View, Road Verified, exact-target evidence, 360, Room Quality dimensions, and ordered public strengths/caveats;
- integer-VND room sell pricing and price confidence;
- pooled room-type inventory, freshness-aware availability, and Admin bulk updates;
- room-first search, public property/room routes, SEO landings, sitemap, robots, and temporary-host `noindex` safety.
- structured Homepage/Stay/Footer editorial content, website media, protected draft preview and atomic page publishing, with code fallbacks.
- private Supplier identities, contacts, Property roles/history, Partner lifecycle/tier, and opaque external-system references with no anonymous access; Phase 3H adds one canonical archive RPC, direct-archive protection, non-reopening reactivation, and stable primary-contact edits.
- a small Trip-owned motorbike catalog projection, manual/reference provider adapter, `/motorbike`, and Admin controls linked to a real motorbike Supplier plus `taxua_biker` external reference; no production rows are seeded.
- a real Package domain with generic ordered components, explicit current Package pricing, private aggregate economics, availability/confirmation aggregation, `/packages`, and `/admin/packages`; no production rows are seeded.

## Explicitly not implemented

Generic standalone Services, motorbike fleet operations/live integration, Bus, Trip Finder, unified Booking, Booking Items, Supplier Confirmation, supplier tasks, Payment, Trip Operations, and Trip Dashboard do not exist. The Phase 5 motorbike projection and Phase 6 Package inquiry create no request record, hold, booking or payment. Transport remains clearly marked future. Combo is shown as usable only when at least one genuine published Package passes public eligibility; otherwise it remains `Sắp có`. Supplier/Partner status does not change accommodation verification, price confidence, availability, or ranking.

## Numbering and next step

Old phase numbers are historical labels only. They are not renamed, and old Phase 1 is not V2 Phase 1.

The completed V2 implementation is:

**V2 Phase 1 — Architecture Alignment: Destination + Physical Room + Room ID + exact-room-compatible Media/Verification.**

**V2 Phase 2 — Verified Room Profile V2: Room Type/Exact Room trust scopes + Room Quality + factual strengths/caveats.**

**V2 Phase 2.5 — Master Brand + Public UX Migration** is complete. It changed public brand, navigation, canonical paths and presentation only; migrations through 010 preserve rates, pooled availability, room-first search, SEO, and verification truth.

**V2 Phase 2.6 — CMS + Media + Content Operations** is complete. Migrations 011–014 add structured draft/published content, website-only media, atomic publishing, public-safe projections and archive-focused lifecycle hardening. **V2 Phase 2.6H — CMS Admin UX + Publishing Hardening** is complete with the visual operations UI and migration 015. Product truth and page structure remain code-controlled.

**V2 Phase 3 — Supplier + Partner Foundation** is complete with migration 016 and the private Admin workflow. **V2 Phase 3H — Supplier Lifecycle Hardening** is complete with corrective migration 017. **V2 Phase 4 — Commercial Economics** is complete with migrations 018–020, the private `phase4-economics-v1` resolver and `/admin/economics`. **V2 Phase 5 — Motorbike Integration** is complete with migrations 021–022, the `manual_reference` adapter, `/motorbike`, and `/admin/motorbike`. **V2 Phase 6 — Package Commerce** is complete with migration 023, the `phase6-package-v1` resolver, `/packages`, and `/admin/packages`. V2 Phase 7 — Trip Finder has not started.
