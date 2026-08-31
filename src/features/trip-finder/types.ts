import type { AccessCertainty } from "@/features/properties/types";
import type { BathroomType, ViewType } from "@/features/rooms/types";
import type { ViewFromBed } from "@/features/verification/types";

export const TRIP_STYLES = ["balanced", "couple", "family", "group", "slow"] as const;
export const TRIP_VIEW_PRIORITIES = ["any", "cloud_view", "view_from_bed", "mountain", "valley"] as const;
export const TRIP_ROAD_NEEDS = ["any", "car_required", "motorbike_ok"] as const;
export const TRIP_QUALITY_PREFERENCES = ["any", "current_quality"] as const;
export const TRIP_BUDGET_PREFERENCES = ["flexible", "complete_price", "under_1500000", "under_3000000"] as const;
export const TRIP_FINDER_POLICY_VERSION = "phase7-trip-finder-v1" as const;

export type TripStyle = (typeof TRIP_STYLES)[number];
export type TripViewPriority = (typeof TRIP_VIEW_PRIORITIES)[number];
export type TripRoadNeed = (typeof TRIP_ROAD_NEEDS)[number];
export type TripQualityPreference = (typeof TRIP_QUALITY_PREFERENCES)[number];
export type TripBudgetPreference = (typeof TRIP_BUDGET_PREFERENCES)[number];
export type TripCandidateKind = "stay" | "package" | "motorbike" | "composition";
export type TripFactState = "yes" | "no" | "unknown" | "not_applicable";
export type TripPriceState = "current" | "reference" | "unknown" | "conflict";
export type TripAvailabilityState = "available" | "needs_confirmation" | "unknown" | "unavailable" | "not_applicable";
export type TripConfirmationState = "detail" | "manual" | "external_request" | "unavailable";
export type TripRecommendationGroup = "best" | "consider" | "conditional";

export interface TripFinderIntent {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  style: TripStyle;
  viewPriority: TripViewPriority;
  roadNeed: TripRoadNeed;
  qualityPreference: TripQualityPreference;
  budgetPreference: TripBudgetPreference;
  wantsMotorbike: boolean;
  wantsPackage: boolean;
  prefersVerified: boolean;
}

export interface ParsedTripFinderState {
  intent: TripFinderIntent;
  step: number;
  showResults: boolean;
  issues: string[];
  normalizedQuery: string;
}

export interface TripCandidateAction {
  label: "XEM PHÒNG" | "XEM GÓI" | "XEM XE" | "YÊU CẦU XÁC NHẬN";
  href: string;
  external: boolean;
}

export interface TripFinderCandidate {
  id: string;
  kind: TripCandidateKind;
  name: string;
  context: string;
  imageUrl: string | null;
  imageAlt: string;
  capacity: TripFactState;
  carAccess: AccessCertainty;
  motorbikeAccess: AccessCertainty;
  roadVerified: boolean;
  bathroomType: BathroomType | null;
  viewType: ViewType | null;
  hasPrivateBalcony: boolean | null;
  cloudScore: number | null;
  viewFromBed: ViewFromBed | null;
  currentQualityDimensions: number;
  verificationLabels: string[];
  componentTypes: Array<"ROOM" | "MOTORBIKE" | "CUSTOM">;
  price: {
    state: TripPriceState;
    amountVnd: number | null;
    label: string;
  };
  availability: {
    state: TripAvailabilityState;
    label: string;
  };
  confirmation: {
    state: TripConfirmationState;
    label: string;
  };
  actions: TripCandidateAction[];
}

export interface PublicTripRecommendation {
  id: string;
  kind: TripCandidateKind;
  kindLabel: string;
  name: string;
  context: string;
  imageUrl: string | null;
  imageAlt: string;
  group: TripRecommendationGroup;
  reasons: string[];
  tradeOffs: string[];
  unknownFacts: string[];
  verificationLabels: string[];
  price: TripFinderCandidate["price"];
  availability: TripFinderCandidate["availability"];
  confirmation: TripFinderCandidate["confirmation"];
  actions: TripCandidateAction[];
  policyVersion: typeof TRIP_FINDER_POLICY_VERSION;
}

export interface TripFinderResolution {
  groups: Array<{
    key: TripRecommendationGroup;
    label: "Phù hợp nhất" | "Đáng cân nhắc" | "Phù hợp nếu...";
    items: PublicTripRecommendation[];
  }>;
  recommendations: PublicTripRecommendation[];
  excludedCount: number;
  relaxationOptions: string[];
  policyVersion: typeof TRIP_FINDER_POLICY_VERSION;
}

export type TripFinderSourceStatus = "ready" | "empty" | "unconfigured" | "error" | "partial";

export interface TripFinderCandidateSet {
  candidates: TripFinderCandidate[];
  status: TripFinderSourceStatus;
  sources: {
    stay: "ready" | "empty" | "unconfigured" | "error";
    packages: "ready" | "empty" | "unconfigured" | "error";
    motorbike: "ready" | "empty" | "unconfigured" | "error";
  };
}
