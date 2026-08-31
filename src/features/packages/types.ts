import type { AvailabilityQuote, AvailabilityState } from "@/features/availability/types";
import type { CmsMediaAsset } from "@/features/cms/types";
import type { EconomicsQuote } from "@/features/economics/types";
import type { PublicMotorbikeOffering } from "@/features/motorbike/types";

export const PACKAGE_LIFECYCLE_STATUSES = ["draft", "published", "paused", "archived"] as const;
export const PACKAGE_COMPONENT_TYPES = ["ROOM", "MOTORBIKE", "BUS", "TRANSFER", "ACTIVITY", "MEAL", "GUIDE", "SERVICE", "CUSTOM"] as const;
export const ACTIVE_PACKAGE_COMPONENT_TYPES = ["ROOM", "MOTORBIKE", "CUSTOM"] as const;
export const PACKAGE_CONFIRMATION_MODES = ["instant", "manual", "external_request", "unknown"] as const;
export const PACKAGE_PRICE_SOURCES = ["supplier_confirmation", "owner_confirmation", "contract", "admin"] as const;
export const PACKAGE_COST_SOURCES = ["supplier_confirmation", "owner_confirmation", "contract", "admin"] as const;

export type PackageLifecycleStatus = (typeof PACKAGE_LIFECYCLE_STATUSES)[number];
export type PackageComponentType = (typeof PACKAGE_COMPONENT_TYPES)[number];
export type ActivePackageComponentType = (typeof ACTIVE_PACKAGE_COMPONENT_TYPES)[number];
export type PackageConfirmationMode = (typeof PACKAGE_CONFIRMATION_MODES)[number];
export type PackagePriceSource = (typeof PACKAGE_PRICE_SOURCES)[number];
export type PackageCostSource = (typeof PACKAGE_COST_SOURCES)[number];

export interface PublicPackage {
  id: string;
  destination_id: string;
  destination_slug: string;
  destination_name: string;
  slug: string;
  name: string;
  proposition: string;
  description: string | null;
  valid_from: string | null;
  valid_until: string | null;
  confirmation_mode: PackageConfirmationMode;
  public_request_url: string | null;
  is_featured: boolean;
  sort_order: number;
  updated_at: string;
  image: CmsMediaAsset | null;
}

export interface PublicPackageComponent {
  package_id: string;
  component_key: string;
  component_type: ActivePackageComponentType;
  is_required: boolean;
  quantity: number;
  sort_order: number;
  confirmation_mode: PackageConfirmationMode;
  public_copy_override: string | null;
  room_type_id: string | null;
  motorbike_offering_slug: string | null;
  source_name: string;
  source_parent_name: string | null;
  source_path: string | null;
  custom_code: string | null;
  custom_name: string | null;
  custom_description: string | null;
}

export interface PublicPackagePriceRule {
  package_id: string;
  price_vnd: number;
  effective_from: string | null;
  effective_until: string | null;
  adults_min: number | null;
  adults_max: number | null;
  children_min: number | null;
  children_max: number | null;
  rooms_min: number | null;
  rooms_max: number | null;
  selected_optional_component_keys: string[];
  priority: number;
  price_source: PackagePriceSource;
  verified_at: string;
  price_valid_until: string;
  rule_id?: string | null;
}

export interface AdminPackage extends Omit<PublicPackage, "image" | "destination_slug" | "destination_name"> {
  code: string;
  lifecycle_status: PackageLifecycleStatus;
  hero_media_id: string | null;
  internal_notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface AdminPackageComponent extends Omit<PublicPackageComponent, "component_type" | "source_name" | "source_parent_name" | "source_path" | "motorbike_offering_slug"> {
  id: string;
  component_type: PackageComponentType;
  motorbike_offering_id: string | null;
  unit_cost_vnd: number | null;
  cost_source: PackageCostSource | null;
  cost_verified_at: string | null;
  cost_valid_until: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPackagePriceRule extends PublicPackagePriceRule {
  id: string;
  rule_key: string;
  is_active: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageSourceContext {
  roomAvailabilityQuotes: Map<string, AvailabilityQuote>;
  roomEconomicsQuotes?: Map<string, EconomicsQuote>;
  motorbikeOfferings: Map<string, PublicMotorbikeOffering>;
}

export type PackageAvailabilityState = "recorded_available" | "needs_confirmation" | "unavailable" | "unknown";
export type PackagePriceStatus = "quoted" | "unknown" | "stale" | "conflict" | "invalid";

export interface PackageQuoteInput {
  package_id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  rooms: number;
  selected_optional_component_keys: string[];
}

export interface PackageComponentResolution {
  component_key: string;
  component_type: ActivePackageComponentType;
  name: string;
  parent_name: string | null;
  path: string | null;
  quantity: number;
  is_required: boolean;
  is_selected: boolean;
  confirmation_mode: PackageConfirmationMode;
  availability_state: PackageAvailabilityState;
  source_availability_state: AvailabilityState | "manual" | "unknown" | "unavailable";
  public_copy: string | null;
  caveat: string;
}

export interface PackageSellResolution {
  status: PackagePriceStatus;
  currency: "VND";
  total_vnd: number | null;
  price_source: PackagePriceSource | null;
  verified_at: string | null;
  price_valid_until: string | null;
}

export interface PublicPackageQuote {
  package: PublicPackage;
  input: PackageQuoteInput;
  nights: number;
  components: PackageComponentResolution[];
  sell_price: PackageSellResolution;
  availability_state: PackageAvailabilityState;
  confirmation_mode: Exclude<PackageConfirmationMode, "instant">;
  confirmation_label: string;
  can_request: boolean;
  request_url: string | null;
  caveats: string[];
  status: "ready" | "needs_confirmation" | "unavailable" | "invalid";
  policy_version: "phase6-package-v1";
}

export interface PrivatePackageComponentEconomics {
  component_key: string;
  component_type: ActivePackageComponentType;
  quantity: number;
  total_cost_vnd: number | null;
  cost_source: PackageCostSource | "room_commercial_economics" | null;
  commercial_rule_ids: string[];
  missing_cost: boolean;
  stale_cost: boolean;
}

export interface PrivatePackageResolution {
  public_quote: PublicPackageQuote;
  selected_price_rule_id: string | null;
  conflicting_price_rule_ids: string[];
  component_economics: PrivatePackageComponentEconomics[];
  package_cost_vnd: number | null;
  gross_contribution_vnd: number | null;
  gross_margin_bps: number | null;
  warnings: PackageWarningCode[];
  policy_version: "phase6-package-v1";
}

export type PackageWarningCode =
  | "required-room-missing"
  | "source-inactive"
  | "motorbike-paused"
  | "package-price-missing"
  | "package-price-stale"
  | "required-availability-unknown"
  | "component-cost-missing"
  | "negative-contribution"
  | "price-conflict"
  | "dates-invalid"
  | "image-missing"
  | "copy-missing"
  | "published-without-components"
  | "optional-selection-invalid";

export interface AdminPackageBundle {
  package: AdminPackage;
  components: AdminPackageComponent[];
  priceRules: AdminPackagePriceRule[];
  warnings: PackageWarningCode[];
}

export interface PackageRoomSourceOption {
  id: string;
  property_id: string;
  property_name: string;
  property_slug: string;
  name: string;
  slug: string;
  publish_status: string;
  is_active: boolean;
}

export interface PackageMotorbikeSourceOption {
  id: string;
  display_name: string;
  slug: string;
  publication_status: string;
  availability_state: string;
}
