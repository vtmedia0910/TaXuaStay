export const PUBLIC_PROPERTY_QUERY = [
  "id", "destination_id", "slug", "name", "property_type", "short_description", "description",
  "area_name", "address", "latitude", "longitude", "altitude_m", "google_maps_url",
  "public_phone", "public_zalo_url", "check_in_time", "check_out_time",
  "road_access_grade", "car_access", "motorbike_access", "parking", "restaurant",
  "breakfast", "bbq", "wifi", "is_featured", "updated_at",
].join(",");

export const ADMIN_PROPERTY_QUERY = [
  PUBLIC_PROPERTY_QUERY,
  "is_active",
  "publish_status",
  "archived_at",
  "property_verified_at",
  "location_verified_at",
].join(",");
