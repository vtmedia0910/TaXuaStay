import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const list = readFileSync(resolve(process.cwd(), "src/app/(public)/packages/page.tsx"), "utf8");
const detail = readFileSync(resolve(process.cwd(), "src/app/(public)/packages/[slug]/page.tsx"), "utf8");
const sheet = readFileSync(resolve(process.cwd(), "src/components/trip/package-selection-sheet.tsx"), "utf8");
const homepage = readFileSync(resolve(process.cwd(), "src/app/(public)/page.tsx"), "utf8");

describe("V2 Phase 6 public package experience", () => {
  it("has truthful empty states and conditional homepage activation", () => {
    expect(list).toContain("Chưa có gói dịch vụ được công khai");
    expect(list).toContain("không tạo combo, giá hoặc ưu đãi mẫu");
    expect(homepage).toContain("packagesAvailable ?");
    expect(homepage).toContain("Chưa có gói dịch vụ thật đang được công khai");
  });

  it("uses a mobile-safe selector without creating customer intent", () => {
    expect(sheet).toContain('role="dialog"');
    expect(sheet).toContain('aria-modal="true"');
    expect(sheet).toContain("safe-area-inset-bottom");
    expect(sheet).toContain("Kiểm tra này không giữ phòng, giữ xe, tạo đặt chỗ hay xác nhận thanh toán");
  });

  it("never claims booking, payment, fake discount, or Package Verified", () => {
    const publicSource = `${list}\n${detail}`;
    for (const forbidden of ["Đặt ngay", "Thanh toán", "Đã giữ chỗ", "Package Verified", "Giảm ", "Tiết kiệm "]) {
      expect(publicSource).not.toContain(forbidden);
    }
    expect(detail).toContain("Cần xác nhận giá");
    expect(detail).toContain("Chưa có kênh yêu cầu an toàn");
  });
});
