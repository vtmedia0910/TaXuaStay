"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { amenitySchema } from "@/features/amenities/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveAmenityAction(formData: FormData) {
  await requireAdminUser();
  const parsed = amenitySchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    category: formData.get("category"),
    icon_key: formData.get("icon_key"),
    description: formData.get("description"),
    is_active: formData.get("is_active"),
    sort_order: formData.get("sort_order"),
  });

  if (!parsed.success) redirect("/admin/amenities?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/amenities?error=config");

  const { id, ...values } = parsed.data;
  const mutation = id
    ? supabase.from("amenities").update(values).eq("id", id)
    : supabase.from("amenities").insert(values);
  const { data, error } = await mutation
    .select("id")
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();

  if (error || !data) redirect("/admin/amenities?error=amenity-save");
  revalidatePath("/admin/amenities");
  revalidatePath("/homestay/[slug]", "page");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  revalidatePath("/stay/[slug]", "page");
  revalidatePath("/stay/[slug]/[roomSlug]", "page");
  redirect(`/admin/amenities/${data.id}/edit?saved=1`);
}
