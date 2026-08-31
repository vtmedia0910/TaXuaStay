import type { PriceNightLine, PriceQuote, RateType } from "@/features/pricing/types";

export const COMMERCIAL_PLAN_STATUSES = ["draft", "active", "paused", "expired", "archived"] as const;
export const COMMERCIAL_SOURCES = ["partner", "admin", "contract", "import", "reference", "other"] as const;
export const COMMERCIAL_FRESHNESS_STATES = ["verified", "recent", "reference", "unknown"] as const;

export type CommercialPlanStatus = (typeof COMMERCIAL_PLAN_STATUSES)[number];
export type CommercialSource = (typeof COMMERCIAL_SOURCES)[number];
export type CommercialFreshness = (typeof COMMERCIAL_FRESHNESS_STATES)[number];

export interface CommercialRatePlanDto {
  id: string;
  supplier_id: string;
  property_id: string;
  code: string;
  name: string;
  currency: "VND";
  valid_from: string | null;
  valid_until: string | null;
  priority: number;
  status: CommercialPlanStatus;
  source: CommercialSource;
  contract_reference: string | null;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomCommercialRuleDto {
  id: string;
  commercial_rate_plan_id: string;
  supplier_id: string;
  property_id: string;
  room_type_id: string;
  rate_type: RateType;
  net_cost_vnd: number | null;
  market_reference_vnd: number | null;
  effective_from: string | null;
  effective_until: string | null;
  iso_weekdays: number[] | null;
  priority: number;
  source: CommercialSource;
  verified_at: string | null;
  valid_until: string | null;
  is_active: boolean;
  notes_internal: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierRelationshipRange {
  valid_from: string | null;
  valid_until: string | null;
}

export interface CommercialResolverRule extends RoomCommercialRuleDto {
  plan_priority: number;
  plan_status: CommercialPlanStatus;
  plan_valid_from: string | null;
  plan_valid_until: string | null;
  supplier_status: string;
  relationship_ranges: SupplierRelationshipRange[];
}

export type EconomicsWarningCode =
  | "sell-missing"
  | "cost-missing"
  | "market-missing"
  | "commercial-conflict"
  | "sell-conflict"
  | "negative-contribution"
  | "commercial-expired"
  | "commercial-stale"
  | "market-stale"
  | "supplier-relationship-inactive";

export interface EconomicsNightLine {
  date: string;
  state: "resolved" | "incomplete" | "conflict";
  sell_state: PriceNightLine["state"];
  sell_price_vnd: number | null;
  sell_rule_id: string | null;
  sell_rate_plan_id: string | null;
  net_cost_vnd: number | null;
  market_reference_vnd: number | null;
  gross_contribution_vnd: number | null;
  commercial_rule_id: string | null;
  commercial_rate_plan_id: string | null;
  supplier_id: string | null;
  cost_source: CommercialSource | null;
  commercial_freshness: CommercialFreshness;
  verified_at: string | null;
  valid_until: string | null;
  conflicting_commercial_rule_ids: string[];
  warnings: EconomicsWarningCode[];
}

export interface EconomicsQuote {
  room_type_id: string;
  check_in: string;
  check_out: string;
  currency: "VND";
  nights: number;
  sell_quote: PriceQuote;
  nightly_lines: EconomicsNightLine[];
  sell_subtotal_vnd: number | null;
  net_cost_total_vnd: number | null;
  market_reference_total_vnd: number | null;
  gross_contribution_vnd: number | null;
  gross_margin_bps: number | null;
  status: "complete" | "partial" | "conflict" | "unknown";
  missing_dates: string[];
  conflict_dates: string[];
  policy_version: "phase4-economics-v1";
}

export interface AdminCommercialPlanOption {
  id: string;
  supplier_id: string;
  property_id: string;
  name: string;
  code: string;
  status: CommercialPlanStatus;
  priority: number;
}

export interface AdminSupplierOption {
  id: string;
  supplier_code: string;
  display_name: string;
  status: string;
}
