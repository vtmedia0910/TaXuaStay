import type { CmsMediaAsset } from "@/features/cms/types";
import type { PublicMotorbikeOffering } from "@/features/motorbike/types";

export type PublicMotorbikeRow = Record<string, unknown>;

function value<T>(row: PublicMotorbikeRow, key: string) {
  return row[key] as T;
}

function normalizeMedia(row: PublicMotorbikeRow): CmsMediaAsset | null {
  const id = value<string | null>(row, "image_media_id");
  if (!id) return null;
  return {
    id,
    title: value<string>(row, "image_title"),
    alt_text: value<string>(row, "image_alt_text"),
    caption: value<string | null>(row, "image_caption"),
    media_type: "image",
    role: value<CmsMediaAsset["role"]>(row, "image_role"),
    storage_bucket: value<string | null>(row, "image_storage_bucket"),
    storage_path: value<string | null>(row, "image_storage_path"),
    external_url: value<string | null>(row, "image_external_url"),
    mime_type: value<string | null>(row, "image_mime_type"),
    width: value<number | null>(row, "image_width"),
    height: value<number | null>(row, "image_height"),
    focal_x: value<number>(row, "image_focal_x"),
    focal_y: value<number>(row, "image_focal_y"),
  };
}

export function normalizePublicMotorbikeOffering(row: PublicMotorbikeRow): PublicMotorbikeOffering {
  return {
    slug: value<string>(row, "slug"),
    display_name: value<string>(row, "display_name"),
    vehicle_category: value<PublicMotorbikeOffering["vehicle_category"]>(row, "vehicle_category"),
    transmission_type: value<PublicMotorbikeOffering["transmission_type"]>(row, "transmission_type"),
    engine_class_cc: value<number | null>(row, "engine_class_cc"),
    suitable_for: value<string | null>(row, "suitable_for"),
    helmet_status: value<PublicMotorbikeOffering["helmet_status"]>(row, "helmet_status"),
    pickup_summary: value<string | null>(row, "pickup_summary"),
    return_summary: value<string | null>(row, "return_summary"),
    public_description: value<string | null>(row, "public_description"),
    image: normalizeMedia(row),
    public_price_vnd: value<number | null>(row, "public_price_vnd"),
    price_source: value<PublicMotorbikeOffering["price_source"]>(row, "price_source"),
    price_checked_at: value<string | null>(row, "price_checked_at"),
    price_valid_until: value<string | null>(row, "price_valid_until"),
    availability_state: value<PublicMotorbikeOffering["availability_state"]>(row, "availability_state"),
    confirmation_mode: "manual",
    public_request_url: value<string>(row, "public_request_url"),
    source_checked_at: value<string>(row, "source_checked_at"),
    updated_at: value<string>(row, "updated_at"),
    source_system_key: "taxua_biker",
    source_provider: "Tà Xùa Biker",
  };
}
