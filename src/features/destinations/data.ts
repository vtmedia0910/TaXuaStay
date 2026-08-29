import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import {
  ADMIN_DESTINATION_QUERY,
  PUBLIC_DESTINATION_QUERY,
} from "@/features/destinations/columns";
import type {
  DestinationDto,
  DestinationOption,
  PublicDestinationDto,
} from "@/features/destinations/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublicDestinationBySlug(slug: string) {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("destinations")
    .select(PUBLIC_DESTINATION_QUERY)
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<PublicDestinationDto, { merge: false }>();

  return error ? null : data;
}
export async function getAdminDestinationOptions(): Promise<DestinationOption[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("destinations")
    .select("id,slug,name")
    .order("name")
    .overrideTypes<DestinationOption[], { merge: false }>();

  return error ? [] : data;
}

export async function getAdminDestination(id: string) {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("destinations")
    .select(ADMIN_DESTINATION_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<DestinationDto, { merge: false }>();

  return error ? null : data;
}

export async function getAdminDestinations(): Promise<DestinationDto[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("destinations")
    .select(ADMIN_DESTINATION_QUERY)
    .order("updated_at", { ascending: false })
    .overrideTypes<DestinationDto[], { merge: false }>();

  return error ? [] : data;
}
