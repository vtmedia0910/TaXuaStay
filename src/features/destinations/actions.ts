"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { destinationSchema } from "@/features/destinations/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveDestinationAction(formData: FormData) {
  await requireAdminUser();
  const parsed = destinationSchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    short_name: formData.get("short_name"),
    province: formData.get("province"),
    country_code: formData.get("country_code"),
    timezone: formData.get("timezone"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    altitude_reference_m: formData.get("altitude_reference_m"),
    description: formData.get("description"),
    is_active: formData.get("is_active"),
    publish_status: formData.get("publish_status"),
  });

  if (!parsed.success) redirect("/admin/destinations?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/destinations?error=config");

  const { id, ...input } = parsed.data;
  const values = {
    ...input,
    is_active: input.publish_status === "archived" ? false : input.is_active,
  };
  const mutation = id
    ? supabase.from("destinations").update(values).eq("id", id)
    : supabase.from("destinations").insert(values);
  const { data, error } = await mutation
    .select("id")
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();

  if (error || !data) redirect("/admin/destinations?error=destination-save");
  revalidatePath("/admin/destinations");
  revalidatePath("/homestay/[slug]", "page");
  revalidatePath("/stay/[slug]", "page");
  redirect(`/admin/destinations/${data.id}/edit?saved=1`);
}
