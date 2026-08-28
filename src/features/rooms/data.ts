import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import type { PropertyOption } from "@/features/properties/types";
import { ADMIN_ROOM_QUERY, PUBLIC_ROOM_QUERY } from "@/features/rooms/columns";
import type {
  PublicRoomTypeDto,
  RoomListItem,
  RoomTypeDto,
} from "@/features/rooms/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublicRoomsByProperty(propertyId: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("room_types")
    .select(PUBLIC_ROOM_QUERY)
    .eq("property_id", propertyId)
    .order("name")
    .overrideTypes<PublicRoomTypeDto[], { merge: false }>();

  return error ? [] : data;
}

export async function getPublicRoom(propertyId: string, slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("room_types")
    .select(PUBLIC_ROOM_QUERY)
    .eq("property_id", propertyId)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<PublicRoomTypeDto, { merge: false }>();

  return error ? null : data;
}

export async function getAdminRoomOptions() {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("room_types")
    .select("id,property_id,name,slug")
    .order("name")
    .overrideTypes<
      Array<{ id: string; property_id: string; name: string; slug: string }>,
      { merge: false }
    >();

  return error ? [] : data;
}

export async function getAdminRoom(id: string) {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const [{ data, error }, { data: assignments }] = await Promise.all([
    supabase
      .from("room_types")
      .select(ADMIN_ROOM_QUERY)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<RoomTypeDto, { merge: false }>(),
    supabase
      .from("room_amenities")
      .select("amenity_id")
      .eq("room_type_id", id)
      .overrideTypes<Array<{ amenity_id: string }>, { merge: false }>(),
  ]);

  if (error || !data) return null;
  return { ...data, amenity_ids: (assignments ?? []).map((item) => item.amenity_id) };
}

export async function getAdminRooms(
  properties: PropertyOption[],
): Promise<RoomListItem[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("room_types")
    .select(ADMIN_ROOM_QUERY)
    .order("updated_at", { ascending: false })
    .overrideTypes<RoomTypeDto[], { merge: false }>();

  if (error || !data.length) return [];
  const ids = data.map((room) => room.id);
  const [{ data: assignments }, { data: media }] = await Promise.all([
    supabase
      .from("room_amenities")
      .select("room_type_id,amenity_id")
      .in("room_type_id", ids)
      .overrideTypes<Array<{ room_type_id: string; amenity_id: string }>, { merge: false }>(),
    supabase
      .from("media_assets")
      .select("id,room_type_id")
      .in("room_type_id", ids)
      .overrideTypes<Array<{ id: string; room_type_id: string | null }>, { merge: false }>(),
  ]);

  const propertyMap = new Map(properties.map((property) => [property.id, property]));
  return data.map((room) => {
    const property = propertyMap.get(room.property_id);
    return {
      ...room,
      property_name: property?.name ?? "Không xác định",
      property_slug: property?.slug ?? "",
      amenity_count: (assignments ?? []).filter((item) => item.room_type_id === room.id).length,
      media_count: (media ?? []).filter((asset) => asset.room_type_id === room.id).length,
    };
  });
}
