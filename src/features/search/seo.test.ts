import { describe, expect, it } from "vitest";
import { SEO_LANDING_PAGES, SEO_LANDING_SLUGS } from "@/features/search/seo";

describe("Phase 3 SEO landing configuration", () => {
  it("defines seven unique, canonical route intents", () => {
    expect(SEO_LANDING_SLUGS).toHaveLength(7);
    expect(new Set(SEO_LANDING_SLUGS).size).toBe(7);
    expect(new Set(SEO_LANDING_SLUGS.map((slug) => SEO_LANDING_PAGES[slug].title)).size).toBe(7);
    expect(new Set(SEO_LANDING_SLUGS.map((slug) => SEO_LANDING_PAGES[slug].h1)).size).toBe(7);
    for (const slug of SEO_LANDING_SLUGS) {
      expect(SEO_LANDING_PAGES[slug].intro.length).toBeGreaterThan(80);
    }
  });

  it("keeps cloud/view pages cautious before Phase 4", () => {
    for (const slug of ["homestay-san-may-ta-xua", "homestay-ta-xua-view-dep"] as const) {
      const text = JSON.stringify(SEO_LANDING_PAGES[slug]);
      expect(text).toContain("chưa phải Cloud View Verified");
      expect(text).not.toContain("đã xác minh");
      expect(text).not.toMatch(/\b9\.\d\b|tốt nhất/i);
    }
  });

  it("uses deterministic couple, group, car, and hotel rules", () => {
    expect(SEO_LANDING_PAGES["homestay-cho-couple-ta-xua"].preset).toEqual({ maxGuests: 2, bathroomTypes: ["private", "ensuite"] });
    expect(SEO_LANDING_PAGES["homestay-cho-nhom-ta-xua"].preset).toEqual({ minGuests: 4 });
    expect(SEO_LANDING_PAGES["homestay-co-cho-do-o-to-ta-xua"].preset).toEqual({ carAccess: "yes", parking: "yes" });
    expect(SEO_LANDING_PAGES["khach-san-ta-xua"].preset).toEqual({ propertyTypes: ["hotel"] });
  });
});
