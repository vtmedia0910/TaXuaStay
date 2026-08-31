import { enumerateStayNights } from "@/features/pricing/resolver";
import {
  TRIP_BUDGET_PREFERENCES,
  TRIP_QUALITY_PREFERENCES,
  TRIP_ROAD_NEEDS,
  TRIP_STYLES,
  TRIP_VIEW_PRIORITIES,
  type ParsedTripFinderState,
  type TripBudgetPreference,
  type TripFinderIntent,
  type TripQualityPreference,
  type TripRoadNeed,
  type TripStyle,
  type TripViewPriority,
} from "@/features/trip-finder/types";

export type RawTripFinderParams = Record<string, string | string[] | undefined>;

export const DEFAULT_TRIP_FINDER_INTENT: TripFinderIntent = {
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  rooms: 1,
  style: "balanced",
  viewPriority: "any",
  roadNeed: "any",
  qualityPreference: "any",
  budgetPreference: "flexible",
  wantsMotorbike: false,
  wantsPackage: false,
  prefersVerified: false,
};

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  if (value === undefined) return { value: fallback, invalid: false };
  if (!/^\d+$/.test(value)) return { value: fallback, invalid: true };
  const parsed = Number(value);
  return parsed >= minimum && parsed <= maximum
    ? { value: parsed, invalid: false }
    : { value: fallback, invalid: true };
}

function enumValue<T extends string>(value: string | undefined, values: readonly T[], fallback: T) {
  return value && values.includes(value as T) ? value as T : fallback;
}

function validIsoDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : "";
}

function flag(value: string | undefined) {
  return value === "1" || value === "true";
}

export function normalizeTripFinderQuery(intent: TripFinderIntent, options: { step?: number; results?: boolean } = {}) {
  const query = new URLSearchParams();
  if (options.step && options.step > 0) query.set("step", String(Math.min(5, options.step)));
  if (options.results) query.set("results", "1");
  if (intent.checkIn) query.set("check_in", intent.checkIn);
  if (intent.checkOut) query.set("check_out", intent.checkOut);
  query.set("adults", String(intent.adults));
  query.set("children", String(intent.children));
  query.set("rooms", String(intent.rooms));
  query.set("style", intent.style);
  query.set("view", intent.viewPriority);
  query.set("road", intent.roadNeed);
  query.set("quality", intent.qualityPreference);
  query.set("budget", intent.budgetPreference);
  if (intent.wantsMotorbike) query.set("motorbike", "1");
  if (intent.wantsPackage) query.set("package", "1");
  if (intent.prefersVerified) query.set("verified", "1");
  return query.toString();
}

export function buildTripFinderUrl(intent: TripFinderIntent, options: { step?: number; results?: boolean } = {}) {
  const query = normalizeTripFinderQuery(intent, options);
  return query ? `/trip-finder?${query}` : "/trip-finder";
}

export function parseTripFinderParams(raw: RawTripFinderParams): ParsedTripFinderState {
  const issues: string[] = [];
  const checkInRaw = scalar(raw.check_in);
  const checkOutRaw = scalar(raw.check_out);
  const checkIn = validIsoDate(checkInRaw);
  const checkOut = validIsoDate(checkOutRaw);
  if (checkInRaw && !checkIn) issues.push("Ngày đi không hợp lệ.");
  if (checkOutRaw && !checkOut) issues.push("Ngày về không hợp lệ.");
  if (checkIn && checkOut && enumerateStayNights(checkIn, checkOut).length === 0) {
    issues.push("Ngày về phải sau ngày đi và chuyến không dài quá 31 đêm.");
  }

  const adults = boundedInteger(scalar(raw.adults), 2, 1, 20);
  const children = boundedInteger(scalar(raw.children), 0, 0, 20);
  const rooms = boundedInteger(scalar(raw.rooms), 1, 1, 10);
  const step = boundedInteger(scalar(raw.step), 0, 0, 5);
  if (adults.invalid) issues.push("Số người lớn phải từ 1 đến 20.");
  if (children.invalid) issues.push("Số trẻ em phải từ 0 đến 20.");
  if (rooms.invalid) issues.push("Số phòng phải từ 1 đến 10.");
  if (step.invalid) issues.push("Bước lựa chọn không hợp lệ.");

  const intent: TripFinderIntent = {
    checkIn,
    checkOut,
    adults: adults.value,
    children: children.value,
    rooms: rooms.value,
    style: enumValue<TripStyle>(scalar(raw.style), TRIP_STYLES, "balanced"),
    viewPriority: enumValue<TripViewPriority>(scalar(raw.view), TRIP_VIEW_PRIORITIES, "any"),
    roadNeed: enumValue<TripRoadNeed>(scalar(raw.road), TRIP_ROAD_NEEDS, "any"),
    qualityPreference: enumValue<TripQualityPreference>(scalar(raw.quality), TRIP_QUALITY_PREFERENCES, "any"),
    budgetPreference: enumValue<TripBudgetPreference>(scalar(raw.budget), TRIP_BUDGET_PREFERENCES, "flexible"),
    wantsMotorbike: flag(scalar(raw.motorbike)),
    wantsPackage: flag(scalar(raw.package)),
    prefersVerified: flag(scalar(raw.verified)),
  };

  const requestedResults = flag(scalar(raw.results));
  const validDates = Boolean(checkIn && checkOut && enumerateStayNights(checkIn, checkOut).length > 0);
  if (requestedResults && !validDates) issues.push("Hãy chọn đủ ngày đi và ngày về hợp lệ trước khi xem gợi ý.");
  const showResults = requestedResults && validDates;

  return {
    intent,
    step: showResults ? 5 : step.value,
    showResults,
    issues,
    normalizedQuery: normalizeTripFinderQuery(intent, { step: showResults ? undefined : step.value, results: showResults }),
  };
}
