import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Phase 12 Telegram Admin and webhook boundaries", () => {
  it("provides mobile-safe integration, one-time connect, assignments, health, worker and logs", () => {
    const page = source("src/app/admin/(protected)/integrations/telegram/page.tsx");
    const dashboard = source("src/components/admin/telegram-dashboard.tsx");
    const form = source("src/components/admin/telegram-connection-code-form.tsx");
    expect(page).toContain("Telegram Supplier");
    for (const text of ["Đã kết nối", "Outbox chờ xử lý", "Tin gửi thất bại", "Xử lý hàng đợi", "Nhân sự Tà Xùa Trip", "Giao nhận gần đây"]) expect(dashboard).toContain(text);
    expect(form).toContain("/connect");
    expect(dashboard).not.toContain("<table");
  });

  it("keeps webhook secrets server-only and callback data opaque", () => {
    const route = source("src/app/api/integrations/telegram/webhook/route.ts");
    const bot = source("src/features/telegram/bot.ts");
    expect(route).toContain("x-telegram-bot-api-secret-token");
    expect(route).toContain("verifyTelegramWebhookSecret");
    expect(route).toContain("process_telegram_supplier_callback");
    expect(bot).toContain('"TELEGRAM_BOT_TOKEN" | "TELEGRAM_WEBHOOK_SECRET"');
    expect(bot).toContain("process.env[name]");
    expect(bot).not.toMatch(/NEXT_PUBLIC_TELEGRAM|service_role|SUPABASE_SECRET_KEY/);
    expect(route).not.toMatch(/booking_item_id.*callback_data|supplier_id.*callback_data/);
  });

  it("adds explicit Booking dispatch and routes NEED_DISCUSSION into Operations", () => {
    const booking = source("src/app/admin/(protected)/bookings/[id]/page.tsx");
    const operations = source("src/features/operations/policy.ts");
    expect(booking).toContain("dispatchSupplierTelegramAction");
    expect(booking).toContain("Supplier cần trao đổi qua Telegram");
    expect(operations).toContain("supplier_discussion");
    expect(operations).toContain("FOLLOW_UP_CONFIRMATION");
  });
});
