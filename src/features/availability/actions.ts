"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { inventoryRangeSchema } from "@/features/availability/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function setInventoryRangeAction(formData: FormData) {
  await requireAdminUser();
  const parsed = inventoryRangeSchema.safeParse({
    room_type_id: formData.get("room_type_id"),
    date_from: formData.get("date_from"),
    date_to: formData.get("date_to"),
    available_quantity: formData.get("available_quantity"),
    source: formData.get("source"),
    price_override_vnd: formData.get("price_override_vnd"),
  });
  if (!parsed.success) redirect("/admin/availability?error=invalid");

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/availability?error=config");
  const value = parsed.data;
  const { error } = await supabase.rpc("set_room_inventory_range", {
    target_room_type_id: value.room_type_id,
    date_from: value.date_from,
    date_to: value.date_to,
    target_available_quantity: value.available_quantity,
    target_source: value.source,
    target_price_override_vnd: value.price_override_vnd,
    target_verified_at: null,
  });
  if (error) redirect("/admin/availability?error=inventory-save");

  revalidatePath("/admin/availability");
  revalidatePath("/tim-phong");
  revalidatePath("/homestay/[slug]", "page");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  const query = new URLSearchParams({
    room: value.room_type_id,
    from: value.date_from,
    to: value.date_to,
    saved: "1",
  });
  redirect(`/admin/availability?${query.toString()}`);
}
