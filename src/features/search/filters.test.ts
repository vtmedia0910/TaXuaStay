import { describe, expect, it } from "vitest";
import { matchesRoomSearch } from "@/features/search/filters";
import { DEFAULT_ROOM_SEARCH_PARAMS } from "@/features/search/params";
import type { RoomSearchParams, RoomSearchResult } from "@/features/search/types";

function makeResult(): RoomSearchResult {
  return {
    room: {
      id: "room-1",
      property_id: "property-1",
      slug: "double-mountain",
      name: "Double Mountain",
      short_description: "Phòng thật",
      description: null,
      capacity_adults: 2,
      capacity_children: 1,
      max_guests: 3,
      bed_type: "double",
      bed_count: 1,
      bathroom_type: "private",
      size_m2: 24,
      floor_label: null,
      has_private_balcony: true,
      view_type: "mountain",
      updated_at: "2026-08-29T00:00:00Z",
    },
    property: {
      id: "property-1",
      slug: "stay-one",
      name: "Stay One",
      property_type: "homestay",
      area_name: "Tà Xùa",
      car_access: "unknown",
      motorbike_access: "yes",
      parking: "yes",
      restaurant: true,
      breakfast: true,
      bbq: false,
      wifi: true,
      is_featured: false,
      updated_at: "2026-08-29T00:00:00Z",
    },
    roomAmenities: [],
    propertyAmenities: [],
    image: null,
    cloudView: null,
    road: null,
    priceQuote: null,
  };
}

function params(overrides: Partial<RoomSearchParams> = {}): RoomSearchParams {
  return { ...DEFAULT_ROOM_SEARCH_PARAMS, ...overrides };
}

describe("Phase 3 room filtering", () => {
  it("respects total, adult, and child capacity", () => {
    const result = makeResult();
    expect(matchesRoomSearch(result, params({ adults: 2, children: 1 }))).toBe(true);
    expect(matchesRoomSearch(result, params({ adults: 3, children: 0 }))).toBe(false);
    expect(matchesRoomSearch(result, params({ adults: 2, children: 2 }))).toBe(false);
  });

  it("filters property type and area", () => {
    const result = makeResult();
    expect(matchesRoomSearch(result, params({ propertyType: "homestay", area: "Tà Xùa" }))).toBe(true);
    expect(matchesRoomSearch(result, params({ propertyType: "hotel" }))).toBe(false);
    expect(matchesRoomSearch(result, params({ area: "Bắc Yên" }))).toBe(false);
  });

  it("filters bathroom, balcony, and view type", () => {
    const result = makeResult();
    expect(matchesRoomSearch(result, params({ bathroomType: "private", balcony: "yes", viewType: "mountain" }))).toBe(true);
    expect(matchesRoomSearch(result, params({ bathroomType: "shared" }))).toBe(false);
    expect(matchesRoomSearch(result, params({ balcony: "no" }))).toBe(false);
    expect(matchesRoomSearch(result, params({ viewType: "valley" }))).toBe(false);
  });

  it("never treats unknown car access as confirmed yes", () => {
    const result = makeResult();
    expect(matchesRoomSearch(result, params({ carAccess: "unknown" }))).toBe(true);
    expect(matchesRoomSearch(result, params({ carAccess: "yes" }))).toBe(false);
  });

  it("filters parking and recorded property facilities", () => {
    const result = makeResult();
    expect(matchesRoomSearch(result, params({ parking: "yes", wifi: true, breakfast: true, restaurant: true }))).toBe(true);
    expect(matchesRoomSearch(result, params({ parking: "no" }))).toBe(false);
    expect(matchesRoomSearch(result, params({ bbq: true }))).toBe(false);
  });

  it("uses transparent couple, group, view, and car presets", () => {
    const result = makeResult();
    expect(matchesRoomSearch(result, params(), { maxGuests: 2 })).toBe(false);
    expect(matchesRoomSearch(result, params(), { minGuests: 4 })).toBe(false);
    expect(matchesRoomSearch(result, params(), { viewTypes: ["mountain", "valley"] })).toBe(true);
    expect(matchesRoomSearch(result, params(), { carAccess: "yes", parking: "yes" })).toBe(false);
  });
});
