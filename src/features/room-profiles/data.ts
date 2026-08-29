import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import {
  PUBLIC_ROOM_QUALITY_QUERY,
  PUBLIC_ROOM_PROFILE_NOTE_QUERY,
  ROOM_PROFILE_NOTE_QUERY,
} from "@/features/room-profiles/columns";
import type {
  AdminRoomProfileNote,
  PublicRoomProfileNoteDto,
  PublicRoomQualityAssessmentDto,
  RoomProfileNoteDto,
  VerifiedRoomProfileBundle,
} from "@/features/room-profiles/types";
import {
  PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY,
} from "@/features/physical-rooms/columns";
import type {
  PhysicalRoomOption,
  PublicVerifiedPhysicalRoomDto,
} from "@/features/physical-rooms/types";
import type { PropertyOption } from "@/features/properties/types";
import {
  PUBLIC_CLOUD_VIEW_QUERY,
  PUBLIC_VERIFICATION_BADGE_QUERY,
  PUBLIC_VERIFICATION_EVIDENCE_QUERY,
} from "@/features/verification/columns";
import type {
  AdminRoomOption,
  PublicCloudViewVerificationDto,
  PublicVerificationBadgeDto,
  PublicVerificationEvidenceDto,
} from "@/features/verification/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const emptyPublicBundle: VerifiedRoomProfileBundle = {
  roomTypeQuality: null,
  roomTypeNotes: [],
  exactRooms: [],
};

export async function getPublicVerifiedRoomProfileBundle(
  roomTypeId: string,
): Promise<VerifiedRoomProfileBundle> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return emptyPublicBundle;

  const [exactRoomsResult, roomQualityResult, roomNotesResult] = await Promise.all([
    supabase
      .from("public_verified_physical_rooms")
      .select(PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY)
      .eq("room_type_id", roomTypeId)
      .order("room_code")
      .overrideTypes<PublicVerifiedPhysicalRoomDto[], { merge: false }>(),
    supabase
      .from("public_room_quality_assessments")
      .select(PUBLIC_ROOM_QUALITY_QUERY)
      .eq("room_type_id", roomTypeId)
      .maybeSingle()
      .overrideTypes<PublicRoomQualityAssessmentDto, { merge: false }>(),
    supabase
      .from("public_room_profile_notes")
      .select(PUBLIC_ROOM_PROFILE_NOTE_QUERY)
      .eq("room_type_id", roomTypeId)
      .order("sort_order")
      .order("id")
      .overrideTypes<PublicRoomProfileNoteDto[], { merge: false }>(),
  ]);

  const exactRooms = exactRoomsResult.error ? [] : (exactRoomsResult.data ?? []);
  const physicalRoomIds = exactRooms.map((room) => room.physical_room_id);
  if (!physicalRoomIds.length) {
    return {
      roomTypeQuality: roomQualityResult.error ? null : roomQualityResult.data,
      roomTypeNotes: roomNotesResult.error ? [] : (roomNotesResult.data ?? []),
      exactRooms: [],
    };
  }

  const [badgesResult, cloudResult, qualityResult, notesResult] = await Promise.all([
    supabase
      .from("public_verification_badges")
      .select(PUBLIC_VERIFICATION_BADGE_QUERY)
      .in("physical_room_id", physicalRoomIds)
      .overrideTypes<PublicVerificationBadgeDto[], { merge: false }>(),
    supabase
      .from("public_cloud_view_verifications")
      .select(PUBLIC_CLOUD_VIEW_QUERY)
      .in("physical_room_id", physicalRoomIds)
      .overrideTypes<PublicCloudViewVerificationDto[], { merge: false }>(),
    supabase
      .from("public_room_quality_assessments")
      .select(PUBLIC_ROOM_QUALITY_QUERY)
      .in("physical_room_id", physicalRoomIds)
      .overrideTypes<PublicRoomQualityAssessmentDto[], { merge: false }>(),
    supabase
      .from("public_room_profile_notes")
      .select(PUBLIC_ROOM_PROFILE_NOTE_QUERY)
      .in("physical_room_id", physicalRoomIds)
      .order("sort_order")
      .order("id")
      .overrideTypes<PublicRoomProfileNoteDto[], { merge: false }>(),
  ]);

  const badges = badgesResult.error ? [] : (badgesResult.data ?? []);
  const cloudViews = cloudResult.error ? [] : (cloudResult.data ?? []);
  const quality = qualityResult.error ? [] : (qualityResult.data ?? []);
  const notes = notesResult.error ? [] : (notesResult.data ?? []);
  const verificationIds = [...new Set([
    ...exactRooms.map((room) => room.room_verification_id),
    ...badges.map((badge) => badge.verification_id),
    ...cloudViews.map((cloud) => cloud.verification_id),
    ...quality.map((assessment) => assessment.verification_record_id),
  ])];

  const evidenceResult = verificationIds.length
    ? await supabase
      .from("public_verification_evidence")
      .select(PUBLIC_VERIFICATION_EVIDENCE_QUERY)
      .in("verification_id", verificationIds)
      .overrideTypes<PublicVerificationEvidenceDto[], { merge: false }>()
    : { data: [] as PublicVerificationEvidenceDto[], error: null };
  const evidence = evidenceResult.error ? [] : (evidenceResult.data ?? []);

  return {
    roomTypeQuality: roomQualityResult.error ? null : roomQualityResult.data,
    roomTypeNotes: roomNotesResult.error ? [] : (roomNotesResult.data ?? []),
    exactRooms: exactRooms.map((room) => {
      const roomBadges = badges.filter((badge) => badge.physical_room_id === room.physical_room_id);
      const roomCloud = cloudViews.find((cloud) => cloud.physical_room_id === room.physical_room_id) ?? null;
      const roomQuality = quality.find((assessment) => assessment.physical_room_id === room.physical_room_id) ?? null;
      const roomVerificationIds = new Set([
        room.room_verification_id,
        ...roomBadges.map((badge) => badge.verification_id),
        ...(roomCloud ? [roomCloud.verification_id] : []),
        ...(roomQuality ? [roomQuality.verification_record_id] : []),
      ]);
      return {
        room,
        badges: roomBadges,
        cloudView: roomCloud,
        quality: roomQuality,
        notes: notes.filter((note) => note.physical_room_id === room.physical_room_id),
        evidence: evidence.filter((asset) => roomVerificationIds.has(asset.verification_id)),
      };
    }),
  };
}

export async function getAdminRoomProfileNote(id: string): Promise<RoomProfileNoteDto | null> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("room_profile_notes")
    .select(ROOM_PROFILE_NOTE_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RoomProfileNoteDto, { merge: false }>();
  return error ? null : data;
}

export async function getAdminRoomProfileNotes(
  properties: PropertyOption[],
  rooms: AdminRoomOption[],
  physicalRooms: PhysicalRoomOption[],
): Promise<AdminRoomProfileNote[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_profile_notes")
    .select(ROOM_PROFILE_NOTE_QUERY)
    .order("updated_at", { ascending: false })
    .limit(1000)
    .overrideTypes<RoomProfileNoteDto[], { merge: false }>();
  if (error) return [];

  const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const physicalRoomMap = new Map(physicalRooms.map((room) => [room.id, room]));

  return data.map((note) => {
    const room = note.room_type_id ? roomMap.get(note.room_type_id) : null;
    const physicalRoom = note.physical_room_id ? physicalRoomMap.get(note.physical_room_id) : null;
    return {
      ...note,
      target_name: physicalRoom
        ? `${physicalRoom.room_code}${physicalRoom.display_name ? ` · ${physicalRoom.display_name}` : ""}`
        : (room?.name ?? "Loại phòng không xác định"),
      property_name: physicalRoom
        ? (propertyMap.get(physicalRoom.property_id) ?? "Nơi lưu trú không xác định")
        : (propertyMap.get(room?.property_id ?? "") ?? "Nơi lưu trú không xác định"),
    };
  });
}
