import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { MEDIA_QUERY } from "@/features/media/columns";
import type { PropertyOption } from "@/features/properties/types";
import type { MediaAssetDto, MediaListItem } from "@/features/media/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getPublicMedia(ownerColumn: "property_id" | "room_type_id", ownerId: string) {
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

  return data.map((asset) => ({
    ...asset,
    owner_kind: asset.property_id ? "property" : "room",
    owner_name: asset.property_id
      ? (propertyMap.get(asset.property_id) ?? "Nơi lưu trú không xác định")
      : (roomMap.get(asset.room_type_id ?? "") ?? "Phòng không xác định"),
  }));
}
