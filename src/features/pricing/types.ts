export const RATE_TYPES = ["weekday", "weekend", "peak", "holiday", "override"] as const;
export const PRICE_SOURCES = ["partner", "admin", "contract", "import", "reference", "other"] as const;
export const PRICE_CONFIDENCES = ["verified", "recent", "reference", "unknown"] as const;

export type RateType = (typeof RATE_TYPES)[number];
export type PriceSource = (typeof PRICE_SOURCES)[number];
export type PriceConfidence = (typeof PRICE_CONFIDENCES)[number];

export interface PublicRateRuleDto {
  rule_id: string;
  rate_plan_id: string;
  property_id: string;
  room_type_id: string;
  rate_type: RateType;
  price_vnd: number;
  extra_adult_vnd: number | null;
  extra_child_vnd: number | null;
  rule_valid_from: string | null;
  rule_valid_until: string | null;
  days_of_week: number[] | null;
  rule_priority: number;
  plan_priority: number;
  source: PriceSource;
  price_verified_at: string | null;
  price_valid_until: string | null;
  plan_valid_from: string | null;
  plan_valid_until: string | null;
}

export interface RatePlanDto {
  id: string;
  property_id: string;
  code: string;
  name: string;
  description: string | null;
  currency: "VND";
  valid_from: string | null;
  valid_until: string | null;
  priority: number;
  is_active: boolean;
  publish_status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export interface RoomRateRuleDto {
  id: string;
  rate_plan_id: string;
  room_type_id: string;
  rate_type: RateType;
  price_vnd: number;
  extra_adult_vnd: number | null;
  extra_child_vnd: number | null;
  valid_from: string | null;
  valid_until: string | null;
  days_of_week: number[] | null;
  priority: number;
  source: PriceSource;
  price_verified_at: string | null;
  price_valid_until: string | null;
  is_active: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceNightLine {
  date: string;
  state: "resolved" | "missing" | "conflict";
  base_price_vnd: number | null;
  rate_type: RateType | null;
  rule_id: string | null;
  rate_plan_id: string | null;
  source: PriceSource | null;
  confidence: PriceConfidence;
  price_verified_at: string | null;
  price_valid_until: string | null;
  extra_adult_vnd: number | null;
  extra_child_vnd: number | null;
  extra_charges_applied: false;
  conflicting_rule_ids: string[];
}

export interface PriceQuote {
  room_type_id: string;
  check_in: string;
  check_out: string;
  currency: "VND";
  nights: number;
  nightly_lines: PriceNightLine[];
  subtotal_vnd: number | null;
  discount_vnd: 0;
  fees_vnd: 0;
  total_vnd: number | null;
  confidence: PriceConfidence;
  status: "quoted" | "partial" | "conflict" | "unknown";
  has_conflict: boolean;
  conflict_dates: string[];
  policy_version: "phase5-v1";
}

export interface AdminRatePlanOption {
  id: string;
  property_id: string;
  name: string;
  code: string;
  publish_status: RatePlanDto["publish_status"];
  is_active: boolean;
  priority: number;
}

export interface AdminPricingIssue {
  severity: "error" | "warning";
  code: "overlap" | "stale" | "expired-plan" | "missing-rule";
  message: string;
  room_type_id?: string;
  rule_ids?: string[];
}
