import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE } from "@/config/site";
import { PUBLIC_ROUTE_COMPATIBILITY, buildPropertyPath, buildRoomPath } from "@/config/routes";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V2 Phase 2.5 public brand and UX", () => {
  it("uses Tà Xùa Trip as the public master brand", () => {
    expect(SITE).toMatchObject({ name: "TÀ XÙA TRIP", tagline: "Đi thật. Biết trước." });
    const homepage = source("src/app/(public)/page.tsx");
    const defaults = source("src/features/cms/defaults.ts");
    expect(defaults).toContain("Đi thật. Biết trước.");
    expect(defaults).toContain("TÀ XÙA TRIP");
    expect(homepage).toContain("getPublicCmsPage");
    expect(homepage).not.toContain("TÀ XÙA STAY");
  });

  it("keeps public navigation separate from Admin and exposes a mobile menu", () => {
    const header = source("src/components/trip/trip-header.tsx");
    for (const label of ["Khám phá", "Lưu trú", "Combo", "Xe khách", "Xe máy", "Cẩm nang", "Về chúng tôi"]) {
      expect(header).toContain(`label: "${label}"`);
    }
    expect(header).toContain("trip-mobile-menu");
    expect(header).not.toContain("/admin");
    expect(header).not.toContain("Quản trị");
  });

  it("makes /stay canonical while preserving compatibility routes", () => {
    expect(PUBLIC_ROUTE_COMPATIBILITY).toContainEqual(expect.objectContaining({ current: "/tim-phong", target: "/stay" }));
    expect(buildPropertyPath("po-mu")).toBe("/stay/po-mu");
    expect(buildRoomPath("po-mu", "may")).toBe("/stay/po-mu/may");
    expect(source("src/app/(public)/stay/page.tsx")).toContain("tim-phong/page");
    expect(source("src/app/(public)/stay/[slug]/page.tsx")).toContain("homestay/[slug]/page");
    expect(source("src/app/(public)/stay/[slug]/[roomSlug]/page.tsx")).toContain("homestay/[slug]/phong/[roomSlug]/page");
    expect(source("src/app/(public)/tim-phong/page.tsx")).toContain('canonical: "/stay"');
  });

  it("keeps search, price, availability and verification as distinct facts", () => {
    const roomPage = source("src/app/(public)/homestay/[slug]/phong/[roomSlug]/page.tsx");
    expect(roomPage).toContain("<PriceSummary");
    expect(roomPage).toContain("<AvailabilitySummary");
    expect(roomPage).toContain("<RoomVerifiedSection");
    expect(roomPage).not.toMatch(/overall\s*score/i);
  });

  it("does not fabricate unimplemented transport or combo commerce", () => {
    const homepage = source("src/app/(public)/page.tsx");
    expect(homepage).toContain("Sắp có");
    expect(homepage).toContain("chưa nhận đặt trên website");
    expect(homepage).toContain("chưa có tích hợp đặt xe");
    for (const forbidden of ["Đặt xe ngay", "Đặt combo ngay", "1.190.000", "5.000+", "99% hài lòng"]) {
      expect(homepage).not.toContain(forbidden);
    }
  });

  it("keeps the temporary deployment noindex policy intact", () => {
    const layout = source("src/app/layout.tsx");
    const robots = source("src/app/robots.ts");
    const seo = source("src/config/seo.ts");
    expect(layout).toContain("getPublicPageRobots");
    expect(robots).toContain("buildPublicRobotsFile");
    expect(seo).toContain("getSiteDeploymentPolicy");
  });
});
