import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { ADMIN_AMENITY_QUERY, PUBLIC_AMENITY_QUERY } from "@/features/amenities/columns";
import type { AmenityDto, PublicAmenityDto } from "@/features/amenities/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getPublicAmenities(
  joinTable: "property_amenities" | "room_amenities",
  ownerColumn: "property_id" | "room_type_id",
  ownerId: string,
) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(joinTable)
    .select(`amenity:amenities(${PUBLIC_AMENITY_QUERY})`)
    .eq(ownerColumn, ownerId)
    .overrideTypes<Array<{ amenity: PublicAmenityDto | null }>, { merge: false }>();

  if (error) return [];
  return data
    .map((item) => item.amenity)
    .filter((amenity): amenity is PublicAmenityDto => amenity !== null)
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name));
}

export function getPublicPropertyAmenities(propertyId: string) {
  return getPublicAmenities("property_amenities", "property_id", propertyId);
}

export function getPublicRoomAmenities(roomTypeId: string) {
  return getPublicAmenities("room_amenities", "room_type_id", roomTypeId);
}

export async function getAdminAmenities(): Promise<AmenityDto[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("amenities")
    .select(ADMIN_AMENITY_QUERY)
    .order("category")
    .order("sort_order")
    .order("name")
    .overrideTypes<AmenityDto[], { merge: false }>();

  return error ? [] : data;
}

export async function getAdminAmenity(id: string) {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("amenities")
    .select(ADMIN_AMENITY_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<AmenityDto, { merge: false }>();

  return error ? null : data;
}
