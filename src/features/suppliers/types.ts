export const SUPPLIER_TYPES = [
  "accommodation",
  "motorbike",
  "bus",
  "transport",
  "activity",
  "food",
  "guide",
  "other",
] as const;

export const SUPPLIER_STATUSES = [
  "lead",
  "onboarding",
  "active",
  "paused",
  "inactive",
  "archived",
] as const;

export const CONTACT_TYPES = [
  "owner",
  "manager",
  "reservation",
  "operations",
  "accounting",
  "emergency",
  "other",
] as const;

export const PROPERTY_RELATIONSHIP_TYPES = [
  "owner",
  "operator",
  "manager",
  "reservation_partner",
  "commercial_partner",
  "other",
] as const;

export const PARTNER_STATUSES = ["prospect", "onboarding", "active", "paused", "ended"] as const;
export const PARTNER_TIERS = ["standard", "verified", "preferred", "cloud_partner", "exclusive"] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];
export type ContactType = (typeof CONTACT_TYPES)[number];
export type PropertyRelationshipType = (typeof PROPERTY_RELATIONSHIP_TYPES)[number];
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];
export type PartnerTier = (typeof PARTNER_TIERS)[number];

export interface SupplierDto {
  id: string;
  supplier_code: string;
  supplier_type: SupplierType;
  legal_name: string | null;
  display_name: string;
  status: SupplierStatus;
  tax_code: string | null;
  website_url: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SupplierContactDto {
  id: string;
  supplier_id: string;
  contact_name: string;
  role_title: string | null;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  contact_type: ContactType;
  is_primary: boolean;
  notes_internal: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierPropertyDto {
  id: string;
  supplier_id: string;
  property_id: string;
  relationship_type: PropertyRelationshipType;
  is_primary: boolean;
  valid_from: string | null;
  valid_until: string | null;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
  property_name?: string;
}

export interface PartnerRelationshipDto {
  id: string;
  supplier_id: string;
  status: PartnerStatus;
  tier: PartnerTier;
  started_at: string | null;
  reviewed_at: string | null;
  valid_until: string | null;
  ended_at: string | null;
  relationship_notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierExternalRefDto {
  id: string;
  supplier_id: string;
  system_key: string;
  external_reference: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierListItem extends SupplierDto {
  primary_contact: SupplierContactDto | null;
  linked_property_count: number;
  partner_status: PartnerStatus | null;
  partner_tier: PartnerTier | null;
  warnings: string[];
}

export interface SupplierDetail extends SupplierDto {
  contacts: SupplierContactDto[];
  properties: SupplierPropertyDto[];
  partner_relationships: PartnerRelationshipDto[];
  external_refs: SupplierExternalRefDto[];
}

export interface PropertySupplierSummary {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  supplier_status: SupplierStatus;
  relationship_type: PropertyRelationshipType;
  is_primary: boolean;
  valid_from: string | null;
  valid_until: string | null;
  primary_contact: SupplierContactDto | null;
}
