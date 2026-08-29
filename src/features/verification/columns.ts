export const VERIFICATION_RECORD_QUERY = [
  "id", "verification_type", "status", "property_id", "room_type_id", "physical_room_id",
  "verified_at", "expires_at", "verified_by_user_id", "method", "notes",
  "created_at", "updated_at",
].join(",");
export const CLOUD_VIEW_VERIFICATION_QUERY = [
  "verification_id", "direct_valley_points", "view_width_points",
  "obstruction_points", "view_from_bed_points", "private_position_points",
  "orientation_points", "evidence_points", "total_points", "score_10",
  "view_from_bed", "viewing_position", "view_direction",
  "horizontal_view_angle_deg", "sunrise_orientation", "obstruction_notes",
  "cloud_view_notes",
].join(",");

export const ROAD_VERIFICATION_QUERY = [
  "verification_id", "grade", "car_access", "motorbike_access",
  "sedan_access", "parking", "road_surface", "steepness_notes",
  "narrow_section_notes", "rain_risk_notes", "parking_location",
  "walk_from_parking_m", "notes",
].join(",");

export const PUBLIC_VERIFICATION_BADGE_QUERY = [
  "verification_id", "verification_type", "property_id", "room_type_id", "physical_room_id",
  "verified_at", "expires_at",
].join(",");

export const PUBLIC_CLOUD_VIEW_QUERY = [
  "verification_id", "room_type_id", "physical_room_id", "total_points", "score_10",
  "view_from_bed", "viewing_position", "view_direction",
  "horizontal_view_angle_deg", "sunrise_orientation", "obstruction_notes",
  "cloud_view_notes", "verified_at", "expires_at",
].join(",");

export const PUBLIC_ROAD_VERIFICATION_QUERY = [
  "verification_id", "property_id", "grade", "car_access",
  "motorbike_access", "sedan_access", "parking", "road_surface",
  "steepness_notes", "narrow_section_notes", "rain_risk_notes",
  "parking_location", "walk_from_parking_m", "notes", "verified_at",
  "expires_at",
].join(",");

export const PUBLIC_VERIFICATION_EVIDENCE_QUERY = [
  "verification_id", "evidence_role", "media_asset_id", "property_id",
  "room_type_id", "physical_room_id", "media_type", "evidence_type", "url", "thumbnail_url",
  "caption", "alt_text", "captured_at", "compass_heading_deg",
  "horizontal_fov_deg",
].join(",");

export const VERIFICATION_EVIDENCE_OPTION_QUERY = [
  "id", "property_id", "room_type_id", "physical_room_id", "media_type", "evidence_type",
  "url", "thumbnail_url", "alt_text", "is_verified", "captured_at",
].join(",");
