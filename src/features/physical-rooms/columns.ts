export const ADMIN_PHYSICAL_ROOM_QUERY = [
  "id", "property_id", "room_type_id", "room_code", "display_name",
  "floor_label", "unit_label", "position_notes", "exact_room_bookable",
  "is_active", "publish_status", "archived_at", "updated_at",
].join(",");
export const PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY = [
  "physical_room_id", "property_id", "room_type_id", "room_code",
  "display_name", "floor_label", "unit_label", "exact_room_bookable",
  "room_verification_id", "verified_at", "expires_at", "cloud_view_verified",
].join(",");
