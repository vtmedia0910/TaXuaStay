"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { physicalRoomSchema } from "@/features/physical-rooms/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function savePhysicalRoomAction(formData: FormData) {
  await requireAdminUser();
  const parsed = physicalRoomSchema.safeParse({
    id: formData.get("id"),
    property_id: formData.get("property_id"),
    room_type_id: formData.get("room_type_id"),
    room_code: formData.get("room_code"),
    display_name: formData.get("display_name"),
    floor_label: formData.get("floor_label"),
    unit_label: formData.get("unit_label"),
    position_notes: formData.get("position_notes"),
    exact_room_bookable: formData.get("exact_room_bookable"),
    is_active: formData.get("is_active"),
    publish_status: formData.get("publish_status"),
  });

  if (!parsed.success) redirect("/admin/physical-rooms?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/physical-rooms?error=config");

  const { id, ...input } = parsed.data;
  const archived = input.publish_status === "archived";
  const values = {
    ...input,
    is_active: archived ? false : input.is_active,
    archived_at: archived ? new Date().toISOString() : null,
  };
  const mutation = id
    ? supabase.from("physical_rooms").update(values).eq("id", id)
    : supabase.from("physical_rooms").insert(values);
  const { data, error } = await mutation
    .select("id")
    .maybeSingle()
    .overrideTypes<{ id: string }, { merge: false }>();

  if (error || !data) redirect("/admin/physical-rooms?error=physical-room-save");
  revalidatePath("/admin/physical-rooms");
  revalidatePath("/admin/media");
  revalidatePath("/admin/verification");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  redirect(`/admin/physical-rooms/${data.id}/edit?saved=1`);
}
