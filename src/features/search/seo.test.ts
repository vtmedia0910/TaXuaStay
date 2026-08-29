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
      expect(text).toContain("chưa được kiểm chứng theo tiêu chuẩn Cloud View Verified");
      expect(text).not.toContain("đã xác minh");
      expect(text).not.toMatch(/\b9\.\d\b|tốt nhất/i);
    }
  });

  it("keeps implementation vocabulary out of customer-facing landing copy", () => {
    for (const page of Object.values(SEO_LANDING_PAGES)) {
      const customerCopy = [
        page.title,
        page.description,
        page.h1,
        page.intro,
        page.criteria,
        "note" in page ? page.note : undefined,
      ].filter(Boolean).join(" ");

      expect(customerCopy).not.toMatch(
        /\b(room type|property|facts?|availability|phase \d+|view_type|max_guests|bathroom_type)\b/i,
      );
    }
  });

  it("uses deterministic couple, group, car, and hotel rules", () => {
    expect(SEO_LANDING_PAGES["homestay-cho-couple-ta-xua"].preset).toEqual({ maxGuests: 2, bathroomTypes: ["private", "ensuite"] });
    expect(SEO_LANDING_PAGES["homestay-cho-nhom-ta-xua"].preset).toEqual({ minGuests: 4 });
    expect(SEO_LANDING_PAGES["homestay-co-cho-do-o-to-ta-xua"].preset).toEqual({ carAccess: "yes", parking: "yes" });
    expect(SEO_LANDING_PAGES["khach-san-ta-xua"].preset).toEqual({ propertyTypes: ["hotel"] });
  });
});
