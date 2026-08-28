"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminUser } from "@/features/admin/auth";
import { propertySchema } from "@/features/properties/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function savePropertyAction(formData: FormData) {
  await requireAdminUser();
  const parsed = propertySchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    property_type: formData.get("property_type"),
    short_description: formData.get("short_description"),
    description: formData.get("description"),
    area_name: formData.get("area_name"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    altitude_m: formData.get("altitude_m"),
    google_maps_url: formData.get("google_maps_url"),
    public_phone: formData.get("public_phone"),
    public_zalo_url: formData.get("public_zalo_url"),
    check_in_time: formData.get("check_in_time"),
    check_out_time: formData.get("check_out_time"),
    road_access_grade: formData.get("road_access_grade"),
    car_access: formData.get("car_access"),
    motorbike_access: formData.get("motorbike_access"),
    parking: formData.get("parking"),
    restaurant: formData.get("restaurant"),
    breakfast: formData.get("breakfast"),
    bbq: formData.get("bbq"),
    wifi: formData.get("wifi"),
    is_featured: formData.get("is_featured"),
    is_active: formData.get("is_active"),
    publish_status: formData.get("publish_status"),
    amenity_ids: formData.getAll("amenity_ids"),
  });

  if (!parsed.success) redirect("/admin/properties?error=invalid");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/properties?error=config");

  const { id, amenity_ids, ...propertyValues } = parsed.data;
  const { data, error } = await supabase
    .rpc("save_property_with_amenities", {
      target_property_id: id ?? null,
      property_values: propertyValues,
      selected_amenity_ids: amenity_ids,
    })
    .maybeSingle()
    .overrideTypes<{ property_id: string; property_slug: string }, { merge: false }>();

  if (error || !data) redirect("/admin/properties?error=property-save");

  revalidatePath("/admin/properties");
  revalidatePath(`/homestay/${data.property_slug}`);
  redirect(`/admin/properties/${data.property_id}/edit?saved=1`);
}

export async function archivePropertyAction(formData: FormData) {
  await requireAdminUser();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/properties?error=invalid");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/properties?error=config");

  const { error } = await supabase
    .from("properties")
    .update({ is_active: false, publish_status: "archived", archived_at: new Date().toISOString() })
    .eq("id", id.data);

  if (error) redirect("/admin/properties?error=property-archive");
  revalidatePath("/admin/properties");
  revalidatePath("/homestay/[slug]", "page");
  redirect("/admin/properties?saved=1");
}
