import type { CmsMediaAsset } from "@/features/cms/types";

export const MOTORBIKE_VEHICLE_CATEGORIES = ["motorbike", "scooter", "service"] as const;
export const MOTORBIKE_TRANSMISSION_TYPES = ["manual_clutch", "semi_automatic", "automatic", "other"] as const;
export const MOTORBIKE_HELMET_STATUSES = ["unknown", "yes", "no"] as const;
export const MOTORBIKE_AVAILABILITY_STATES = ["needs_confirmation", "unknown", "unavailable"] as const;
export const MOTORBIKE_PRICE_SOURCES = ["supplier_confirmation", "provider_public_reference", "owner_confirmation"] as const;
export const MOTORBIKE_PUBLICATION_STATUSES = ["draft", "published", "paused", "archived"] as const;

export type MotorbikeVehicleCategory = (typeof MOTORBIKE_VEHICLE_CATEGORIES)[number];
export type MotorbikeTransmissionType = (typeof MOTORBIKE_TRANSMISSION_TYPES)[number];
export type MotorbikeHelmetStatus = (typeof MOTORBIKE_HELMET_STATUSES)[number];
export type MotorbikeAvailabilityState = (typeof MOTORBIKE_AVAILABILITY_STATES)[number];
export type MotorbikePriceSource = (typeof MOTORBIKE_PRICE_SOURCES)[number];
export type MotorbikePublicationStatus = (typeof MOTORBIKE_PUBLICATION_STATUSES)[number];

export interface PublicMotorbikeOffering {
  slug: string;
  display_name: string;
  vehicle_category: MotorbikeVehicleCategory;
  transmission_type: MotorbikeTransmissionType;
  engine_class_cc: number | null;
  suitable_for: string | null;
  helmet_status: MotorbikeHelmetStatus;
  pickup_summary: string | null;
  return_summary: string | null;
  public_description: string | null;
  image: CmsMediaAsset | null;
  public_price_vnd: number | null;
  price_source: MotorbikePriceSource | null;
  price_checked_at: string | null;
  price_valid_until: string | null;
  availability_state: MotorbikeAvailabilityState;
  confirmation_mode: "manual";
  public_request_url: string;
  source_checked_at: string;
  updated_at: string;
  source_system_key: "taxua_biker";
  source_provider: "Tà Xùa Biker";
}

export interface AdminMotorbikeOffering extends Omit<PublicMotorbikeOffering, "image" | "public_request_url" | "source_checked_at" | "source_system_key" | "source_provider"> {
  id: string;
  supplier_id: string;
  source_external_ref_id: string;
  image_media_id: string | null;
  public_request_url: string | null;
  source_checked_at: string | null;
  publication_status: MotorbikePublicationStatus;
  sort_order: number;
  internal_notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface MotorbikeSourceOption {
  supplier_id: string;
  supplier_name: string;
  supplier_status: string;
  external_ref_id: string;
  external_reference: string;
  external_ref_active: boolean;
}

export interface AdminMotorbikeListItem extends AdminMotorbikeOffering {
  source: MotorbikeSourceOption | null;
  warnings: string[];
}

export type MotorbikeCatalogStatus = "ready" | "empty" | "unconfigured" | "error";

export interface MotorbikeCatalogResult {
  status: MotorbikeCatalogStatus;
  offerings: PublicMotorbikeOffering[];
}

export type MotorbikeIntegrationMode = "manual_reference";
