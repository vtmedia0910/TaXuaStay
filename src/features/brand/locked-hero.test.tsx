import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HeroMedia } from "@/components/trip/hero-media";
import { TripHero } from "@/components/trip/trip-hero";
import type { CmsMediaAsset, CmsSection } from "@/features/cms/types";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function media(id: string, focalX: number, focalY: number): CmsMediaAsset {
  return {
    id,
    title: id,
    alt_text: `Phong cảnh ${id}`,
    caption: null,
    media_type: "image",
    role: "hero",
    storage_bucket: null,
    storage_path: null,
    external_url: `https://images.example.com/${id}.webp`,
    mime_type: "image/webp",
    width: 1600,
    height: 900,
    focal_x: focalX,
    focal_y: focalY,
  };
}

function heroSection(): CmsSection {
  return {
    id: "hero",
    page_id: "home",
    section_key: "hero",
    section_type: "hero",
    eyebrow: "Nội dung CMS cũ",
    heading: "Nội dung CMS cũ",
    body: "Nội dung CMS cũ",
    cta_label: "Nội dung CMS cũ",
    cta_href: "/stay",
    desktop_media_id: "desktop",
    mobile_media_id: "mobile",
    sort_order: 10,
    max_items: null,
    desktop_media: media("desktop", 72, 42),
    mobile_media: media("mobile", 38, 54),
    items: [],
  };
}

describe("locked Tà Xùa Trip Hero", () => {
  it("uses CMS art direction, alt text, and breakpoint-specific focal points", () => {
    const html = renderToStaticMarkup(
      <HeroMedia desktop={media("desktop", 72, 42)} mobile={media("mobile", 38, 54)} />,
    );

    expect(html).toContain("<picture");
    expect(html).toContain('media="(min-width: 768px)"');
    expect(html).toContain("desktop.webp");
    expect(html).toContain("mobile.webp");
    expect(html).toContain("--hero-desktop-position:72% 42%");
    expect(html).toContain("--hero-mobile-position:38% 54%");
    expect(html).toContain('alt="Phong cảnh desktop"');
    expect(html).toContain('fetchPriority="high"');
  });

  it("falls mobile back to the desktop CMS asset without inventing an image", () => {
    const html = renderToStaticMarkup(<HeroMedia desktop={media("desktop", 61, 47)} mobile={null} />);
    expect(html.match(/desktop\.webp/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("--hero-mobile-position:61% 47%");
    expect(renderToStaticMarkup(<HeroMedia desktop={null} mobile={null} />)).toBe("");
  });

  it("locks public brand content and removes the old SaaS-side card", () => {
    const html = renderToStaticMarkup(<TripHero hero={heroSection()} />);
    for (const copy of [
      "TÀ XÙA TRIP",
      "Đi thật. Biết trước.",
      "Tà Xùa, trước khi bạn đến.",
      "Phòng thật, thông tin thật",
      "Biết rõ trước khi chọn",
      "Kết nối cả chuyến đi",
    ]) {
      expect(html).toContain(copy);
    }
    expect(html).not.toContain("Trước khi đặt, bạn biết");
    expect(html).not.toContain("Đúng loại phòng");
  });

  it("uses a transparent homepage header mode and no global white-wash layer", () => {
    const header = source("src/components/trip/trip-header.tsx");
    const layout = source("src/app/(public)/layout.tsx");
    const homepage = source("src/app/(public)/page.tsx");
    const css = source("src/app/globals.css");
    expect(header).toContain("trip-site-header");
    expect(layout).toContain("trip-public-shell");
    expect(css).toContain(".trip-public-shell:has(.trip-home-hero) > .trip-site-header");
    expect(css).toContain(".trip-home-hero-overlay");
    expect(homepage).not.toContain("bg-white/72");
    expect(homepage).not.toContain("Đúng loại phòng");
  });

  it("renders the exact functional stay fields, tabs, preferences, and trust copy", () => {
    const html = renderToStaticMarkup(<TripHero hero={heroSection()} />);
    for (const field of ["Nhận phòng", "Trả phòng", "Số khách", "Số phòng"]) {
      expect(html).toContain(field);
    }
    expect(html).toContain('action="/stay"');
    expect(html).toContain("TÌM PHÒNG PHÙ HỢP");
    expect(html).not.toContain("Điểm đến");
    expect(html).not.toContain("Loại chỗ ở");

    for (const tab of ["Lưu trú", "Combo", "Xe khách", "Xe máy"]) expect(html).toContain(tab);
    expect(html.match(/Sắp có/g)).toHaveLength(3);
    for (const chip of ["Đã thẩm định", "Săn mây", "View từ giường", "Ô tô vào được"]) {
      expect(html).toContain(chip);
    }
    for (const forbidden of ["Cloud View", "Bình minh", "Hoàng hôn", "Thung lũng", "24/7"]) {
      expect(html).not.toContain(forbidden);
    }

    for (const trust of [
      "Thẩm định tại chỗ",
      "Video / ảnh 360°",
      "Nói cả ưu &amp; nhược điểm",
      "Dữ liệu có ngày xác minh",
    ]) {
      expect(html).toContain(trust);
    }
  });
});
