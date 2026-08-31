export const ADMIN_COMMERCIAL_PLAN_QUERY = [
  "id",
  "supplier_id",
  "property_id",
  "code",
  "name",
  "currency",
  "valid_from",
  "valid_until",
  "priority",
  "status",
  "source",
  "contract_reference",
  "notes_internal",
  "created_at",
  "updated_at",
].join(",");

export const ADMIN_COMMERCIAL_RULE_QUERY = [
  "id",
  "commercial_rate_plan_id",
  "supplier_id",
  "property_id",
  "room_type_id",
  "rate_type",
  "net_cost_vnd",
  "market_reference_vnd",
  "effective_from",
  "effective_until",
  "iso_weekdays",
  "priority",
  "source",
  "verified_at",
  "valid_until",
  "is_active",
  "notes_internal",
  "created_at",
  "updated_at",
].join(",");

export const ADMIN_ECONOMICS_SUPPLIER_QUERY = "id,supplier_code,display_name,status";
export const ADMIN_ECONOMICS_RELATIONSHIP_QUERY = "supplier_id,property_id,valid_from,valid_until";
