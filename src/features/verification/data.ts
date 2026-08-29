import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { ROOM_QUALITY_QUERY } from "@/features/room-profiles/columns";
import type { RoomQualityAssessmentDto } from "@/features/room-profiles/types";
import type { PropertyOption } from "@/features/properties/types";
import type { PhysicalRoomOption } from "@/features/physical-rooms/types";
import {
  CLOUD_VIEW_VERIFICATION_QUERY,
  PUBLIC_CLOUD_VIEW_QUERY,
  PUBLIC_ROAD_VERIFICATION_QUERY,
  PUBLIC_VERIFICATION_BADGE_QUERY,
  PUBLIC_VERIFICATION_EVIDENCE_QUERY,
  ROAD_VERIFICATION_QUERY,
  VERIFICATION_EVIDENCE_OPTION_QUERY,
  VERIFICATION_RECORD_QUERY,
} from "@/features/verification/columns";
import { resolveVerificationState } from "@/features/verification/policy";
import type {
  AdminRoomOption,
  AdminVerificationListItem,
  AdminVerificationRecord,
  CloudViewVerificationDto,
  PropertyVerificationBundle,
  PublicCloudViewVerificationDto,
  PublicRoadVerificationDto,
  PublicVerificationBadgeDto,
  PublicVerificationEvidenceDto,
  RoadVerificationDto,
  RoomVerificationBundle,
  VerificationEvidenceDto,
  VerificationEvidenceOption,
  VerificationRecordDto,
} from "@/features/verification/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function emptyRoomBundle(): RoomVerificationBundle {
  return { badges: [], cloudView: null, evidence: [] };
}

export async function getPublicRoomVerificationBundle(roomTypeId: string): Promise<RoomVerificationBundle> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return emptyRoomBundle();

  const [badgesResult, cloudResult] = await Promise.all([
    supabase
      .from("public_verification_badges")
      .select(PUBLIC_VERIFICATION_BADGE_QUERY)
      .eq("room_type_id", roomTypeId)
      .overrideTypes<PublicVerificationBadgeDto[], { merge: false }>(),
    supabase
      .from("public_cloud_view_verifications")
      .select(PUBLIC_CLOUD_VIEW_QUERY)
      .eq("room_type_id", roomTypeId)
      .maybeSingle()
      .overrideTypes<PublicCloudViewVerificationDto, { merge: false }>(),
  ]);

  const badges = badgesResult.error ? [] : (badgesResult.data ?? []);
  const cloudView = cloudResult.error ? null : cloudResult.data;
  const verificationIds = [...new Set([
    ...badges.map((badge) => badge.verification_id),
    ...(cloudView ? [cloudView.verification_id] : []),
  ])];

  if (!verificationIds.length) return { badges, cloudView, evidence: [] };

  const { data: evidence, error } = await supabase
    .from("public_verification_evidence")
    .select(PUBLIC_VERIFICATION_EVIDENCE_QUERY)
    .in("verification_id", verificationIds)
    .overrideTypes<PublicVerificationEvidenceDto[], { merge: false }>();

  return { badges, cloudView, evidence: error ? [] : (evidence ?? []) };
}

export async function getPublicPropertyVerificationBundle(
  propertyId: string,
  roomTypeIds: string[],
): Promise<PropertyVerificationBundle> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { badges: [], road: null, cloudVerifiedRoomCount: 0 };

  const cloudCountRequest = roomTypeIds.length
    ? supabase
      .from("public_cloud_view_verifications")
      .select("verification_id", { count: "exact", head: true })
      .in("room_type_id", roomTypeIds)
    : Promise.resolve({ count: 0, error: null });

  const [badgesResult, roadResult, cloudCountResult] = await Promise.all([
    supabase
      .from("public_verification_badges")
      .select(PUBLIC_VERIFICATION_BADGE_QUERY)
      .eq("property_id", propertyId)
      .overrideTypes<PublicVerificationBadgeDto[], { merge: false }>(),
    supabase
      .from("public_road_verifications")
      .select(PUBLIC_ROAD_VERIFICATION_QUERY)
      .eq("property_id", propertyId)
      .maybeSingle()
      .overrideTypes<PublicRoadVerificationDto, { merge: false }>(),
    cloudCountRequest,
  ]);

  return {
    badges: badgesResult.error ? [] : (badgesResult.data ?? []),
    road: roadResult.error ? null : roadResult.data,
    cloudVerifiedRoomCount: cloudCountResult.error ? 0 : (cloudCountResult.count ?? 0),
  };
}

export async function getPublicSearchVerificationSummaries(
  roomTypeIds: string[],
  propertyIds: string[],
) {
  const supabase = createPublicSupabaseClient();
  if (!supabase || (!roomTypeIds.length && !propertyIds.length)) {
    return { cloudViews: [] as PublicCloudViewVerificationDto[], roads: [] as PublicRoadVerificationDto[] };
  }

  const cloudRequest = roomTypeIds.length
    ? supabase
      .from("public_cloud_view_verifications")
      .select(PUBLIC_CLOUD_VIEW_QUERY)
      .in("room_type_id", roomTypeIds)
      .overrideTypes<PublicCloudViewVerificationDto[], { merge: false }>()
    : Promise.resolve({ data: [] as PublicCloudViewVerificationDto[], error: null });
  const roadRequest = propertyIds.length
    ? supabase
      .from("public_road_verifications")
      .select(PUBLIC_ROAD_VERIFICATION_QUERY)
      .in("property_id", propertyIds)
      .overrideTypes<PublicRoadVerificationDto[], { merge: false }>()
    : Promise.resolve({ data: [] as PublicRoadVerificationDto[], error: null });

  const [cloudResult, roadResult] = await Promise.all([cloudRequest, roadRequest]);
  return {
    cloudViews: cloudResult.error ? [] : (cloudResult.data ?? []),
    roads: roadResult.error ? [] : (roadResult.data ?? []),
  };
}

export async function getAdminVerificationRecords(
  properties: PropertyOption[],
  rooms: AdminRoomOption[],
  physicalRooms: PhysicalRoomOption[],
): Promise<AdminVerificationListItem[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("verification_records")
    .select(VERIFICATION_RECORD_QUERY)
    .order("updated_at", { ascending: false })
    .limit(500)
    .overrideTypes<VerificationRecordDto[], { merge: false }>();

  if (error) return [];
  const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const physicalRoomMap = new Map(physicalRooms.map((room) => [room.id, room]));

  return (data ?? []).map((record) => {
    const room = record.room_type_id ? roomMap.get(record.room_type_id) : null;
    const physicalRoom = record.physical_room_id ? physicalRoomMap.get(record.physical_room_id) : null;
    return {
      ...record,
      target_name: record.property_id
        ? (propertyMap.get(record.property_id) ?? "Nơi lưu trú không xác định")
        : physicalRoom
          ? (physicalRoom.display_name ? `${physicalRoom.room_code} · ${physicalRoom.display_name}` : physicalRoom.room_code)
          : (room?.name ?? "Loại phòng không xác định"),
      property_name: record.property_id
        ? (propertyMap.get(record.property_id) ?? null)
        : physicalRoom
          ? (propertyMap.get(physicalRoom.property_id) ?? null)
          : (room ? (propertyMap.get(room.property_id) ?? null) : null),
      resolved_state: resolveVerificationState(record.status, record.verified_at, record.expires_at),
    };
  });
}

export async function getAdminVerificationRecord(id: string): Promise<AdminVerificationRecord | null> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const [recordResult, cloudResult, roadResult, qualityResult, evidenceResult] = await Promise.all([
    supabase
      .from("verification_records")
      .select(VERIFICATION_RECORD_QUERY)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<VerificationRecordDto, { merge: false }>(),
    supabase
      .from("cloud_view_verifications")
      .select(CLOUD_VIEW_VERIFICATION_QUERY)
      .eq("verification_id", id)
      .maybeSingle()
      .overrideTypes<CloudViewVerificationDto, { merge: false }>(),
    supabase
      .from("road_verifications")
      .select(ROAD_VERIFICATION_QUERY)
      .eq("verification_id", id)
      .maybeSingle()
      .overrideTypes<RoadVerificationDto, { merge: false }>(),
    supabase
      .from("room_quality_assessments")
      .select(ROOM_QUALITY_QUERY)
      .eq("verification_record_id", id)
      .maybeSingle()
      .overrideTypes<RoomQualityAssessmentDto, { merge: false }>(),
    supabase
      .from("verification_evidence")
      .select("verification_id,media_asset_id,evidence_role,public_visible")
      .eq("verification_id", id)
      .overrideTypes<VerificationEvidenceDto[], { merge: false }>(),
  ]);

  if (recordResult.error || !recordResult.data) return null;
  return {
    ...recordResult.data,
    cloud_view: cloudResult.error ? null : cloudResult.data,
    road: roadResult.error ? null : roadResult.data,
    room_quality: qualityResult.error ? null : qualityResult.data,
    evidence_ids: evidenceResult.error ? [] : (evidenceResult.data ?? []).map((item) => item.media_asset_id),
    resolved_state: resolveVerificationState(
      recordResult.data.status,
      recordResult.data.verified_at,
      recordResult.data.expires_at,
    ),
  };
}

export async function getAdminVerificationEvidenceOptions(): Promise<VerificationEvidenceOption[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("media_assets")
    .select(VERIFICATION_EVIDENCE_OPTION_QUERY)
    .order("updated_at", { ascending: false })
    .limit(1000)
    .overrideTypes<VerificationEvidenceOption[], { merge: false }>();

  return error ? [] : (data ?? []);
}
