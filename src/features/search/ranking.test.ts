import { describe, expect, it } from "vitest";
import { DEFAULT_ROOM_SEARCH_PARAMS } from "@/features/search/params";
import { rankRoomSearchResults } from "@/features/search/ranking";
import type { RoomSearchResult } from "@/features/search/types";

function candidate(id: string, maxGuests: number, featured = false, hasImage = false): RoomSearchResult {
  return {
    room: {
      id,
      property_id: `property-${id}`,
      slug: id,
      name: `Room ${id}`,
      short_description: null,
      description: null,
      capacity_adults: 2,
      capacity_children: Math.max(0, maxGuests - 2),
      max_guests: maxGuests,
      bed_type: null,
      bed_count: null,
      bathroom_type: "private",
      size_m2: null,
      floor_label: null,
      has_private_balcony: false,
      view_type: "unknown",
      updated_at: "2026-08-29T00:00:00Z",
    },
    property: {
      id: `property-${id}`,
      slug: `property-${id}`,
      name: `Property ${id}`,
      property_type: "homestay",
      area_name: "Tà Xùa",
      car_access: "unknown",
      motorbike_access: "unknown",
      parking: "unknown",
      restaurant: false,
      breakfast: false,
      bbq: false,
      wifi: false,
      is_featured: featured,
      updated_at: "2026-08-29T00:00:00Z",
    },
    roomAmenities: [],
    propertyAmenities: [],
    image: hasImage ? {
      id: `image-${id}`,
      property_id: null,
      room_type_id: id,
      media_type: "photo",
      url: "https://example.com/room.jpg",
      thumbnail_url: null,
      alt_text: "Room",
      sort_order: 0,
    } : null,
  };
}

describe("Phase 3 deterministic ranking", () => {
  it("prioritizes closer capacity before completeness bonuses", () => {
    const ranked = rankRoomSearchResults(
      [candidate("large", 6, true, true), candidate("exact", 2)],
      DEFAULT_ROOM_SEARCH_PARAMS,
    );
    expect(ranked.map((item) => item.room.id)).toEqual(["exact", "large"]);
  });

  it("is stable for identical inputs and uses name/id tie breakers", () => {
    const input = [candidate("b", 2), candidate("a", 2)];
    const first = rankRoomSearchResults(input, DEFAULT_ROOM_SEARCH_PARAMS).map((item) => item.room.id);
    const second = rankRoomSearchResults(input, DEFAULT_ROOM_SEARCH_PARAMS).map((item) => item.room.id);
    expect(first).toEqual(["a", "b"]);
    expect(second).toEqual(first);
  });
});
