import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const requestPage = readFileSync(resolve(process.cwd(), "src/app/(public)/booking/request/page.tsx"), "utf8");
const requestForm = readFileSync(resolve(process.cwd(), "src/components/trip/booking-request-form.tsx"), "utf8");
const statusPage = readFileSync(resolve(process.cwd(), "src/app/(public)/booking/[bookingCode]/page.tsx"), "utf8");
const sitemap = readFileSync(resolve(process.cwd(), "src/features/search/sitemap.ts"), "utf8");

describe("Phase 8 public Booking surfaces", () => {
  it("keeps request and tokenized status pages out of search indexes", () => {
    for (const source of [requestPage, statusPage]) {
      expect(source).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*noarchive:\s*true,\s*nocache:\s*true\s*\}/);
    }
    expect(sitemap).not.toMatch(/["'`]\/booking(?:\/|["'`])/);
  });

  it("does not present the request as held, confirmed, booked, or paid", () => {
    expect(requestPage).toContain("CHƯA GIỮ CHỖ");
    expect(requestForm).toContain("chưa phải đặt chỗ");
    expect(requestForm).toContain("Chưa có phòng, xe, dịch vụ hay khoản thanh toán nào được giữ");
    expect(statusPage).toContain("không đồng nghĩa với đã giữ chỗ, đã xác nhận hoặc đã thanh toán");
  });
});
