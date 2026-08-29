import type { AccessCertainty } from "@/features/properties/types";
import type { EvidenceType, MediaType } from "@/features/media/types";

export const VERIFICATION_TYPES = [
  "property_identity",
  "property_location",
  "room",
  "cloud_view",
  "road_access",
  "media_360",
] as const;

export const VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "expired",
  "rejected",
  "needs_review",
] as const;

export const VIEW_FROM_BED_VALUES = ["yes", "partial", "no"] as const;
export const VIEWING_POSITIONS = [
  "private_balcony",
  "private_terrace",
  "private_window",
  "semi_private",
  "shared",
  "none",
] as const;
export const VIEW_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "unknown"] as const;
export const SUNRISE_ORIENTATIONS = ["good", "partial", "no", "unknown"] as const;
export const ROAD_GRADES = ["a", "b", "c", "d"] as const;
export const ROAD_SURFACES = ["asphalt", "concrete", "gravel", "dirt", "mixed", "unknown"] as const;

export type VerificationType = (typeof VERIFICATION_TYPES)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type VerificationResolvedState = VerificationStatus | "current" | "not_yet_valid";
export type ViewFromBed = (typeof VIEW_FROM_BED_VALUES)[number];
export type ViewingPosition = (typeof VIEWING_POSITIONS)[number];
export type ViewDirection = (typeof VIEW_DIRECTIONS)[number];
export type SunriseOrientation = (typeof SUNRISE_ORIENTATIONS)[number];
export type RoadGrade = (typeof ROAD_GRADES)[number];
export type RoadSurface = (typeof ROAD_SURFACES)[number];

export interface CloudViewComponents {
  direct_valley_points: number;
  view_width_points: number;
  obstruction_points: number;
  view_from_bed_points: number;
  private_position_points: number;
  orientation_points: number;
  evidence_points: number;
}

export interface VerificationRecordDto {
  id: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  property_id: string | null;
  room_type_id: string | null;
  verified_at: string | null;
  expires_at: string | null;
  verified_by_user_id: string | null;
  method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudViewVerificationDto extends CloudViewComponents {
  verification_id: string;
  total_points: number;
  score_10: number;
  view_from_bed: ViewFromBed;
  viewing_position: ViewingPosition;
  view_direction: ViewDirection;
  horizontal_view_angle_deg: number | null;
  sunrise_orientation: SunriseOrientation;
  obstruction_notes: string | null;
  cloud_view_notes: string | null;
}

export interface RoadVerificationDto {
  verification_id: string;
  grade: RoadGrade;
  car_access: AccessCertainty;
  motorbike_access: AccessCertainty;
  sedan_access: AccessCertainty;
  parking: AccessCertainty;
  road_surface: RoadSurface;
  steepness_notes: string | null;
  narrow_section_notes: string | null;
  rain_risk_notes: string | null;
  parking_location: string | null;
  walk_from_parking_m: number | null;
  notes: string | null;
}

export interface PublicVerificationBadgeDto {
  verification_id: string;
  verification_type: VerificationType;
  property_id: string | null;
  room_type_id: string | null;
  verified_at: string;
  expires_at: string;
}

export interface PublicCloudViewVerificationDto extends Omit<CloudViewVerificationDto, keyof CloudViewComponents> {
  room_type_id: string;
  verified_at: string;
  expires_at: string;
}

export interface PublicRoadVerificationDto extends RoadVerificationDto {
  property_id: string;
  verified_at: string;
  expires_at: string;
}

export interface VerificationEvidenceDto {
  verification_id: string;
  media_asset_id: string;
  evidence_role: string;
  public_visible: boolean;
}

export interface PublicVerificationEvidenceDto {
  verification_id: string;
  evidence_role: string;
  media_asset_id: string;
  property_id: string | null;
  room_type_id: string | null;
  media_type: MediaType;
  evidence_type: EvidenceType;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  alt_text: string;
  captured_at: string | null;
  compass_heading_deg: number | null;
  horizontal_fov_deg: number | null;
}

export interface AdminVerificationRecord extends VerificationRecordDto {
  cloud_view: CloudViewVerificationDto | null;
  road: RoadVerificationDto | null;
  evidence_ids: string[];
  resolved_state: VerificationResolvedState;
}

export interface AdminVerificationListItem extends VerificationRecordDto {
  target_name: string;
  property_name: string | null;
  resolved_state: VerificationResolvedState;
}

export interface VerificationEvidenceOption {
  id: string;
  property_id: string | null;
  room_type_id: string | null;
  media_type: MediaType;
  evidence_type: EvidenceType;
  url: string;
  thumbnail_url: string | null;
  alt_text: string;
  is_verified: boolean;
  captured_at: string | null;
}

export interface AdminRoomOption {
  id: string;
  property_id: string;
  name: string;
  slug: string;
}

export interface RoomVerificationBundle {
  badges: PublicVerificationBadgeDto[];
  cloudView: PublicCloudViewVerificationDto | null;
  evidence: PublicVerificationEvidenceDto[];
}

export interface PropertyVerificationBundle {
  badges: PublicVerificationBadgeDto[];
  road: PublicRoadVerificationDto | null;
  cloudVerifiedRoomCount: number;
}
