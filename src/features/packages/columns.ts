export const PUBLIC_PACKAGE_COLUMNS = [
  "id", "destination_id", "destination_slug", "destination_name", "slug", "name",
  "proposition", "description", "valid_from", "valid_until", "confirmation_mode",
  "public_request_url", "is_featured", "sort_order", "updated_at",
  "image_media_id", "image_title", "image_alt_text", "image_caption",
  "image_media_type", "image_role", "image_storage_bucket", "image_storage_path",
  "image_external_url", "image_mime_type", "image_width", "image_height",
  "image_focal_x", "image_focal_y",
].join(",");

export const ADMIN_PACKAGE_COLUMNS = [
  "id", "destination_id", "code", "slug", "name", "proposition", "description",
  "lifecycle_status", "valid_from", "valid_until", "confirmation_mode",
  "public_request_url", "is_featured", "sort_order", "hero_media_id",
  "internal_notes", "created_at", "updated_at", "created_by", "updated_by",
].join(",");

export const ADMIN_PACKAGE_COMPONENT_COLUMNS = [
  "id", "package_id", "component_key", "component_type", "room_type_id",
  "motorbike_offering_id", "custom_code", "custom_name", "custom_description",
  "is_required", "quantity", "sort_order", "confirmation_mode",
  "public_copy_override", "unit_cost_vnd", "cost_source", "cost_verified_at",
  "cost_valid_until", "internal_notes", "created_at", "updated_at",
].join(",");

export const ADMIN_PACKAGE_PRICE_RULE_COLUMNS = [
  "id", "package_id", "rule_key", "price_vnd", "effective_from", "effective_until",
  "adults_min", "adults_max", "children_min", "children_max", "rooms_min",
  "rooms_max", "selected_optional_component_keys", "priority", "price_source",
  "verified_at", "price_valid_until", "is_active", "internal_notes",
  "created_at", "updated_at",
].join(",");
