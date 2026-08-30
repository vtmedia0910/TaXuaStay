export const SUPPLIER_QUERY = "id,supplier_code,supplier_type,legal_name,display_name,status,tax_code,website_url,internal_notes,created_at,updated_at,created_by,updated_by";
export const SUPPLIER_CONTACT_QUERY = "id,supplier_id,contact_name,role_title,phone,email,zalo,contact_type,is_primary,notes_internal,is_active,created_at,updated_at";
export const SUPPLIER_PROPERTY_QUERY = "id,supplier_id,property_id,relationship_type,is_primary,valid_from,valid_until,notes_internal,created_at,updated_at";
export const PARTNER_RELATIONSHIP_QUERY = "id,supplier_id,status,tier,started_at,reviewed_at,valid_until,ended_at,relationship_notes_internal,created_at,updated_at";
export const SUPPLIER_EXTERNAL_REF_QUERY = "id,supplier_id,system_key,external_reference,metadata,is_active,created_at,updated_at";
