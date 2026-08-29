import type { PublishStatus } from "@/features/properties/types";

export interface PhysicalRoomDto {
  id: string;
  property_id: string;
  room_type_id: string;
  room_code: string;
  display_name: string | null;
  floor_label: string | null;
  unit_label: string | null;
  position_notes: string | null;
  exact_room_bookable: boolean;
  is_active: boolean;
  publish_status: PublishStatus;
  archived_at: string | null;
  updated_at: string;
}
export interface PhysicalRoomOption {
  id: string;
  property_id: string;
  room_type_id: string;
  room_code: string;
  display_name: string | null;
}

export interface PhysicalRoomListItem extends PhysicalRoomDto {
  property_name: string;
  room_type_name: string;
  media_count: number;
  verification_count: number;
}

export interface PublicVerifiedPhysicalRoomDto {
  physical_room_id: string;
  property_id: string;
  room_type_id: string;
  room_code: string;
  display_name: string | null;
  floor_label: string | null;
  unit_label: string | null;
  exact_room_bookable: boolean;
  room_verification_id: string;
  verified_at: string;
  expires_at: string;
  exact_verification_state: "verified";
  cloud_view_verified: boolean;
}
