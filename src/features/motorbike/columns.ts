export const PUBLIC_MOTORBIKE_OFFERING_COLUMNS = [
  "slug", "display_name", "vehicle_category", "transmission_type", "engine_class_cc",
  "suitable_for", "helmet_status", "pickup_summary", "return_summary",
  "public_description", "public_price_vnd", "price_source", "price_checked_at",
  "price_valid_until", "availability_state", "confirmation_mode", "public_request_url",
  "source_checked_at", "updated_at", "source_system_key", "source_provider",
  "image_media_id", "image_title", "image_alt_text", "image_caption",
  "image_media_type", "image_role", "image_storage_bucket", "image_storage_path",
  "image_external_url", "image_mime_type", "image_width", "image_height",
  "image_focal_x", "image_focal_y",
].join(",");

export const ADMIN_MOTORBIKE_OFFERING_COLUMNS = [
  "id", "supplier_id", "source_external_ref_id", "slug", "display_name",
  "vehicle_category", "transmission_type", "engine_class_cc", "suitable_for",
  "helmet_status", "pickup_summary", "return_summary", "public_description",
  "image_media_id", "public_price_vnd", "price_source", "price_checked_at",
  "price_valid_until", "availability_state", "confirmation_mode", "public_request_url",
  "source_checked_at", "publication_status", "sort_order", "internal_notes",
  "created_at", "updated_at", "created_by", "updated_by",
].join(",");
