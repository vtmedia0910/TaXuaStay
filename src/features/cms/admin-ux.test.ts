import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CMS_MEDIA_ROLE_LABELS, getCmsSectionLabel, getCmsSectionTypeLabel } from "@/features/cms/ui";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Phase 2.6H CMS Admin UX", () => {
  it("centralizes friendly section and media language", () => {
    expect(getCmsSectionLabel("hero")).toBe("Hero đầu trang");
    expect(getCmsSectionLabel("verified_rooms")).toContain("đã thẩm định");
    expect(getCmsSectionTypeLabel("dynamic_room_grid")).toBe("Dữ liệu tự động");
    expect(CMS_MEDIA_ROLE_LABELS.og).toBe("Ảnh chia sẻ mạng xã hội");
    expect(CMS_MEDIA_ROLE_LABELS.general).toBe("Ảnh dùng chung");
  });

  it("uses collapsed section cards, an outline, locked dynamic truth, and no manual sort field", () => {
    const editor = source("src/components/admin/cms-page-editor.tsx");
    expect(editor).toContain("<details");
    expect(editor).toContain("Cấu trúc");
    expect(editor).toContain("DỮ LIỆU HỆ THỐNG");
    expect(editor).toContain("reorderCmsSectionAction");
    expect(editor).not.toContain('label="Thứ tự"');
    expect(editor).not.toContain('name="sort_order"');
    expect(editor).not.toContain("Lưu section");
    expect(source("src/features/cms/actions.ts")).toContain('sort_order: Number(lastItem.data?.sort_order ?? 0) + 10');
  });

  it("keeps publish/archive controls admin-only in UI and actions", () => {
    const editor = source("src/components/admin/cms-page-editor.tsx");
    const actions = source("src/features/cms/actions.ts");
    expect(editor).toContain('role === "admin"');
    expect(editor).toContain("XUẤT BẢN");
    expect(editor).toContain("Nâng cao / Vùng nguy hiểm");
    expect(actions).toContain('requireAdminUser(["admin"]');
    expect(actions).toContain("cms-publish-forbidden");
    expect(actions).toContain("cms-media-archive-forbidden");
  });

  it("provides a bounded media library, picker, focal controls, and usage labels", () => {
    expect(source("src/app/admin/(protected)/site-media/page.tsx")).toContain("pageSize: 24");
    expect(source("src/components/admin/cms-media-library.tsx")).toContain("Đang dùng tại");
    expect(source("src/components/admin/cms-media-picker.tsx")).toContain("Chọn từ thư viện media");
    const focal = source("src/components/admin/focal-point-picker.tsx");
    expect(focal).toContain('type="range"');
    expect(focal).toContain("setFromPointer");
  });
});
