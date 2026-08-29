import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPropertyStructuredData } from "@/features/search/structured-data";
import { buildPublicSitemap, buildStaticSitemapPaths } from "@/features/search/sitemap";
import type { PublicPropertyDto } from "@/features/properties/types";

describe("Phase 3 SEO output", () => {
  it("builds sitemap entries from public records without admin routes", () => {
    const sitemap = buildPublicSitemap(
      new URL("https://stay.example"),
      ["/", "/tim-phong", "/homestay-ta-xua"],
      {
        properties: [{ slug: "public-stay", updated_at: "2026-08-29T00:00:00Z" }],
        rooms: [{ slug: "public-room", updated_at: "2026-08-29T00:00:00Z", property: { slug: "public-stay" } }],
      },
    );
    expect(sitemap.map((entry) => entry.url)).toContain("https://stay.example/homestay/public-stay");
    expect(sitemap.map((entry) => entry.url)).toContain("https://stay.example/homestay/public-stay/phong/public-room");
    expect(JSON.stringify(sitemap)).not.toContain("/admin");
  });

  it("uses anon/RLS sitemap data rather than service role", () => {
    const source = readFileSync(new URL("./data.ts", import.meta.url), "utf8");
    expect(source).toContain("createPublicSupabaseClient");
    expect(source).not.toContain("createServiceRoleClient");
    expect(source).not.toContain('"publish_status"');
  });

  it("adds /verified only when brand-domain indexing is enabled", () => {
    expect(buildStaticSitemapPaths(["homestay-ta-xua"], false)).not.toContain("/verified");
    expect(buildStaticSitemapPaths(["homestay-ta-xua"], true)).toContain("/verified");
  });

  it("emits factual lodging structured data without rating, price, review, or availability", () => {
    const property: PublicPropertyDto = {
      id: "property-1",
      slug: "stay-one",
      name: "Stay One",
      property_type: "homestay",
      short_description: "Thông tin thực tế",
      description: null,
      area_name: "Tà Xùa",
      address: null,
      latitude: null,
      longitude: null,
      altitude_m: null,
      google_maps_url: null,
      public_phone: null,
      public_zalo_url: null,
      check_in_time: "14:00:00",
      check_out_time: "12:00:00",
      road_access_grade: "unknown",
      car_access: "unknown",
      motorbike_access: "unknown",
      parking: "unknown",
      restaurant: false,
      breakfast: false,
      bbq: false,
      wifi: true,
      is_featured: false,
      updated_at: "2026-08-29T00:00:00Z",
    };
    const output = JSON.stringify(buildPropertyStructuredData(property, [], "https://stay.example/homestay/stay-one"));
    for (const forbidden of ["aggregateRating", "review", "priceRange", "availability"]) {
      expect(output).not.toContain(forbidden);
    }
  });
});
