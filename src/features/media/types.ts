export const MEDIA_TYPES = ["photo", "video", "panorama_360"] as const;
export const EVIDENCE_TYPES = [
  "property",
  "room",
  "bathroom",
  "view_from_room",
  "view_from_bed",
  "balcony",
  "road_access",
  "parking",
  "food",
  "sunrise",
  "verification",
  "other",
] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export interface MediaAssetDto {
  id: string;
  property_id: string | null;
  room_type_id: string | null;
  physical_room_id: string | null;
  media_type: MediaType;
  evidence_type: EvidenceType;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  alt_text: string;
  sort_order: number;
  captured_at: string | null;
  latitude: number | null;
  longitude: number | null;
  compass_heading_deg: number | null;
  horizontal_fov_deg: number | null;
  is_verified: boolean;
  verified_at: string | null;
  updated_at: string;
}

export interface MediaListItem extends MediaAssetDto {
  owner_name: string;
  owner_kind: "property" | "room_type" | "physical_room";
}
