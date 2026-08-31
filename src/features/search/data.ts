import "server-only";

import { getPublicAvailabilityQuotes } from "@/features/availability/data";
import { isCurrentlyAvailable } from "@/features/availability/policy";
import type { PublicAmenityDto } from "@/features/amenities/types";
import {
  SEARCH_MEDIA_QUERY,
  SEARCH_PROPERTY_AMENITY_QUERY,
  SEARCH_ROOM_AMENITY_QUERY,
  SEARCH_ROOM_WITH_PROPERTY_QUERY,
} from "@/features/search/columns";
import { matchesRoomSearch } from "@/features/search/filters";
import { rankRoomSearchResults } from "@/features/search/ranking";
import type {
  PublicSitemapData,
  PublicSitemapProperty,
  PublicSitemapRoom,
  RoomSearchParams,
  RoomSearchResponse,
  RoomSearchResult,
  SearchMediaDto,
  SearchOptions,
  SearchPreset,
  SearchPropertyDto,
} from "@/features/search/types";
import { SEARCH_PAGE_SIZE } from "@/features/search/types";
import type { PublicRoomTypeDto } from "@/features/rooms/types";
import { getPublicSearchVerificationSummaries } from "@/features/verification/data";
import { getPublicPriceQuotes } from "@/features/pricing/data";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

type SearchRoomRow = PublicRoomTypeDto & { property: SearchPropertyDto | null };
type RoomAmenityRow = { room_type_id: string; amenity: PublicAmenityDto | null };
type PropertyAmenityRow = { property_id: string; amenity: PublicAmenityDto | null };

function emptyResponse(
  params: RoomSearchParams,
  status: RoomSearchResponse["status"],
): RoomSearchResponse {
  return {
    items: [],
    total: 0,
    page: params.page,
    pageSize: SEARCH_PAGE_SIZE,
    totalPages: 0,
    status,
  };
}

function sortAmenities(amenities: PublicAmenityDto[]) {
  return amenities.sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "vi"),
  );
}

function pickRepresentativeMedia(
  roomMedia: SearchMediaDto[],
  propertyMedia: SearchMediaDto[],
) {
  const supported = (asset: SearchMediaDto) => asset.media_type !== "video";
  return roomMedia.find(supported) ?? propertyMedia.find(supported) ?? null;
}

async function enrichSearchRows(rows: SearchRoomRow[], params: RoomSearchParams) {
  const supabase = createPublicSupabaseClient();
  if (!supabase || !rows.length) return [];

  const roomIds = rows.map((row) => row.id);
  const propertyIds = [...new Set(rows.map((row) => row.property?.id).filter(Boolean))] as string[];

  const [roomAmenitiesResult, propertyAmenitiesResult, roomMediaResult, propertyMediaResult, verification, priceQuotes, availabilityQuotes] =
    await Promise.all([
      supabase
        .from("room_amenities")
        .select(SEARCH_ROOM_AMENITY_QUERY)
        .in("room_type_id", roomIds)
        .overrideTypes<RoomAmenityRow[], { merge: false }>(),
      supabase
        .from("property_amenities")
        .select(SEARCH_PROPERTY_AMENITY_QUERY)
        .in("property_id", propertyIds)
        .overrideTypes<PropertyAmenityRow[], { merge: false }>(),
      supabase
        .from("media_assets")
        .select(SEARCH_MEDIA_QUERY)
        .in("room_type_id", roomIds)
        .order("sort_order")
        .overrideTypes<SearchMediaDto[], { merge: false }>(),
      supabase
        .from("media_assets")
        .select(SEARCH_MEDIA_QUERY)
        .in("property_id", propertyIds)
        .order("sort_order")
        .overrideTypes<SearchMediaDto[], { merge: false }>(),
      getPublicSearchVerificationSummaries(roomIds, propertyIds),
      getPublicPriceQuotes({ roomTypeIds: roomIds, checkIn: params.checkIn, checkOut: params.checkOut }),
      getPublicAvailabilityQuotes({ roomTypeIds: roomIds, checkIn: params.checkIn, checkOut: params.checkOut, requestedRooms: params.rooms }),
    ]);

  const roomAmenities = roomAmenitiesResult.data ?? [];
  const propertyAmenities = propertyAmenitiesResult.data ?? [];
  const roomMedia = roomMediaResult.data ?? [];
  const propertyMedia = propertyMediaResult.data ?? [];
  const cloudViewMap = new Map(verification.cloudViews.map((item) => [item.room_type_id, item]));
  const roadMap = new Map(verification.roads.map((item) => [item.property_id, item]));

  return rows.flatMap<RoomSearchResult>((row) => {
    if (!row.property) return [];
    return [{
      room: {
        id: row.id,
        property_id: row.property_id,
        slug: row.slug,
        name: row.name,
        short_description: row.short_description,
        description: row.description,
        capacity_adults: row.capacity_adults,
        capacity_children: row.capacity_children,
        max_guests: row.max_guests,
        bed_type: row.bed_type,
        bed_count: row.bed_count,
        bathroom_type: row.bathroom_type,
        size_m2: row.size_m2,
        floor_label: row.floor_label,
        has_private_balcony: row.has_private_balcony,
        view_type: row.view_type,
        updated_at: row.updated_at,
      },
      property: row.property,
      roomAmenities: sortAmenities(
        roomAmenities
          .filter((item) => item.room_type_id === row.id && item.amenity)
          .map((item) => item.amenity as PublicAmenityDto),
      ),
      propertyAmenities: sortAmenities(
        propertyAmenities
          .filter((item) => item.property_id === row.property?.id && item.amenity)
          .map((item) => item.amenity as PublicAmenityDto),
      ),
      image: pickRepresentativeMedia(
        roomMedia.filter((asset) => asset.room_type_id === row.id),
        propertyMedia.filter((asset) => asset.property_id === row.property?.id),
      ),
      cloudView: cloudViewMap.get(row.id) ?? null,
      road: roadMap.get(row.property.id) ?? null,
      priceQuote: priceQuotes.get(row.id) ?? null,
      availabilityQuote: availabilityQuotes.get(row.id) ?? null,
    }];
  });
}

export async function searchPublicRooms(
  params: RoomSearchParams,
  preset: SearchPreset = {},
): Promise<RoomSearchResponse> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return emptyResponse(params, "unconfigured");

  const requestedGuests = params.adults + params.children;
  let query = supabase
    .from("room_types")
    .select(SEARCH_ROOM_WITH_PROPERTY_QUERY, { count: "exact" })
    .gte("max_guests", requestedGuests)
    .gte("capacity_adults", params.adults);

  if (params.children > 0) query = query.gte("capacity_children", params.children);
  if (params.propertyType) query = query.eq("property.property_type", params.propertyType);
  if (params.area) query = query.eq("property.area_name", params.area);
  if (params.bathroomType) query = query.eq("bathroom_type", params.bathroomType);
  if (params.balcony) query = query.eq("has_private_balcony", params.balcony === "yes");
  if (params.viewType) query = query.eq("view_type", params.viewType);
  if (params.carAccess) query = query.eq("property.car_access", params.carAccess);
  if (params.motorbikeAccess) query = query.eq("property.motorbike_access", params.motorbikeAccess);
  if (params.parking) query = query.eq("property.parking", params.parking);
  if (params.wifi) query = query.eq("property.wifi", true);
  if (params.breakfast) query = query.eq("property.breakfast", true);
  if (params.restaurant) query = query.eq("property.restaurant", true);
  if (params.bbq) query = query.eq("property.bbq", true);

  if (preset.propertyTypes?.length) {
    query = query.in("property.property_type", preset.propertyTypes);
  }
  if (preset.viewTypes?.length) query = query.in("view_type", preset.viewTypes);
  if (preset.bathroomTypes?.length) query = query.in("bathroom_type", preset.bathroomTypes);
  if (preset.minGuests !== undefined) query = query.gte("max_guests", preset.minGuests);
  if (preset.maxGuests !== undefined) query = query.lte("max_guests", preset.maxGuests);
  if (preset.carAccess) query = query.eq("property.car_access", preset.carAccess);
  if (preset.parking) query = query.eq("property.parking", preset.parking);

  const from = (params.page - 1) * SEARCH_PAGE_SIZE;
  const to = from + SEARCH_PAGE_SIZE - 1;
  if (params.verifiedOnly || params.viewFromBedOnly) {
    const { data, error, count } = await query
      .order("max_guests")
      .order("name")
      .order("id")
      .limit(1000)
      .overrideTypes<SearchRoomRow[], { merge: false }>();
    if (error || (count ?? 0) > 1000) return emptyResponse(params, "error");
    const enriched = await enrichSearchRows((data ?? []).filter((row) => row.property), params);
    const matched = rankRoomSearchResults(
      enriched.filter((result) => matchesRoomSearch(result, params, preset)),
      params,
    );
    return {
      items: matched.slice(from, to + 1),
      total: matched.length,
      page: params.page,
      pageSize: SEARCH_PAGE_SIZE,
      totalPages: Math.ceil(matched.length / SEARCH_PAGE_SIZE),
      status: "ready",
    };
  }
  if (params.availableOnly && params.checkIn && params.checkOut) {
    const { data, error, count } = await query
      .order("max_guests")
      .order("name")
      .order("id")
      .limit(1000)
      .overrideTypes<SearchRoomRow[], { merge: false }>();
    if (error || (count ?? 0) > 1000) return emptyResponse(params, "error");
    const candidates = (data ?? []).filter((row) => row.property);
    const availability = await getPublicAvailabilityQuotes({
      roomTypeIds: candidates.map((row) => row.id),
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      requestedRooms: params.rooms,
    });
    const availableRows = candidates.filter((row) => {
      const quote = availability.get(row.id);
      return quote ? isCurrentlyAvailable(quote.state) : false;
    });
    const enriched = await enrichSearchRows(availableRows.slice(from, to + 1), params);
    const matched = enriched.filter((result) => matchesRoomSearch(result, params, preset));
    return {
      items: rankRoomSearchResults(matched, params),
      total: availableRows.length,
      page: params.page,
      pageSize: SEARCH_PAGE_SIZE,
      totalPages: Math.ceil(availableRows.length / SEARCH_PAGE_SIZE),
      status: "ready",
    };
  }
  const { data, error, count } = await query
    .order("max_guests")
    .order("name")
    .order("id")
    .range(from, to)
    .overrideTypes<SearchRoomRow[], { merge: false }>();

  if (error) return emptyResponse(params, "error");

  const enriched = await enrichSearchRows((data ?? []).filter((row) => row.property), params);
  const matched = enriched.filter((result) => matchesRoomSearch(result, params, preset));
  const total = count ?? 0;

  return {
    items: rankRoomSearchResults(matched, params),
    total,
    page: params.page,
    pageSize: SEARCH_PAGE_SIZE,
    totalPages: Math.ceil(total / SEARCH_PAGE_SIZE),
    status: "ready",
  };
}

export async function getPublicSearchOptions(): Promise<SearchOptions> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { areas: [] };

  const { data, error } = await supabase
    .from("properties")
    .select("area_name")
    .order("area_name")
    .limit(500)
    .overrideTypes<Array<{ area_name: string }>, { merge: false }>();

  if (error) return { areas: [] };
  return { areas: [...new Set(data.map((property) => property.area_name))] };
}

export async function getPublicSitemapData(): Promise<PublicSitemapData> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { properties: [], rooms: [] };

  const [propertiesResult, roomsResult] = await Promise.all([
    supabase
      .from("properties")
      .select("slug,updated_at")
      .order("slug")
      .limit(5000)
      .overrideTypes<PublicSitemapProperty[], { merge: false }>(),
    supabase
      .from("room_types")
      .select("slug,updated_at,property:properties!inner(slug)")
      .order("slug")
      .limit(10000)
      .overrideTypes<PublicSitemapRoom[], { merge: false }>(),
  ]);

  if (propertiesResult.error || roomsResult.error) return { properties: [], rooms: [] };
  return {
    properties: propertiesResult.data ?? [],
    rooms: (roomsResult.data ?? []).filter((room) => room.property),
  };
}
