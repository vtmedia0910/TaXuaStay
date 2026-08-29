export const INVENTORY_SOURCES = ["partner", "admin", "booking_engine", "import"] as const;
export const AVAILABILITY_STATES = ["live", "verified_today", "needs_confirmation", "unknown", "sold_out"] as const;

export type InventorySource = (typeof INVENTORY_SOURCES)[number];
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number];

export interface PublicInventoryRowDto {
  room_type_id: string;
  date: string;
  available_quantity: number;
  source: InventorySource;
  verified_at: string;
}

export interface AdminInventoryRowDto extends PublicInventoryRowDto {
  id: string;
  price_override_vnd: number | null;
  updated_at: string;
}

export interface AvailabilityNightLine {
  date: string;
  available_quantity: number | null;
  source: InventorySource | null;
  verified_at: string | null;
  verification_age_hours: number | null;
  sufficient_quantity: boolean | null;
  state: AvailabilityState;
}

export interface AvailabilityQuote {
  room_type_id: string;
  check_in: string;
  check_out: string;
  requested_rooms: number;
  nights: number;
  nightly_lines: AvailabilityNightLine[];
  state: AvailabilityState;
  minimum_available_quantity: number | null;
  freshest_verified_at: string | null;
  oldest_verified_at: string | null;
  oldest_verification_age_hours: number | null;
  sources: InventorySource[];
  missing_dates: string[];
  stale_dates: string[];
  policy_version: "phase6-v1";
}

export interface AdminAvailabilityIssue {
  severity: "warning" | "error";
  code: "missing" | "stale" | "sold-out" | "capacity";
  room_type_id: string;
  message: string;
}
