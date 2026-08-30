import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC_SOURCE_FILES = [
  "src/app/(public)/page.tsx",
  "src/app/(public)/tim-phong/page.tsx",
  "src/app/(public)/[seoSlug]/page.tsx",
  "src/app/(public)/homestay/[slug]/phong/[roomSlug]/page.tsx",
  "src/components/trip/trip-header.tsx",
  "src/components/trip/trip-footer.tsx",
  "src/components/verification/property-verified-section.tsx",
  "src/components/verification/room-verified-section.tsx",
  "src/components/search/search-form.tsx",
  "src/components/search/search-results.tsx",
  "src/components/media/media-gallery.tsx",
] as const;

describe("customer-facing copy", () => {
  it("does not expose known implementation labels", () => {
    const source = PUBLIC_SOURCE_FILES
      .map((file) => readFileSync(resolve(process.cwd(), file), "utf8"))
      .join("\n");

    for (const forbidden of [
      "PHASE 3",
      "ROOM-FIRST",
      "Room-first discovery",
      "DISCOVERY THEO Ý ĐỊNH",
      "Property và room type",
      "Tiện ích property",
      "availability ở phase sau",
      "public Supabase URL",
      "anon key",
      "Giới hạn dữ liệu",
      "Media của đúng loại phòng",
      "View cơ bản",
      "amenity đã xuất bản",
      "loại phòng đã xuất bản",
      "TÀ XÙA STAY",
      "Phase 2.5",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
