import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V2 Phase 5 mobile-first public and Admin UI", () => {
  it("keeps the public CTA truthful and never claims booking or live inventory", () => {
    const landing = source("src/app/(public)/motorbike/page.tsx");
    const detail = source("src/components/trip/motorbike-detail-experience.tsx");
    expect(detail).toContain("Yêu cầu xác nhận");
    expect(detail).toContain("không tạo đơn thuê");
    expect(`${landing}\n${detail}`).not.toContain("Đặt xe thành công");
    expect(`${landing}\n${detail}`).not.toContain("Còn xe");
  });

  it("uses mobile-first full-width and sticky safe-area actions without a public table", () => {
    const landing = source("src/app/(public)/motorbike/page.tsx");
    const detail = source("src/components/trip/motorbike-detail-experience.tsx");
    const cards = source("src/components/trip/motorbike-offering-card.tsx");
    const loading = source("src/app/(public)/motorbike/loading.tsx");
    expect(landing).toContain("w-full");
    expect(detail).toContain("safe-area-inset-bottom");
    expect(detail).toContain("lg:hidden");
    expect(detail).toContain('className="size-full"');
    expect(cards).toContain('className="size-full"');
    expect(loading).toContain("motion-reduce:animate-none");
    expect(`${landing}\n${detail}`).not.toContain("<table");
  });

  it("provides useful empty, loading and error language without fake records", () => {
    expect(source("src/app/(public)/motorbike/loading.tsx")).toContain("aria-busy");
    const landing = source("src/app/(public)/motorbike/page.tsx");
    expect(landing).toContain("Chưa có lựa chọn xe máy được công khai");
    expect(landing).toContain("tạm thời chưa tải được");
    expect(landing).toContain("không tạo xe, giá hoặc trạng thái mẫu");
  });

  it("keeps Hero Xe máy disabled while production has no guaranteed real offering", () => {
    const hero = source("src/components/trip/hero-search-controls.tsx");
    expect(hero).toContain('{ label: "Xe máy", Icon: Bike, active: false }');
    expect(hero).toContain("Sắp có");
  });

  it("guards every motorbike mutation as Admin-only", () => {
    const actions = source("src/features/motorbike/actions.ts");
    const newPage = source("src/app/admin/(protected)/motorbike/new/page.tsx");
    expect(actions).toContain('requireAdminUser(["admin"]');
    expect(newPage).toContain('requireAdminUser(["admin"]');
  });
});
