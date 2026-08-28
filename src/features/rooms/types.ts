import type { PublishStatus } from "@/features/properties/types";

export const BATHROOM_TYPES = ["private", "shared", "ensuite", "other"] as const;
export const VIEW_TYPES = [
  "unknown",
  "mountain",
  "valley",
  "garden",
  "village",
  "courtyard",
  "none",
  "other",
] as const;

export type BathroomType = (typeof BATHROOM_TYPES)[number];
export type ViewType = (typeof VIEW_TYPES)[number];

export interface RoomTypeDto {
  id: string;
  property_id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  capacity_adults: number;
  capacity_children: number;
  max_guests: number;
  bed_type: string | null;
  bed_count: number | null;
  bathroom_type: BathroomType;
  quantity: number;
  size_m2: number | null;
  floor_label: string | null;
  has_private_balcony: boolean;
  view_type: ViewType;
  is_active: boolean;
  publish_status: PublishStatus;
  room_verified_at: string | null;
  updated_at: string;
}

export type PublicRoomTypeDto = Omit<
  RoomTypeDto,
  "is_active" | "publish_status" | "room_verified_at"
>;

export interface RoomListItem extends RoomTypeDto {
  property_name: string;
  property_slug: string;
  amenity_count: number;
  media_count: number;
}
