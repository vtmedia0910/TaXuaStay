import type { RoomSearchParams, RoomSearchResult, SearchPreset } from "@/features/search/types";
import { isCurrentlyAvailable } from "@/features/availability/policy";

export function matchesRoomSearch(
  result: RoomSearchResult,
  params: RoomSearchParams,
  preset: SearchPreset = {},
) {
  const { room, property } = result;
  const requestedGuests = params.adults + params.children;

  if (room.max_guests < requestedGuests) return false;
  if (room.capacity_adults < params.adults) return false;
  if (params.children > 0 && room.capacity_children < params.children) return false;
  if (params.propertyType && property.property_type !== params.propertyType) return false;
  if (params.area && property.area_name !== params.area) return false;
  if (params.bathroomType && room.bathroom_type !== params.bathroomType) return false;
  if (params.balcony && room.has_private_balcony !== (params.balcony === "yes")) return false;
  if (params.viewType && room.view_type !== params.viewType) return false;
  if (params.carAccess && property.car_access !== params.carAccess) return false;
  if (params.motorbikeAccess && property.motorbike_access !== params.motorbikeAccess) return false;
  if (params.parking && property.parking !== params.parking) return false;
  if (params.wifi && !property.wifi) return false;
  if (params.breakfast && !property.breakfast) return false;
  if (params.restaurant && !property.restaurant) return false;
  if (params.bbq && !property.bbq) return false;
  if (params.availableOnly && (!result.availabilityQuote || !isCurrentlyAvailable(result.availabilityQuote.state))) return false;

  if (preset.propertyTypes && !preset.propertyTypes.includes(property.property_type)) return false;
  if (preset.viewTypes && !preset.viewTypes.includes(room.view_type)) return false;
  if (preset.bathroomTypes && !preset.bathroomTypes.includes(room.bathroom_type)) return false;
  if (preset.minGuests !== undefined && room.max_guests < preset.minGuests) return false;
  if (preset.maxGuests !== undefined && room.max_guests > preset.maxGuests) return false;
  if (preset.carAccess && property.car_access !== preset.carAccess) return false;
  if (preset.parking && property.parking !== preset.parking) return false;

  return true;
}
