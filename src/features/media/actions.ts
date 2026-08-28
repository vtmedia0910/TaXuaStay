"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { mediaAssetSchema } from "@/features/media/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function vietnamLocalDateTime(value: string | null) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}+07:00`;
}

export async function saveMediaAssetAction(formData: FormData) {
  await requireAdminUser();
  const parsed = mediaAssetSchema.safeParse({
    id: formData.get("id"),
    property_id: formData.get("property_id"),
    room_type_id: formData.get("room_type_id"),
    media_type: formData.get("media_type"),
    evidence_type: formData.get("evidence_type"),
    url: formData.get("url"),
    thumbnail_url: formData.get("thumbnail_url"),
    caption: formData.get("caption"),
    alt_text: formData.get("alt_text"),
    sort_order: formData.get("sort_order"),
    captured_at: formData.get("captured_at"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    compass_heading_deg: formData.get("compass_heading_deg"),
    horizontal_fov_deg: formData.get("horizontal_fov_deg"),
    is_verified: formData.get("is_verified"),
  });

  if (!parsed.success) redirect("/admin/media?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/media?error=config");

  const { id, captured_at, ...values } = parsed.data;
  const payload = { ...values, captured_at: vietnamLocalDateTime(captured_at) };
  const mutation = id
    ? supabase.from("media_assets").update(payload).eq("id", id)
    : supabase.from("media_assets").insert(payload);
  const { data, error } = await mutation
    .select("id")
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();

  if (error || !data) redirect("/admin/media?error=media-save");
  revalidatePath("/admin/media");
  revalidatePath("/homestay/[slug]", "page");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  redirect(`/admin/media/${data.id}/edit?saved=1`);
}
