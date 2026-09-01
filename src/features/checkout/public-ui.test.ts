import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const statusPage = readFileSync(resolve(process.cwd(), "src/app/(public)/booking/[bookingCode]/page.tsx"), "utf8");
const card = readFileSync(resolve(process.cwd(), "src/components/trip/checkout-readiness-card.tsx"), "utf8");
const admin = readFileSync(resolve(process.cwd(), "src/components/admin/booking-checkout-operations.tsx"), "utf8");

describe("Phase 9 public and Admin checkout UX", () => {
  it("keeps customer Booking status noindex and renders the safe readiness DTO", () => {
    expect(statusPage).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*noarchive:\s*true,\s*nocache:\s*true\s*\}/);
    expect(statusPage).toContain("<CheckoutReadinessCard checkout={booking.checkout}");
  });

  it("uses truthful customer copy without a fake payment action", () => {
    expect(card).toContain("Hệ thống mới chỉ kiểm tra điều kiện");
    expect(card).toContain("Thanh toán trực tuyến hiện chưa khả dụng");
    expect(card).toContain("không có mã QR, đường dẫn thanh toán hoặc nút thanh toán giả");
    expect(card).not.toMatch(/Thanh toán ngay|Mark Paid|Đã thanh toán/);
  });

  it("gives Admin quote/policy/draft operations without pretending a draft is a payment", () => {
    expect(admin).toContain("Tạo lại báo giá");
    expect(admin).toContain("Chính sách thanh toán trước");
    expect(admin).toContain("Tạo checkout draft");
    expect(admin).toContain("không phải giao dịch");
    expect(admin).not.toMatch(/Mark Paid|Đánh dấu đã thanh toán|payment provider/i);
  });
});
