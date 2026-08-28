import { describe, expect, it } from "vitest";
import { SEARCH_MEDIA_QUERY, SEARCH_PROPERTY_QUERY, SEARCH_ROOM_WITH_PROPERTY_QUERY } from "@/features/search/columns";

describe("Phase 3 public search DTO", () => {
  it("uses explicit public-safe selectors", () => {
    const selectors = [SEARCH_MEDIA_QUERY, SEARCH_PROPERTY_QUERY, SEARCH_ROOM_WITH_PROPERTY_QUERY];
    for (const selector of selectors) {
      expect(selector).not.toContain("*");
      expect(selector).not.toContain("updated_by");
      expect(selector).not.toContain("created_by");
      expect(selector).not.toContain("verified_by_user_id");
      expect(selector).not.toContain("publish_status");
    }
    expect(SEARCH_ROOM_WITH_PROPERTY_QUERY).not.toContain("quantity");
  });
});
