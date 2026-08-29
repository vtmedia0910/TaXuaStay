import type { RoomSearchParams, RoomSearchResult } from "@/features/search/types";
import { AVAILABILITY_STATE_RANK } from "@/features/availability/policy";

export function getRoomSearchScore(result: RoomSearchResult, params: RoomSearchParams) {
  const requestedGuests = params.adults + params.children;
  const spareCapacity = Math.max(0, result.room.max_guests - requestedGuests);
  let score = Math.max(0, 60 - spareCapacity * 6);

  if (result.property.is_featured) score += 12;
  if (result.image) score += 8;
  if (result.room.short_description) score += 3;
  if (result.room.bed_type && result.room.bed_count) score += 3;
  if (result.room.size_m2) score += 2;
  if (result.cloudView) score += 15;
  if (result.road) score += 5;
  score += Math.min(4, result.roomAmenities.length + result.propertyAmenities.length);

  return score;
}

export function rankRoomSearchResults(
  results: RoomSearchResult[],
  params: RoomSearchParams,
) {
  return [...results].sort((left, right) => {
    if (params.checkIn && params.checkOut) {
      const leftAvailability = left.availabilityQuote ? AVAILABILITY_STATE_RANK[left.availabilityQuote.state] : 0;
      const rightAvailability = right.availabilityQuote ? AVAILABILITY_STATE_RANK[right.availabilityQuote.state] : 0;
      if (rightAvailability !== leftAvailability) return rightAvailability - leftAvailability;
    }
    const scoreDifference = getRoomSearchScore(right, params) - getRoomSearchScore(left, params);
    if (scoreDifference) return scoreDifference;

    const propertyDifference = left.property.name.localeCompare(right.property.name, "vi");
    if (propertyDifference) return propertyDifference;

    const roomDifference = left.room.name.localeCompare(right.room.name, "vi");
    return roomDifference || left.room.id.localeCompare(right.room.id);
  });
}
