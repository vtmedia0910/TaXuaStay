import { PUBLIC_AMENITY_QUERY } from "@/features/amenities/columns";
import { PUBLIC_ROOM_QUERY } from "@/features/rooms/columns";

export const SEARCH_PROPERTY_QUERY = [
  "id", "slug", "name", "property_type", "area_name", "car_access",
  "motorbike_access", "parking", "restaurant", "breakfast", "bbq", "wifi",
  "is_featured", "updated_at",
].join(",");

export const SEARCH_ROOM_WITH_PROPERTY_QUERY = [
  PUBLIC_ROOM_QUERY,
  `property:properties!inner(${SEARCH_PROPERTY_QUERY})`,
].join(",");

export const SEARCH_MEDIA_QUERY = [
  "id", "property_id", "room_type_id", "media_type", "url", "thumbnail_url",
  "alt_text", "sort_order",
].join(",");

export const SEARCH_ROOM_AMENITY_QUERY =
  `room_type_id,amenity:amenities(${PUBLIC_AMENITY_QUERY})`;

export const SEARCH_PROPERTY_AMENITY_QUERY =
  `property_id,amenity:amenities(${PUBLIC_AMENITY_QUERY})`;
