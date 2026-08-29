import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { MEDIA_QUERY } from "@/features/media/columns";
import type { PropertyOption } from "@/features/properties/types";
import type { PhysicalRoomOption } from "@/features/physical-rooms/types";
import type { MediaAssetDto, MediaListItem } from "@/features/media/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getPublicMedia(ownerColumn: "property_id" | "room_type_id" | "physical_room_id", ownerId: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("media_assets")
    .select(MEDIA_QUERY)
    .eq(ownerColumn, ownerId)
    .order("sort_order")
    .overrideTypes<MediaAssetDto[], { merge: false }>();

  return error ? [] : data;
}

export function getPublicPropertyMedia(propertyId: string) {
  return getPublicMedia("property_id", propertyId);
}

export function getPublicRoomMedia(roomTypeId: string) {
  return getPublicMedia("room_type_id", roomTypeId);
}

export function getPublicPhysicalRoomMedia(physicalRoomId: string) {
  return getPublicMedia("physical_room_id", physicalRoomId);
}

export async function getAdminMediaAsset(id: string) {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("media_assets")
    .select(MEDIA_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<MediaAssetDto, { merge: false }>();

  return error ? null : data;
}

export async function getAdminMediaAssets(
  properties: PropertyOption[],
  rooms: Array<{ id: string; property_id: string; name: string; slug: string }>,
  physicalRooms: PhysicalRoomOption[],
): Promise<MediaListItem[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("media_assets")
    .select(MEDIA_QUERY)
    .order("updated_at", { ascending: false })
    .overrideTypes<MediaAssetDto[], { merge: false }>();

  if (error) return [];
  const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room.name]));
  const physicalRoomMap = new Map(physicalRooms.map((room) => [
    room.id,
    room.display_name ? `${room.room_code} · ${room.display_name}` : room.room_code,
  ]));

  return data.map((asset) => {
    if (asset.property_id) {
      return { ...asset, owner_kind: "property" as const, owner_name: propertyMap.get(asset.property_id) ?? "Nơi lưu trú không xác định" };
    }
    if (asset.room_type_id) {
      return { ...asset, owner_kind: "room_type" as const, owner_name: roomMap.get(asset.room_type_id) ?? "Loại phòng không xác định" };
    }
    return { ...asset, owner_kind: "physical_room" as const, owner_name: physicalRoomMap.get(asset.physical_room_id ?? "") ?? "Phòng cụ thể không xác định" };
  });
}
