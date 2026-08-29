export const PUBLIC_DESTINATION_QUERY = [
  "id", "slug", "name", "short_name", "province", "country_code", "timezone",
  "latitude", "longitude", "altitude_reference_m", "description", "updated_at",
].join(",");
export const ADMIN_DESTINATION_QUERY = [
  PUBLIC_DESTINATION_QUERY,
  "is_active",
  "publish_status",
].join(",");
