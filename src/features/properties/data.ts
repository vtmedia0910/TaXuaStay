import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { ADMIN_PROPERTY_QUERY, PUBLIC_PROPERTY_QUERY } from "@/features/properties/columns";
import type {
  PropertyDto,
  PropertyListItem,
  PropertyOption,
  PublicPropertyDto,
} from "@/features/properties/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublicPropertyBySlug(slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("properties")
    .select(PUBLIC_PROPERTY_QUERY)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<PublicPropertyDto, { merge: false }>();

  return error ? null : data;
}

export async function getAdminPropertyOptions(): Promise<PropertyOption[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("properties")
    .select("id,name,slug")
    .order("name")
    .overrideTypes<PropertyOption[], { merge: false }>();

  return error ? [] : data;
}

export async function getAdminProperty(id: string) {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const [{ data, error }, { data: assignments }] = await Promise.all([
    supabase
      .from("properties")
      .select(ADMIN_PROPERTY_QUERY)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<PropertyDto, { merge: false }>(),
    supabase
      .from("property_amenities")
      .select("amenity_id")
      .eq("property_id", id)
      .overrideTypes<Array<{ amenity_id: string }>, { merge: false }>(),
  ]);

  if (error || !data) return null;
  return { ...data, amenity_ids: (assignments ?? []).map((item) => item.amenity_id) };
}

export async function getAdminProperties(): Promise<PropertyListItem[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("properties")
    .select(ADMIN_PROPERTY_QUERY)
    .order("updated_at", { ascending: false })
    .overrideTypes<PropertyDto[], { merge: false }>();

  if (error || !data.length) return [];
  const ids = data.map((property) => property.id);
  const [{ data: rooms }, { data: media }] = await Promise.all([
    supabase
      .from("room_types")
      .select("id,property_id")
      .in("property_id", ids)
      .overrideTypes<Array<{ id: string; property_id: string }>, { merge: false }>(),
    supabase
      .from("media_assets")
      .select("id,property_id")
      .in("property_id", ids)
      .overrideTypes<Array<{ id: string; property_id: string | null }>, { merge: false }>(),
  ]);

  return data.map((property) => ({
    ...property,
    room_count: (rooms ?? []).filter((room) => room.property_id === property.id).length,
    media_count: (media ?? []).filter((asset) => asset.property_id === property.id).length,
  }));
}
