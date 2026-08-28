export const PUBLIC_SITE_SETTINGS_COLUMNS = [
  "id",
  "site_name",
  "tagline",
  "hotline",
  "zalo_url",
  "facebook_url",
  "tiktok_url",
  "address",
  "google_maps_url",
  "announcement",
  "announcement_enabled",
  "hero_title",
  "hero_subtitle",
  "updated_at",
] as const;

export const PUBLIC_SITE_SETTINGS_QUERY = PUBLIC_SITE_SETTINGS_COLUMNS.join(",");
