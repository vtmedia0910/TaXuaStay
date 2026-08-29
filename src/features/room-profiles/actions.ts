"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { roomProfileNoteSchema } from "@/features/room-profiles/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveRoomProfileNoteAction(formData: FormData) {
  await requireAdminUser();
  const parsed = roomProfileNoteSchema.safeParse({
    id: formData.get("id"),
    room_type_id: formData.get("room_type_id"),
    physical_room_id: formData.get("physical_room_id"),
    note_type: formData.get("note_type"),
    category: formData.get("category"),
    text: formData.get("text"),
    sort_order: formData.get("sort_order"),
    is_public: formData.get("is_public"),
  });
  if (!parsed.success) redirect("/admin/room-profiles?error=room-profile-note-save");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/room-profiles?error=config");

  const value = parsed.data;
  const mutation = value.id
    ? supabase
      .from("room_profile_notes")
      .update({
        room_type_id: value.room_type_id,
        physical_room_id: value.physical_room_id,
        note_type: value.note_type,
        category: value.category,
        text: value.text,
        sort_order: value.sort_order,
        is_public: value.is_public,
      })
      .eq("id", value.id)
      .select("id")
      .single()
    : supabase
      .from("room_profile_notes")
      .insert({
        room_type_id: value.room_type_id,
        physical_room_id: value.physical_room_id,
        note_type: value.note_type,
        category: value.category,
        text: value.text,
        sort_order: value.sort_order,
        is_public: value.is_public,
      })
      .select("id")
      .single();
  const { data, error } = await mutation.overrideTypes<{ id: string }, { merge: false }>();
  if (error || !data) redirect("/admin/room-profiles?error=room-profile-note-save");

  revalidatePath("/admin/room-profiles");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  redirect(`/admin/room-profiles/notes/${data.id}/edit?saved=1`);
}
