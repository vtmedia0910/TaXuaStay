export const CMS_PAGE_KEYS = ["home", "stay", "verified", "footer", "faq"] as const;
export type CmsPageKey = (typeof CMS_PAGE_KEYS)[number];

export type CmsPageStatus = "draft" | "published" | "archived";
export type CmsMediaRole = "hero" | "card" | "gallery" | "banner" | "og" | "icon" | "general";

export interface CmsMediaAsset {
  id: string;
  title: string;
  alt_text: string;
  caption: string | null;
  media_type: "image";
  role: CmsMediaRole;
  storage_bucket: string | null;
  storage_path: string | null;
  external_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  focal_x: number;
  focal_y: number;
  is_active?: boolean;
  created_at?: string;
}
export interface CmsSectionItem {
  id: string;
  section_id: string;
  item_key: string;
  item_type: "content" | "link" | "faq" | "room_reference";
  title: string;
  body: string | null;
  label: string | null;
  href: string | null;
  media_id: string | null;
  room_type_id: string | null;
  physical_room_id: string | null;
  sort_order: number;
  is_enabled?: boolean;
  media?: CmsMediaAsset | null;
}

export interface CmsSection {
  id: string;
  page_id: string;
  section_key: string;
  section_type: string;
  eyebrow: string | null;
  heading: string | null;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
  desktop_media_id: string | null;
  mobile_media_id: string | null;
  sort_order: number;
  is_enabled?: boolean;
  max_items: number | null;
  desktop_media?: CmsMediaAsset | null;
  mobile_media?: CmsMediaAsset | null;
  items: CmsSectionItem[];
}

export interface CmsPage {
  id: string;
  page_key: CmsPageKey;
  status?: CmsPageStatus;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  og_media_id: string | null;
  published_at: string | null;
  og_media?: CmsMediaAsset | null;
  sections: CmsSection[];
}

export interface CmsRoomOption {
  id: string;
  label: string;
}
