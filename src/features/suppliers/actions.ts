"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import {
  partnerRelationshipSchema,
  supplierContactSchema,
  supplierExternalRefSchema,
  supplierIdSchema,
  supplierProfileSchema,
  supplierPropertySchema,
} from "@/features/suppliers/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const suppliersPath = "/admin/suppliers";
const supplierPath = (id: string) => `${suppliersPath}/${id}/edit`;

function revalidateSupplierAdmin(id?: string) {
  revalidatePath(suppliersPath);
  if (id) revalidatePath(supplierPath(id));
  revalidatePath("/admin/properties/[id]/edit", "page");
}

export async function saveSupplierAction(formData: FormData) {
  await requireAdminUser(["admin"], `${suppliersPath}?error=forbidden`);
  const parsed = supplierProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${suppliersPath}?error=supplier-invalid`);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${suppliersPath}?error=config`);

  const value = parsed.data;
  const { data, error } = await supabase.rpc("save_supplier_profile_v2", {
    target_supplier_id: value.id,
    target_supplier_code: value.supplier_code,
    target_supplier_type: value.supplier_type,
    target_display_name: value.display_name,
    target_legal_name: value.legal_name,
    target_status: value.status,
    target_tax_code: value.tax_code,
    target_website_url: value.website_url,
    target_internal_notes: value.internal_notes,
    primary_contact_id: value.primary_contact_id,
    primary_contact_name: value.primary_contact_name,
    primary_contact_type: value.primary_contact_type,
    primary_role_title: value.primary_role_title,
    primary_phone: value.primary_phone,
    primary_email: value.primary_email,
    primary_zalo: value.primary_zalo,
    primary_notes_internal: value.primary_notes_internal,
  });
  const savedId = typeof data === "string" ? data : value.id;
  if (error || !savedId) redirect(`${suppliersPath}?error=supplier-save`);
  revalidateSupplierAdmin(savedId);
  redirect(`${supplierPath(savedId)}?saved=supplier`);
}

export async function saveSupplierContactAction(formData: FormData) {
  const fallbackId = supplierIdSchema.safeParse(formData.get("supplier_id"));
  const returnPath = fallbackId.success ? supplierPath(fallbackId.data) : suppliersPath;
  await requireAdminUser(["admin", "staff"], `${returnPath}?error=unauthorized`);
  const parsed = supplierContactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${returnPath}?error=supplier-contact-invalid`);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${returnPath}?error=config`);
  const value = parsed.data;
  const { error } = await supabase.rpc("save_supplier_contact", {
    target_contact_id: value.id,
    target_supplier_id: value.supplier_id,
    target_contact_name: value.contact_name,
    target_contact_type: value.contact_type,
    target_role_title: value.role_title,
    target_phone: value.phone,
    target_email: value.email,
    target_zalo: value.zalo,
    target_notes_internal: value.notes_internal,
    target_is_primary: value.is_primary,
    target_is_active: value.is_active,
  });
  if (error) redirect(`${returnPath}?error=supplier-contact-save`);
  revalidateSupplierAdmin(value.supplier_id);
  redirect(`${returnPath}?saved=contact#contacts`);
}

export async function saveSupplierPropertyAction(formData: FormData) {
  const fallbackId = supplierIdSchema.safeParse(formData.get("supplier_id"));
  const returnPath = fallbackId.success ? supplierPath(fallbackId.data) : suppliersPath;
  await requireAdminUser(["admin", "staff"], `${returnPath}?error=unauthorized`);
  const parsed = supplierPropertySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${returnPath}?error=supplier-property-invalid`);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${returnPath}?error=config`);
  const value = parsed.data;
  const { error } = await supabase.rpc("save_supplier_property_link", {
    target_link_id: value.id,
    target_supplier_id: value.supplier_id,
    target_property_id: value.property_id,
    target_relationship_type: value.relationship_type,
    target_is_primary: value.is_primary,
    target_valid_from: value.valid_from,
    target_valid_until: value.valid_until,
    target_notes_internal: value.notes_internal,
  });
  if (error) redirect(`${returnPath}?error=supplier-property-save`);
  revalidateSupplierAdmin(value.supplier_id);
  redirect(`${returnPath}?saved=property#properties`);
}

export async function savePartnerRelationshipAction(formData: FormData) {
  const fallbackId = supplierIdSchema.safeParse(formData.get("supplier_id"));
  const returnPath = fallbackId.success ? supplierPath(fallbackId.data) : suppliersPath;
  await requireAdminUser(["admin"], `${returnPath}?error=partner-forbidden`);
  const parsed = partnerRelationshipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${returnPath}?error=partner-invalid`);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${returnPath}?error=config`);
  const value = parsed.data;
  const { error } = await supabase.rpc("save_partner_relationship", {
    target_relationship_id: value.id,
    target_supplier_id: value.supplier_id,
    target_status: value.status,
    target_tier: value.tier,
    target_started_at: value.started_at,
    target_reviewed_at: value.reviewed_at,
    target_valid_until: value.valid_until,
    target_ended_at: value.ended_at,
    target_notes_internal: value.relationship_notes_internal,
  });
  if (error) redirect(`${returnPath}?error=partner-save`);
  revalidateSupplierAdmin(value.supplier_id);
  redirect(`${returnPath}?saved=partner#partner`);
}

export async function saveSupplierExternalRefAction(formData: FormData) {
  const fallbackId = supplierIdSchema.safeParse(formData.get("supplier_id"));
  const returnPath = fallbackId.success ? supplierPath(fallbackId.data) : suppliersPath;
  await requireAdminUser(["admin"], `${returnPath}?error=partner-forbidden`);
  const parsed = supplierExternalRefSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${returnPath}?error=supplier-ref-invalid`);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${returnPath}?error=config`);
  const value = parsed.data;
  const { error } = await supabase.rpc("save_supplier_external_ref", {
    target_external_ref_id: value.id,
    target_supplier_id: value.supplier_id,
    target_system_key: value.system_key,
    target_external_reference: value.external_reference,
    target_metadata: value.metadata,
    target_is_active: value.is_active,
  });
  if (error) redirect(`${returnPath}?error=supplier-ref-save`);
  revalidateSupplierAdmin(value.supplier_id);
  redirect(`${returnPath}?saved=reference#references`);
}

export async function archiveSupplierAction(formData: FormData) {
  const parsed = supplierIdSchema.safeParse(formData.get("id"));
  const returnPath = parsed.success ? supplierPath(parsed.data) : suppliersPath;
  await requireAdminUser(["admin"], `${returnPath}?error=forbidden`);
  if (!parsed.success) redirect(`${suppliersPath}?error=supplier-invalid`);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${returnPath}?error=config`);
  const { error } = await supabase.rpc("archive_supplier", { target_supplier_id: parsed.data });
  if (error) redirect(`${returnPath}?error=supplier-archive`);
  revalidateSupplierAdmin(parsed.data);
  redirect(`${returnPath}?saved=archived`);
}
