# Phase 2 properties, rooms, amenities, and media

Phase 2 establishes the accommodation content domain only. The Master Plan remains the architecture reference, while each task prompt controls which phase may be executed.

## Domain boundaries

`properties` represents a lodging or accommodation business. It is deliberately separate from any future generic Place or point-of-interest model.

`room_types` represents a real category of rooms belonging to one property. It is the future room-first search and transaction entity. Its `quantity` is the physical count of units of that type; it does not mean availability for any date.

Phase 2 does not contain prices, rate rules, inventory dates, availability confidence, customers, or bookings.

## Publishing lifecycle

Properties and room types support `draft`, `published`, and `archived` states plus an active flag. Database constraints require a published record to be active. Published rooms are public only when their parent property is also active, published, and not archived.

New Admin records start as drafts. Property archival sets it inactive and records `archived_at`. Main content tables do not grant hard-delete access to normal Admin workflows.

Anonymous policies call fixed-search-path visibility helpers. These helpers expose only whether a UUID belongs to content that is currently public; they prevent nested join policies from needing broad access to internal lifecycle columns.

## Amenities

Amenities use a shared catalog and composite-primary-key joins:

```text
amenities
property_amenities
room_amenities
```

The joins prevent duplicate assignments. Core operational facts such as parking, breakfast, Wi-Fi, or access remain explicit property/room fields where they affect customer decisions; long-tail facilities use the catalog.

## Evidence-aware media

`media_assets` supports photos, videos, and `panorama_360`. Every asset must belong to exactly one property or room type and use HTTPS URLs. Optional evidence metadata includes capture time, coordinates, compass heading, and horizontal field of view.

The Phase 2 `is_verified` flag means the individual asset has been reviewed and approved for public display. It must not be presented as Property Verified, Room Verified, Cloud View Verified, Road Verified, or the future Verified Standard.

Public pages see only reviewed assets whose owning property/room is also public. User IDs used for capture, review, and audit are excluded from public grants and DTOs.

## Routes

Public:

```text
/homestay/[slug]
/homestay/[propertySlug]/phong/[roomSlug]
```

Admin:

```text
/admin/properties
/admin/rooms
/admin/amenities
/admin/media
```

Each Admin module provides list, create, and edit workflows. Properties can be archived; other content can be drafted, unpublished, deactivated, or have media approval removed. Server Actions re-check `admin`/`staff` authorization and validate inputs with Zod before using the authenticated Supabase session.

## Data-quality indicators

Admin lists call out properties without location, property media, or room types, and rooms without media or amenities. These are content-completeness hints, not a later-phase operational dashboard or verification badge.

## Explicitly deferred

Phase 3 and later remain untouched, including:

- room-first search and SEO landing pages;
- verification records, Cloud View scoring, Road Verified, and an interactive 360 viewer;
- rates, price confidence, inventory, and availability;
- customers and booking requests;
- imports, weather, maps, and Biker referrals.

No fake price, availability, rating, review count, verification badge, or production accommodation record is seeded.
