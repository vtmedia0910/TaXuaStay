export const PUBLIC_ROOM_QUERY = [
  "id", "property_id", "slug", "name", "short_description", "description",
  "capacity_adults", "capacity_children", "max_guests", "bed_type", "bed_count",
  "bathroom_type", "quantity", "size_m2", "floor_label", "has_private_balcony",
  "view_type", "updated_at",
].join(",");

export const ADMIN_ROOM_QUERY = [
  PUBLIC_ROOM_QUERY,
  "is_active",
  "publish_status",
  "room_verified_at",
].join(",");
