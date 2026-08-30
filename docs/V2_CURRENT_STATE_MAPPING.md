# V2 current-state mapping

This document bridges the **Legacy Foundation Completed** (migrations 001–008) and completed V2 Phases 1–2 to the target architecture in Master Plan V2.1. “Target” means planned future capability, not current application behavior.

## Current implementation → V2 target

| Current implementation | V2 target | Bridge status |
| --- | --- | --- |
| Public shell is accommodation-first and uses the current Stay routes, navigation, visual system, and metadata | Tà Xùa Trip master homepage with `Lưu trú` as the consumer vertical, `Homestay Tà Xùa` as SEO language, and Stay under `/stay` | Not implemented. This is V2 Phase 2.5 and requires a separately authorized application/UX migration plus URL compatibility review. |
| `destinations` owns destination identity; every property has `destination_id` | `Destination → Property` with reusable destination ownership | Implemented in V2 Phase 1. The only seeded identity is Tà Xùa; no fake geo facts are seeded. |
| `properties` is the current lodging/business entity | Property belongs to a Destination; private commercial Partner/Supplier data stays separate | Destination ownership is implemented; commercial Partner/Supplier relationships are not. |
| `room_types` represents the commercial category and pooled physical quantity | Room Type remains the commercial/pooled category beneath Property | Already compatible in concept; documentation and future relationships must preserve this meaning. |
| `physical_rooms` stores known exact units with stable uppercase `room_code` beneath one Property/Room Type | Physical Room with stable Room ID beneath Room Type | Implemented in V2 Phase 1. The table starts empty and is never backfilled from quantity. |
| Verification targets property, room type, or exact physical room according to type | Property + Room Type + exact Physical Room verification where material unit differences exist | Implemented additively. Historical room-type records remain valid; exact-room evidence must use the same Room ID. |
| `media_assets` belongs to exactly one property, room type, or physical room | Property / Room Type / Physical Room media with exact-target evidence | Implemented in V2 Phase 1; existing media ownership is unchanged. |
| Room Quality dimensions and factual strengths/caveats target a room type or exact Room ID | Transparent Verified Room Profile without contaminating Cloud View | Implemented in V2 Phase 2. Quality has per-dimension freshness and no overall score; public/private notes remain independent of commercial status. |
| `room_rate_rules.price_vnd` and the resolver provide public/commercial sell price | Sell-price engine plus future private Net Cost, Market Reference, and package economics | Sell pricing is implemented. Private cost/margin layers are not. |
| `room_inventory` provides latest pooled room-type availability by lodging night | Pooled availability remains; future modes may add exact-unit, allotment, and manual-confirmation models | Pooled mode is implemented. Exact-unit/allotment modes are not. |
| Room-first search, SEO landings, Verified Standard, price and availability summaries | Search remains; later deterministic Trip Finder composes verified trip options | Room search is implemented. Trip Finder and package recommendations are not. |
| Biker is a read-only technical/operations reference with no Stay runtime integration | Motorbike service adapter using API/manual confirmation/external reference while Biker remains the fleet/rental source of truth | No motorbike commerce integration exists today. Direct database access remains forbidden. |
| No Supplier or Partner domain | Private Suppliers, commercial Partners, terms, confirmation methods, and service ownership | Not implemented. Public Property must not be overloaded with private commercial data. |
| No generic service catalog or package | Generic service components and flexible `trip_packages` / `package_components` | Not implemented. Room + bike + bus must not be hard-coded as the only package shape. |
| No customer/trip booking tables | Trip-level Booking + Booking Items + Supplier Confirmation + supplier tasks | Not implemented. Browsing availability still creates no hold or booking. |
| No payment, bus, trip operations, or customer dashboard | Item-aware payment/deposit, transport services, Trip Operations, and Trip Dashboard | Not implemented. Payment must remain distinct from supplier/trip confirmation. |

## What is actually implemented today

- site settings, Supabase Auth, `admin`/`staff`, RLS, and Admin shell;
- Destination-owned properties, room types, stable physical Room IDs, amenities, and exclusive property/room-type/physical-room media;
- verification lifecycle, Cloud View, Road Verified, exact-target evidence, 360, Room Quality dimensions, and ordered public strengths/caveats;
- integer-VND room sell pricing and price confidence;
- pooled room-type inventory, freshness-aware availability, and Admin bulk updates;
- room-first search, public property/room routes, SEO landings, sitemap, robots, and temporary-host `noindex` safety.

## Explicitly not implemented

The Tà Xùa Trip public shell, `/stay` namespace, Trip navigation, brand visual system, and route migration are not implemented yet. Suppliers, Partners, private supplier economics, generic Services, motorbike service integration, Bus, Packages, Trip Finder, unified Booking, Booking Items, Supplier Confirmation, supplier tasks, Payment, Trip Operations, and Trip Dashboard do not exist either. V2 Phase 2 adds trust/profile data only; it does not create booking, assignment, exact-unit availability, or a guarantee from `exact_room_bookable`.

## Numbering and next step

Old phase numbers are historical labels only. They are not renamed, and old Phase 1 is not V2 Phase 1.

The completed V2 implementation is:

**V2 Phase 1 — Architecture Alignment: Destination + Physical Room + Room ID + exact-room-compatible Media/Verification.**

**V2 Phase 2 — Verified Room Profile V2: Room Type/Exact Room trust scopes + Room Quality + factual strengths/caveats.**

The next separately authorized step is **V2 Phase 2.5 — Master Brand + Public UX Migration**. It has not been implemented. Current rates, pooled availability, room-first search, SEO, Verified Standard, public routes, and migrations 001–010 must remain preserved through that migration.

**V2 Phase 3 — Supplier + Partner Foundation** has not started and must not start before the Phase 2.5 public migration has been implemented, visually reviewed, and accepted.
