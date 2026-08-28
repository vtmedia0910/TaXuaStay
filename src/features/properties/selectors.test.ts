import { describe, expect, it } from "vitest";
import { PUBLIC_AMENITY_QUERY } from "@/features/amenities/columns";
import { MEDIA_QUERY } from "@/features/media/columns";
import { PUBLIC_PROPERTY_QUERY } from "@/features/properties/columns";
import { PUBLIC_ROOM_QUERY } from "@/features/rooms/columns";

describe("Phase 2 public selectors", () => {
  it("use allow-listed fields without internal audit or wildcard columns", () => {
    const selectors = [PUBLIC_PROPERTY_QUERY, PUBLIC_ROOM_QUERY, PUBLIC_AMENITY_QUERY, MEDIA_QUERY];
    for (const selector of selectors) {
      expect(selector).not.toContain("*");
      expect(selector).not.toContain("updated_by");
      expect(selector).not.toContain("created_by");
      expect(selector).not.toContain("captured_by_user_id");
      expect(selector).not.toContain("verified_by_user_id");
    }
    expect(PUBLIC_PROPERTY_QUERY).not.toContain("publish_status");
    expect(PUBLIC_ROOM_QUERY).not.toContain("publish_status");
  });
});
