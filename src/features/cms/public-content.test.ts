import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findCmsSection, getDefaultCmsPage } from "@/features/cms/defaults";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("CMS public integration", () => {
  it("has truthful fallbacks when Supabase or CMS content is unavailable", () => {
    const home = getDefaultCmsPage("home");
    expect(findCmsSection(home, "hero")).toMatchObject({ heading: "Đi thật. Biết trước.", cta_href: "/stay" });
    expect(findCmsSection(home, "verified_rooms")?.body).toContain("không tạo thẻ mẫu");
    expect(getDefaultCmsPage("stay").seo_title).toContain("Homestay Tà Xùa");
  });

  it("keeps operational truth in domain features instead of CMS", () => {
    const home = source("src/app/(public)/page.tsx");
    expect(home).toContain("searchPublicRooms");
    expect(home).toContain("item.cloudView");
    expect(home).toContain("selectedRoomIds");
    expect(home).not.toMatch(/cms.*(price|availability|verification).*=/i);
  });

  it("uses CMS metadata without delegating canonical or robots to editors", () => {
    const home = source("src/app/(public)/page.tsx");
    const stay = source("src/app/(public)/tim-phong/page.tsx");
    expect(home).toContain("cms.seo_title");
    expect(stay).toContain("cms.seo_description");
    expect(home).toContain('canonical: "/"');
    expect(stay).toContain('canonical: "/stay"');
    expect(home).toContain("getPublicPageRobots()");
  });

  it("provides protected draft preview and safe public fallbacks", () => {
    expect(source("src/app/admin/(protected)/content/preview/page.tsx")).toContain("getAdminCmsPage");
    expect(source("src/features/cms/data.ts")).toContain("getDefaultCmsPage(pageKey)");
    expect(source("src/features/cms/actions.ts")).toContain("revalidatePath");
  });
});
