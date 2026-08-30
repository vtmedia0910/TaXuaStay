"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { roomTypeSchema } from "@/features/rooms/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveRoomTypeAction(formData: FormData) {
  await requireAdminUser();
  const parsed = roomTypeSchema.safeParse({
    id: formData.get("id"),
    property_id: formData.get("property_id"),
    slug: formData.get("slug"),
    name: formData.get("name"),
    short_description: formData.get("short_description"),
    description: formData.get("description"),
    capacity_adults: formData.get("capacity_adults"),
    capacity_children: formData.get("capacity_children"),
    max_guests: formData.get("max_guests"),
    bed_type: formData.get("bed_type"),
    bed_count: formData.get("bed_count"),
    bathroom_type: formData.get("bathroom_type"),
    quantity: formData.get("quantity"),
    size_m2: formData.get("size_m2"),
    floor_label: formData.get("floor_label"),
    has_private_balcony: formData.get("has_private_balcony"),
    view_type: formData.get("view_type"),
    is_active: formData.get("is_active"),
    publish_status: formData.get("publish_status"),
    amenity_ids: formData.getAll("amenity_ids"),
  });

  if (!parsed.success) redirect("/admin/rooms?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/rooms?error=config");

  const { id, amenity_ids, ...roomValues } = parsed.data;
  const { data, error } = await supabase
    .rpc("save_room_type_with_amenities", {
      target_room_type_id: id ?? null,
      room_type_values: roomValues,
      selected_amenity_ids: amenity_ids,
    })
    .maybeSingle()
    .overrideTypes<{ room_type_id: string }, { merge: false }>();
  if (error || !data) redirect("/admin/rooms?error=room-save");

  revalidatePath("/admin/rooms");
  revalidatePath("/homestay/[slug]", "page");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  revalidatePath("/stay/[slug]", "page");
  revalidatePath("/stay/[slug]/[roomSlug]", "page");
  redirect(`/admin/rooms/${data.room_type_id}/edit?saved=1`);
}
