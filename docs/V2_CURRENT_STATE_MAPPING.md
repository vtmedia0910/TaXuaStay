# V2 current-state mapping

This document bridges the **Legacy Foundation Completed** (migrations 001–008) to the target architecture in Master Plan V2. “Target” means planned future capability, not current application behavior.

## Current implementation → V2 target

| Current implementation | V2 target | Bridge status |
| --- | --- | --- |
| No `destinations` domain; current accommodation content is Tà Xùa-oriented | `Destination → Property` with reusable destination ownership | Not implemented. V2 Phase 1 adds the relationship without rewriting properties. |
| `properties` is the current lodging/business entity | Property belongs to a Destination; private commercial Partner/Supplier data stays separate | Property is implemented; destination and commercial relationships are not. |
| `room_types` represents the commercial category and pooled physical quantity | Room Type remains the commercial/pooled category beneath Property | Already compatible in concept; documentation and future relationships must preserve this meaning. |
| No `physical_rooms` table or stable exact-unit identity | Physical Room with stable Room ID beneath Room Type | Not implemented. Never infer room IDs from `room_types.quantity`. |
| Verification targets property or room type; Cloud View is currently room-type-level | Property + Room Type + exact Physical Room verification where material unit differences exist | Current verification remains historically valid; exact-room targeting is not implemented. |
| `media_assets` belongs to exactly one property or room type | Property / Room Type / Physical Room media with exact-target evidence | Property and room-type media are implemented; physical-room ownership is not. |
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
- properties, room types, amenities, and property/room-type media;
- verification lifecycle, Cloud View, Road Verified, exact-target evidence at the currently supported property/room-type levels, and 360 presentation;
- integer-VND room sell pricing and price confidence;
- pooled room-type inventory, freshness-aware availability, and Admin bulk updates;
- room-first search, public property/room routes, SEO landings, sitemap, robots, and temporary-host `noindex` safety.

## Explicitly not implemented

Destination, Physical Room, stable Room ID, Exact Room claims, exact-room media/verification, Suppliers, Partners, private supplier economics, generic Services, motorbike service integration, Bus, Packages, Trip Finder, unified Booking, Booking Items, Supplier Confirmation, supplier tasks, Payment, Trip Operations, and Trip Dashboard do not exist yet.

## Numbering and next step

Old phase numbers are historical labels only. They are not renamed, and old Phase 1 is not V2 Phase 1.

The next separately authorized implementation is:

**V2 Phase 1 — Architecture Alignment: Destination + Physical Room + Room ID + exact-room-compatible Media/Verification.**

It must preserve current rates, availability, search, SEO, Verified Standard, public routes, and all remote-applied migrations 001–008.
