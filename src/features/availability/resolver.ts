import { availabilityFreshnessState, AVAILABILITY_POLICY_VERSION, MAX_AVAILABILITY_STAY_NIGHTS } from "@/features/availability/policy";
import type { AvailabilityNightLine, AvailabilityQuote, AvailabilityState, PublicInventoryRowDto } from "@/features/availability/types";
import { enumerateLodgingNights } from "@/lib/lodging-dates";

function missingLine(date: string): AvailabilityNightLine {
  return {
    date,
    available_quantity: null,
    source: null,
    verified_at: null,
    verification_age_hours: null,
    sufficient_quantity: null,
    state: "unknown",
  };
}

function aggregateState(lines: AvailabilityNightLine[]): AvailabilityState {
  if (!lines.length) return "unknown";
  if (lines.some((line) => line.state === "sold_out")) return "sold_out";
  if (lines.some((line) => line.state === "unknown")) return "unknown";
  if (lines.some((line) => line.state === "needs_confirmation")) return "needs_confirmation";
  if (lines.some((line) => line.state === "verified_today")) return "verified_today";
  return "live";
}

export function resolveRoomAvailability(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  requestedRooms: number;
  inventory: PublicInventoryRowDto[];
  now?: Date;
}): AvailabilityQuote {
  const now = input.now ?? new Date();
  const nights = enumerateLodgingNights(input.checkIn, input.checkOut, MAX_AVAILABILITY_STAY_NIGHTS);
  const requestedRooms = Number.isInteger(input.requestedRooms) && input.requestedRooms >= 1
    ? input.requestedRooms
    : 1;
  const rows = new Map(
    input.inventory
      .filter((row) => row.room_type_id === input.roomTypeId)
      .map((row) => [row.date, row]),
  );

  const lines = nights.map<AvailabilityNightLine>((date) => {
    const row = rows.get(date);
    if (!row) return missingLine(date);

    const freshness = availabilityFreshnessState(row.verified_at, now);
    const verifiedTime = new Date(row.verified_at).getTime();
    const ageHours = Number.isNaN(verifiedTime) ? null : (now.getTime() - verifiedTime) / 3_600_000;
    const sufficient = row.available_quantity >= requestedRooms;
    const state = freshness === "live" || freshness === "verified_today"
      ? sufficient ? freshness : "sold_out"
      : freshness;

    return {
      date,
      available_quantity: row.available_quantity,
      source: row.source,
      verified_at: row.verified_at,
      verification_age_hours: ageHours,
      sufficient_quantity: sufficient,
      state,
    };
  });

  const validLines = lines.filter(
    (line) => line.verified_at && line.verification_age_hours !== null && line.verification_age_hours >= 0,
  );
  const quantities = lines.flatMap((line) => line.available_quantity === null ? [] : [line.available_quantity]);
  const completeQuantities = quantities.length === nights.length && nights.length > 0;
  const sortedVerificationLines = [...validLines].sort(
    (left, right) => new Date(left.verified_at as string).getTime() - new Date(right.verified_at as string).getTime(),
  );

  return {
    room_type_id: input.roomTypeId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    requested_rooms: requestedRooms,
    nights: nights.length,
    nightly_lines: lines,
    state: aggregateState(lines),
    minimum_available_quantity: completeQuantities ? Math.min(...quantities) : null,
    freshest_verified_at: sortedVerificationLines.at(-1)?.verified_at ?? null,
    oldest_verified_at: sortedVerificationLines[0]?.verified_at ?? null,
    oldest_verification_age_hours: sortedVerificationLines.length
      ? Math.max(...sortedVerificationLines.map((line) => line.verification_age_hours as number))
      : null,
    sources: [...new Set(lines.flatMap((line) => line.source ? [line.source] : []))].sort(),
    missing_dates: lines.filter((line) => line.state === "unknown").map((line) => line.date),
    stale_dates: lines.filter((line) => line.state === "needs_confirmation").map((line) => line.date),
    policy_version: AVAILABILITY_POLICY_VERSION,
  };
}

export function resolveRoomAvailabilities(input: {
  roomTypeIds: string[];
  checkIn: string;
  checkOut: string;
  requestedRooms: number;
  inventory: PublicInventoryRowDto[];
  now?: Date;
}) {
  return new Map(input.roomTypeIds.map((roomTypeId) => [roomTypeId, resolveRoomAvailability({
    roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    requestedRooms: input.requestedRooms,
    inventory: input.inventory,
    now: input.now,
  })]));
}
