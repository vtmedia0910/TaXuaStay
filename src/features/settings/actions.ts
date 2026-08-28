"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { siteSettingsSchema } from "@/features/settings/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveSiteSettingsAction(formData: FormData) {
  await requireAdminUser(["admin"]);
  const parsed = siteSettingsSchema.safeParse({
    site_name: formData.get("site_name"),
    tagline: formData.get("tagline"),
    hotline: formData.get("hotline"),
    zalo_url: formData.get("zalo_url"),
    facebook_url: formData.get("facebook_url"),
    tiktok_url: formData.get("tiktok_url"),
    address: formData.get("address"),
    google_maps_url: formData.get("google_maps_url"),
    announcement: formData.get("announcement"),
    announcement_enabled: formData.get("announcement_enabled"),
    hero_title: formData.get("hero_title"),
    hero_subtitle: formData.get("hero_subtitle"),
  });

  if (!parsed.success) redirect("/admin/settings?error=invalid");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/settings?error=config");

  const { data, error } = await supabase
    .from("site_settings")
    .update(parsed.data)
    .eq("id", "main")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/admin/settings?error=settings-save");
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
