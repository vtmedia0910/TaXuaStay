import type { PublicVerifiedPhysicalRoomDto } from "@/features/physical-rooms/types";
import type {
  PublicCloudViewVerificationDto,
  PublicVerificationBadgeDto,
  PublicVerificationEvidenceDto,
} from "@/features/verification/types";

export const ROOM_QUALITY_DIMENSIONS = [
  "cleanliness",
  "soundproof",
  "heating",
  "hot_water",
  "wifi",
  "bathroom",
  "room_accuracy",
  "comfort",
] as const;

export const ROOM_PROFILE_NOTE_TYPES = ["pro", "con"] as const;
export const ROOM_PROFILE_NOTE_CATEGORIES = [
  "view",
  "noise",
  "bathroom",
  "access",
  "wifi",
  "space",
  "privacy",
  "temperature",
  "location",
  "other",
] as const;

export type RoomQualityDimension = (typeof ROOM_QUALITY_DIMENSIONS)[number];
export type RoomQualityDimensionState = "current" | "stale" | "unknown";
export type RoomProfileNoteType = (typeof ROOM_PROFILE_NOTE_TYPES)[number];
export type RoomProfileNoteCategory = (typeof ROOM_PROFILE_NOTE_CATEGORIES)[number];

export type RoomQualityScores = {
  [Dimension in RoomQualityDimension as `${Dimension}_score`]: number | null;
};

export type RoomQualityStates = {
  [Dimension in RoomQualityDimension as `${Dimension}_state`]: RoomQualityDimensionState;
};

export interface RoomQualityAssessmentDto extends RoomQualityScores {
  verification_record_id: string;
  room_type_id: string | null;
  physical_room_id: string | null;
  notes_public: string | null;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicRoomQualityAssessmentDto extends RoomQualityScores, RoomQualityStates {
  verification_record_id: string;
  room_type_id: string | null;
  physical_room_id: string | null;
  notes_public: string | null;
  verified_at: string;
  expires_at: string;
  verification_state: "current";
}

export interface RoomProfileNoteDto {
  id: string;
  room_type_id: string | null;
  physical_room_id: string | null;
  note_type: RoomProfileNoteType;
  category: RoomProfileNoteCategory;
  text: string;
  sort_order: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export type PublicRoomProfileNoteDto = Omit<RoomProfileNoteDto, "is_public">;

export interface AdminRoomProfileNote extends RoomProfileNoteDto {
  target_name: string;
  property_name: string;
}

export interface ExactRoomProfileDto {
  room: PublicVerifiedPhysicalRoomDto;
  badges: PublicVerificationBadgeDto[];
  cloudView: PublicCloudViewVerificationDto | null;
  quality: PublicRoomQualityAssessmentDto | null;
  notes: PublicRoomProfileNoteDto[];
  evidence: PublicVerificationEvidenceDto[];
}

export interface VerifiedRoomProfileBundle {
  roomTypeQuality: PublicRoomQualityAssessmentDto | null;
  roomTypeNotes: PublicRoomProfileNoteDto[];
  exactRooms: ExactRoomProfileDto[];
}
