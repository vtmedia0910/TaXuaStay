# V2 Phase 1 — architecture alignment

V2 Phase 1 adds destination and physical-room identity without changing the established room-type commerce model. Its migration is `202608290009_v2_destination_and_physical_rooms.sql`. Migrations 001–008 remain immutable.

## Destination model

`destinations` is a first-class published domain with a URL-safe slug, name, country, timezone, optional factual geography/content, lifecycle fields, RLS, and explicit anonymous column grants. The migration seeds only this known identity:

```text
slug: ta-xua
name: Tà Xùa
country_code: VN
timezone: Asia/Ho_Chi_Minh
```

Coordinates, altitude, province, and description remain null because no trusted value was needed for the architecture migration. Before authoring the backfill, the linked Stay production database was inspected and contained zero property rows. Migration 009 assigns any existing Stay property to the sole established Tà Xùa destination and then makes `properties.destination_id` required. `area_name` remains a sub-area within the destination.

## Room Type versus Physical Room

`room_types` remains the public/commercial category. Current rate rules and `room_inventory` continue to use `room_type_id`; availability remains pooled by date. V2 Phase 1 does not create exact-unit inventory, holds, assignments, bookings, or physical-room pricing.

`physical_rooms` represents a known real unit beneath one property and one room type. Database composite foreign keys ensure that both parents agree on the property. A physical-room row is never generated from `room_types.quantity`, inventory, or media counts.

`room_code` is the stable business Room ID. The application normalizes it to uppercase; PostgreSQL accepts only uppercase URL-safe-style segments such as `TX-MAY-203`, makes it unique within a property, and prevents later edits to the code or owning property. Mutable presentation belongs in `display_name`, `floor_label`, and `unit_label`.

`position_notes` is internal. It is available to authorized operations only and is absent from anonymous grants and public DTOs.

## Exact-room bookable semantics

`exact_room_bookable = true` means operations may accept a request to sell or confirm that exact Room ID. It does not mean the room is available, assigned, guaranteed, or verified. Public wording always says that the property must confirm the request. A later booking/assignment phase must enforce any exact-room commitment.

## Media ownership

`media_assets` now has three exclusive owner choices:

```text
property_id OR room_type_id OR physical_room_id
```

The database requires exactly one non-null owner and the Admin uses one combined selector. Existing property and room-type media rows are untouched and are not reinterpreted as exact-room media. Approved exact-room media is publicly readable only while the physical room and its property/room-type parents are public.

## Verification hierarchy and evidence

Property verification types (`property_identity`, `property_location`, `road_access`) still target one property. Room-related types (`room`, `cloud_view`, `media_360`) target exactly one room type or one physical room. Type and target remain immutable after creation.

Historical room-type verification remains unchanged. New Cloud View records may target a room type or exact physical room. Room-type Cloud View is not promoted to exact-room Cloud View, and exact-room results are not averaged back into the category.

For a physical-room verification, every evidence asset must be owned by that same `physical_room_id`. Property media, room-type media, and media from another Room ID are rejected. The public resolver also checks this equality at read time.

The centralized exact-room resolver requires all of the following before public display:

- a public active/published physical-room row with stable Room ID;
- a current, non-future, non-expired `room` verification targeting that physical room;
- approved public evidence owned by that exact physical room.

A row, `exact_room_bookable`, approved media alone, room-type verification, future verification, or expired verification cannot create the exact-room verified state.

## Public and Admin behavior

Admin adds `/admin/destinations` and `/admin/physical-rooms`. Property editing stores an actual destination FK. Media uses one owner selector. Verification explicitly chooses Property, Room Type, or Physical Room; exact-room choices and evidence are filtered to their owning context.

The existing room-type route remains `/homestay/[propertySlug]/phong/[roomSlug]`. It may show “Phòng cụ thể đã xác minh” only when the current public resolver returns real exact-room data. No physical-room SEO route is introduced, preventing thin pages. Search remains room-type-first.

Anonymous users can read only active/published destinations and physical rooms with public parents, through explicit column allowlists. They cannot mutate these tables or read `position_notes`, lifecycle controls, or audit IDs. Authenticated `admin`/`staff` operations remain protected by the existing `app_metadata.role` authorization and RLS. No service-role runtime client is added.

## Scope boundary

Pricing, price confidence, pooled availability, search ranking, SEO routes/indexing, Road Verified, the Cloud View rubric, and current public URLs are unchanged. No supplier, partner, service, package, motorbike integration, booking, payment, transport, or trip dashboard domain is added.

V2 Phase 2 has not started.
