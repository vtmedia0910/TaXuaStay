import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import {
  ADMIN_PHYSICAL_ROOM_QUERY,
  PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY,
} from "@/features/physical-rooms/columns";
import type {
  PhysicalRoomDto,
  PhysicalRoomListItem,
  PhysicalRoomOption,
  PublicVerifiedPhysicalRoomDto,
} from "@/features/physical-rooms/types";
import type { PropertyOption } from "@/features/properties/types";
import type { AdminRoomOption } from "@/features/verification/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublicVerifiedPhysicalRoomsByRoomType(
  roomTypeId: string,
): Promise<PublicVerifiedPhysicalRoomDto[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("public_verified_physical_rooms")
    .select(PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY)
    .eq("room_type_id", roomTypeId)
    .order("room_code")
    .overrideTypes<PublicVerifiedPhysicalRoomDto[], { merge: false }>();

  return error ? [] : data;
}
export async function getAdminPhysicalRoomOptions(): Promise<PhysicalRoomOption[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("physical_rooms")
    .select("id,property_id,room_type_id,room_code,display_name")
    .order("room_code")
    .overrideTypes<PhysicalRoomOption[], { merge: false }>();

  return error ? [] : data;
}

export async function getAdminPhysicalRoom(id: string) {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("physical_rooms")
    .select(ADMIN_PHYSICAL_ROOM_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<PhysicalRoomDto, { merge: false }>();

  return error ? null : data;
}

export async function getAdminPhysicalRooms(
  properties: PropertyOption[],
  rooms: AdminRoomOption[],
): Promise<PhysicalRoomListItem[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("physical_rooms")
    .select(ADMIN_PHYSICAL_ROOM_QUERY)
    .order("updated_at", { ascending: false })
    .overrideTypes<PhysicalRoomDto[], { merge: false }>();

  if (error || !data.length) return [];
  const ids = data.map((room) => room.id);
  const [{ data: media }, { data: verifications }] = await Promise.all([
    supabase
      .from("media_assets")
      .select("id,physical_room_id")
      .in("physical_room_id", ids)
      .overrideTypes<Array<{ id: string; physical_room_id: string | null }>, { merge: false }>(),
    supabase
      .from("verification_records")
      .select("id,physical_room_id")
      .in("physical_room_id", ids)
      .overrideTypes<Array<{ id: string; physical_room_id: string | null }>, { merge: false }>(),
  ]);
  const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room.name]));

  return data.map((room) => ({
    ...room,
    property_name: propertyMap.get(room.property_id) ?? "Nơi lưu trú không xác định",
    room_type_name: roomMap.get(room.room_type_id) ?? "Loại phòng không xác định",
    media_count: (media ?? []).filter((item) => item.physical_room_id === room.id).length,
    verification_count: (verifications ?? []).filter((item) => item.physical_room_id === room.id).length,
  }));
}
