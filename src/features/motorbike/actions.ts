"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { motorbikeOfferingSchema } from "@/features/motorbike/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const adminPath = "/admin/motorbike";

function vietnamLocalDateTime(value: string | null) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}+07:00`;
}

function formValues(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const sourceKey = typeof raw.source_key === "string" ? raw.source_key : "";
  const [supplierId = "", externalRefId = ""] = sourceKey.split(":");
  return {
    ...raw,
    supplier_id: raw.supplier_id || supplierId,
    source_external_ref_id: raw.source_external_ref_id || externalRefId,
  };
}

export async function saveMotorbikeOfferingAction(formData: FormData) {
  await requireAdminUser(["admin"], `${adminPath}?error=motorbike-forbidden`);
  const parsed = motorbikeOfferingSchema.safeParse(formValues(formData));
  if (!parsed.success) redirect(`${adminPath}?error=motorbike-invalid`);
  const client = await createServerSupabaseClient();
  if (!client) redirect(`${adminPath}?error=config`);
  const value = parsed.data;
  const { data, error } = await client.rpc("save_motorbike_offering", {
    target_offering_id: value.id,
    target_supplier_id: value.supplier_id,
    target_external_ref_id: value.source_external_ref_id,
    target_slug: value.slug,
    target_display_name: value.display_name,
    target_vehicle_category: value.vehicle_category,
    target_transmission_type: value.transmission_type,
    target_engine_class_cc: value.engine_class_cc,
    target_suitable_for: value.suitable_for,
    target_helmet_status: value.helmet_status,
    target_pickup_summary: value.pickup_summary,
    target_return_summary: value.return_summary,
    target_public_description: value.public_description,
    target_image_media_id: value.image_media_id,
    target_public_price_vnd: value.public_price_vnd,
    target_price_source: value.price_source,
    target_price_checked_at: vietnamLocalDateTime(value.price_checked_at),
    target_price_valid_until: value.price_valid_until,
    target_availability_state: value.availability_state,
    target_public_request_url: value.public_request_url,
    target_source_checked_at: vietnamLocalDateTime(value.source_checked_at),
    target_publication_status: value.publication_status,
    target_sort_order: value.sort_order,
    target_internal_notes: value.internal_notes,
  });
  const savedId = typeof data === "string" ? data : value.id;
  if (error || !savedId) redirect(`${adminPath}?error=motorbike-save`);
  revalidatePath(adminPath);
  revalidatePath("/motorbike");
  revalidatePath("/motorbike/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  redirect(`${adminPath}/${savedId}/edit?saved=motorbike`);
}
