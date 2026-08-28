export interface PublicSiteSettings {
  id: string;
  site_name: string;
  tagline: string;
  hotline: string | null;
  zalo_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  address: string | null;
  google_maps_url: string | null;
  announcement: string | null;
  announcement_enabled: boolean;
  hero_title: string;
  hero_subtitle: string;
  updated_at: string | null;
}
