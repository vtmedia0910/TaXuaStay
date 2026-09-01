import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const operationsPage = readFileSync(resolve(process.cwd(), "src/app/admin/(protected)/operations/page.tsx"), "utf8");
const inboxPage = readFileSync(resolve(process.cwd(), "src/app/admin/(protected)/bookings/page.tsx"), "utf8");
const panel = readFileSync(resolve(process.cwd(), "src/components/admin/booking-operations-panel.tsx"), "utf8");
const queue = readFileSync(resolve(process.cwd(), "src/components/admin/operations-queue.tsx"), "utf8");
const health = readFileSync(resolve(process.cwd(), "src/app/admin/(protected)/operations/data-health/page.tsx"), "utf8");
const actions = readFileSync(resolve(process.cwd(), "src/features/operations/actions.ts"), "utf8");

describe("Phase 11 mobile Admin Operations UI", () => {
  it("puts urgent work, real metrics and bounded filters in the Operations first viewport", () => {
    for (const text of ["Cần xử lý ngay", "Chờ Supplier", "Quá hạn", "Quote sắp hết", "Cần requote", "Declined / thay", "Checkout ready", "Data Health"]) {
      expect(operationsPage).toContain(text);
    }
    expect(operationsPage).toContain("phase11-operations-priority-v1");
    expect(operationsPage).toContain("getAdminOperationsView");
    expect(operationsPage).toContain("Không ưu tiên theo margin hoặc Partner tier");
    expect(operationsPage).not.toMatch(/fake score|AI score|customer spend/i);
  });

  it("supports meaningful inbox search, filters and sorts without a horizontal table", () => {
    for (const value of ["needs_attention", "pending", "overdue", "needs_requote", "quote_expiring", "declined", "replacement", "checkout_blocked", "ready", "cancelled", "completed"]) {
      expect(inboxPage).toContain(`value="${value}"`);
    }
    for (const value of ["priority", "oldest_pending", "trip_date", "quote_expiry", "newest"]) expect(inboxPage).toContain(`value="${value}"`);
    expect(inboxPage).not.toContain("<table");
  });

  it("shows blockers, next action, aging, changes, replacement and history with mobile-safe wrapping", () => {
    for (const text of ["Hành động tiếp theo", "Chờ lâu nhất", "Theo dõi Supplier Confirmation", "Yêu cầu thay đổi có kiểm soát", "Thao tác rủi ro cao", "Lịch sử Supplier Confirmation"]) {
      expect(panel).toContain(text);
    }
    expect(queue).toMatch(/min-w-0|break-words/);
    expect(panel).not.toContain("<table");
    expect(panel).not.toMatch(/Mark Paid|Đánh dấu đã thanh toán|AI recommendation/i);
  });

  it("enforces Admin decisions in both UI and server action and shows truthful empty Data Health", () => {
    expect(panel).toContain('userRole === "admin"');
    expect(actions).toContain('user.role !== "admin"');
    expect(actions).toContain("target_expected_revision");
    expect(health).toContain("Không có vấn đề Data Health trong phạm vi hiện tại");
    expect(health).toContain("Không có điểm chất lượng hoặc cảnh báo được tạo giả");
  });
});
