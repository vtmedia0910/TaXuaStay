import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(resolve(process.cwd(), "src/app/(public)/booking/[bookingCode]/page.tsx"), "utf8");
const dashboard = readFileSync(resolve(process.cwd(), "src/components/trip/my-trip-dashboard.tsx"), "utf8");
const data = readFileSync(resolve(process.cwd(), "src/features/bookings/data.ts"), "utf8");
const notFound = readFileSync(resolve(process.cwd(), "src/app/(public)/booking/[bookingCode]/not-found.tsx"), "utf8");
const error = readFileSync(resolve(process.cwd(), "src/app/(public)/booking/[bookingCode]/error.tsx"), "utf8");
const loading = readFileSync(resolve(process.cwd(), "src/app/(public)/booking/[bookingCode]/loading.tsx"), "utf8");
const sitemap = readFileSync(resolve(process.cwd(), "src/features/search/sitemap.ts"), "utf8");

describe("Phase 10 secure My Trip public UX", () => {
  it("keeps the existing code-plus-opaque-cookie access boundary and noindex policy", () => {
    expect(page).toContain("getPublicBookingStatus(bookingCode)");
    expect(page).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*noarchive:\s*true,\s*nocache:\s*true\s*\}/);
    expect(data).toContain("BOOKING_ACCESS_COOKIE");
    expect(data).toContain("createHash(\"sha256\").update(token)");
    expect(data).toContain("target_token_hash: tokenHash");
    expect(sitemap).not.toMatch(/["'`]\/(?:booking|my-trip)(?:\/|["'`])/);
  });

  it("puts the mobile trip status, action, components, quote, timeline and support in customer order", () => {
    const ordered = ["Chuyến đi của bạn", "Trạng thái hiện tại", "Dịch vụ trong chuyến đi", "Giá và bước tiếp theo", "Dòng thời gian chuyến đi", "Cần đội ngũ kiểm tra thêm?"];
    for (const copy of ordered) expect(dashboard).toContain(copy);
    for (let index = 1; index < ordered.length; index += 1) expect(dashboard.indexOf(ordered[index]!)).toBeGreaterThan(dashboard.indexOf(ordered[index - 1]!));
    expect(dashboard).toContain("min-h-11");
    expect(dashboard).toContain("min-w-0");
    expect(dashboard).toContain("được lưu tại lúc gửi yêu cầu");
  });

  it("has generic loading, error and invalid-access states without enumeration details", () => {
    expect(loading).toContain("Đang tải tình trạng chuyến đi");
    expect(error).toContain("Chưa thể tải tình trạng chuyến đi.");
    expect(notFound).toContain("Liên kết không hợp lệ, không còn quyền truy cập hoặc chuyến đi không tồn tại");
    expect(notFound).not.toMatch(/token|database|Supabase|UUID/i);
  });

  it("does not add payment, AI, customer account or privileged data to the customer dashboard", () => {
    expect(dashboard).not.toMatch(/Thanh toán ngay|QR thanh toán|webhook|refund|AI Assistant|đăng nhập|đăng ký/i);
    expect(`${page}\n${dashboard}`).not.toMatch(/net_cost|gross_margin|contribution|supplier_contact|internal_note|actor_user_id|service_role|supabase_secret|access_token/i);
  });
});
