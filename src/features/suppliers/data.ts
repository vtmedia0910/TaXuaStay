import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import {
  PARTNER_RELATIONSHIP_QUERY,
  SUPPLIER_CONTACT_QUERY,
  SUPPLIER_EXTERNAL_REF_QUERY,
  SUPPLIER_PROPERTY_QUERY,
  SUPPLIER_QUERY,
} from "@/features/suppliers/columns";
import type {
  PartnerRelationshipDto,
  PropertySupplierSummary,
  SupplierContactDto,
  SupplierDetail,
  SupplierDto,
  SupplierExternalRefDto,
  SupplierListItem,
  SupplierPropertyDto,
} from "@/features/suppliers/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface SupplierFilters {
  query: string;
  type: string;
  status: string;
  partner: string;
}

function currentRelationship(relationship: PartnerRelationshipDto) {
  return relationship.status !== "ended";
}

export async function getAdminSuppliers(filters: SupplierFilters): Promise<SupplierListItem[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select(SUPPLIER_QUERY)
    .order("updated_at", { ascending: false })
    .overrideTypes<SupplierDto[], { merge: false }>();
  if (error || !suppliers.length) return [];

  const supplierIds = suppliers.map((supplier) => supplier.id);
  const [{ data: contacts }, { data: propertyLinks }, { data: partners }] = await Promise.all([
    supabase.from("supplier_contacts").select(SUPPLIER_CONTACT_QUERY).in("supplier_id", supplierIds)
      .overrideTypes<SupplierContactDto[], { merge: false }>(),
    supabase.from("supplier_properties").select(SUPPLIER_PROPERTY_QUERY).in("supplier_id", supplierIds)
      .overrideTypes<SupplierPropertyDto[], { merge: false }>(),
    supabase.from("partner_relationships").select(PARTNER_RELATIONSHIP_QUERY).in("supplier_id", supplierIds)
      .overrideTypes<PartnerRelationshipDto[], { merge: false }>(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const query = filters.query.toLocaleLowerCase("vi");
  return suppliers
    .map((supplier) => {
      const primaryContact = (contacts ?? []).find(
        (contact) => contact.supplier_id === supplier.id && contact.is_primary && contact.is_active,
      ) ?? null;
      const supplierLinks = (propertyLinks ?? []).filter((link) => link.supplier_id === supplier.id);
      const relationship = (partners ?? []).find(
        (partner) => partner.supplier_id === supplier.id && currentRelationship(partner),
      ) ?? null;
      const warnings: string[] = [];
      if (supplier.status === "active" && !primaryContact) warnings.push("Thiếu liên hệ chính");
      if (relationship?.status === "active" && relationship.valid_until && relationship.valid_until < today) {
        warnings.push("Quan hệ đối tác đã hết hiệu lực");
      }
      return {
        ...supplier,
        primary_contact: primaryContact,
        linked_property_count: supplierLinks.filter((link) => !link.valid_until || link.valid_until >= today).length,
        partner_status: relationship?.status ?? null,
        partner_tier: relationship?.tier ?? null,
        warnings,
      };
    })
    .filter((supplier) => {
      if (query && !`${supplier.supplier_code} ${supplier.display_name} ${supplier.legal_name ?? ""}`.toLocaleLowerCase("vi").includes(query)) return false;
      if (filters.type !== "all" && supplier.supplier_type !== filters.type) return false;
      if (filters.status !== "all" && supplier.status !== filters.status) return false;
      if (filters.partner === "none" && supplier.partner_status !== null) return false;
      if (filters.partner !== "all" && filters.partner !== "none" && supplier.partner_status !== filters.partner) return false;
      return true;
    });
}

export async function getAdminSupplier(id: string): Promise<SupplierDetail | null> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const [{ data: supplier, error }, contactsResult, linksResult, partnersResult, refsResult] = await Promise.all([
    supabase.from("suppliers").select(SUPPLIER_QUERY).eq("id", id).maybeSingle()
      .overrideTypes<SupplierDto, { merge: false }>(),
    supabase.from("supplier_contacts").select(SUPPLIER_CONTACT_QUERY).eq("supplier_id", id)
      .order("is_primary", { ascending: false }).order("updated_at", { ascending: false })
      .overrideTypes<SupplierContactDto[], { merge: false }>(),
    supabase.from("supplier_properties").select(SUPPLIER_PROPERTY_QUERY).eq("supplier_id", id)
      .order("updated_at", { ascending: false }).overrideTypes<SupplierPropertyDto[], { merge: false }>(),
    supabase.from("partner_relationships").select(PARTNER_RELATIONSHIP_QUERY).eq("supplier_id", id)
      .order("created_at", { ascending: false }).overrideTypes<PartnerRelationshipDto[], { merge: false }>(),
    supabase.from("supplier_external_refs").select(SUPPLIER_EXTERNAL_REF_QUERY).eq("supplier_id", id)
      .order("updated_at", { ascending: false }).overrideTypes<SupplierExternalRefDto[], { merge: false }>(),
  ]);
  if (error || !supplier) return null;

  const links = linksResult.data ?? [];
  const propertyIds = [...new Set(links.map((link) => link.property_id))];
  const { data: properties } = propertyIds.length
    ? await supabase.from("properties").select("id,name").in("id", propertyIds)
      .overrideTypes<Array<{ id: string; name: string }>, { merge: false }>()
    : { data: [] as Array<{ id: string; name: string }> };
  const propertyNames = new Map((properties ?? []).map((property) => [property.id, property.name]));

  return {
    ...supplier,
    contacts: contactsResult.data ?? [],
    properties: links.map((link) => ({ ...link, property_name: propertyNames.get(link.property_id) ?? "Cơ sở không xác định" })),
    partner_relationships: partnersResult.data ?? [],
    external_refs: refsResult.data ?? [],
  };
}

export async function getPropertySupplierSummary(propertyId: string): Promise<PropertySupplierSummary[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data: links, error } = await supabase
    .from("supplier_properties")
    .select(SUPPLIER_PROPERTY_QUERY)
    .eq("property_id", propertyId)
    .order("is_primary", { ascending: false })
    .overrideTypes<SupplierPropertyDto[], { merge: false }>();
  if (error || !links.length) return [];

  const ids = [...new Set(links.map((link) => link.supplier_id))];
  const [{ data: suppliers }, { data: contacts }] = await Promise.all([
    supabase.from("suppliers").select(SUPPLIER_QUERY).in("id", ids)
      .overrideTypes<SupplierDto[], { merge: false }>(),
    supabase.from("supplier_contacts").select(SUPPLIER_CONTACT_QUERY).in("supplier_id", ids)
      .eq("is_primary", true).eq("is_active", true)
      .overrideTypes<SupplierContactDto[], { merge: false }>(),
  ]);
  const supplierMap = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier]));

  return links.flatMap((link) => {
    const supplier = supplierMap.get(link.supplier_id);
    if (!supplier) return [];
    return [{
      supplier_id: supplier.id,
      supplier_code: supplier.supplier_code,
      supplier_name: supplier.display_name,
      supplier_status: supplier.status,
      relationship_type: link.relationship_type,
      is_primary: link.is_primary,
      valid_from: link.valid_from,
      valid_until: link.valid_until,
      primary_contact: (contacts ?? []).find((contact) => contact.supplier_id === supplier.id) ?? null,
    }];
  });
}
