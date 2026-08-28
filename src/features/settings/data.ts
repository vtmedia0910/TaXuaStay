import "server-only";

import { SITE } from "@/config/site";
import { requireAdminUser } from "@/features/admin/auth";
import { PUBLIC_SITE_SETTINGS_QUERY } from "@/features/settings/columns";
import type { PublicSiteSettings } from "@/features/settings/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const DEFAULT_SITE_SETTINGS: PublicSiteSettings = {
  id: "main",
  site_name: SITE.name,
  tagline: SITE.tagline,
  hotline: null,
  zalo_url: null,
  facebook_url: null,
  tiktok_url: null,
  address: null,
  google_maps_url: null,
  announcement: null,
  announcement_enabled: false,
  hero_title: "Tìm chỗ ở Tà Xùa rõ ràng hơn",
  hero_subtitle: SITE.description,
  updated_at: null,
};

async function readSiteSettings(
  client:
    | ReturnType<typeof createPublicSupabaseClient>
    | Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  if (!client) return null;

  const { data, error } = await client
    .from("site_settings")
    .select(PUBLIC_SITE_SETTINGS_QUERY)
    .eq("id", "main")
    .maybeSingle()
    .overrideTypes<PublicSiteSettings, { merge: false }>();

  if (error || !data) return null;
  return data;
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  const settings = await readSiteSettings(createPublicSupabaseClient());
  return settings ?? DEFAULT_SITE_SETTINGS;
}

export async function getAdminSiteSettings() {
  await requireAdminUser(["admin"]);
  return readSiteSettings(await createServerSupabaseClient());
}
