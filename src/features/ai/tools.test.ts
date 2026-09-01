import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ASSISTANT_TOOL_NAMES, createAssistantToolRegistry, PUBLIC_CMS_PAGE_ALLOWLIST } from "@/features/ai/tools";

describe("Phase 13 allow-listed read-only tools", () => {
  it("exposes exactly the nine approved tools and only published CMS pages", () => {
    expect([...createAssistantToolRegistry().keys()]).toEqual(ASSISTANT_TOOL_NAMES);
    expect(PUBLIC_CMS_PAGE_ALLOWLIST).toEqual(["home", "stay", "verified", "footer", "faq"]);
    expect(ASSISTANT_TOOL_NAMES.every((name) => !/create|update|cancel|send|mark|refund/i.test(name))).toBe(true);
  });

  it("rejects invalid dates, unreasonable rooms and malformed booking codes before data access", async () => {
    const tools = createAssistantToolRegistry();
    await expect(tools.get("get_availability")?.execute({ property_slug: "p", room_slug: "r", check_in: "2026-09-02", check_out: "2026-09-03", rooms: 500 })).rejects.toBeTruthy();
    await expect(tools.get("get_price")?.execute({ property_slug: "p", room_slug: "r", check_in: "2026-09-02", check_out: "2076-09-03" })).rejects.toBeTruthy();
    await expect(tools.get("get_booking_public_status")?.execute({ booking_code: "TX-INVALID" })).rejects.toBeTruthy();
    await expect(tools.get("search_public_content")?.execute({ query: "x" })).rejects.toBeTruthy();
  });

  it("contains no private economics source, generic database tool or package component price summation", () => {
    const content = readFileSync(resolve(process.cwd(), "src/features/ai/tools.ts"), "utf8");
    expect(content).not.toMatch(/getAdminCommercial|resolveRoomEconomics|query_database|createServerSupabaseClient|service.?role/i);
    expect(content).not.toMatch(/component.*sell_price|sell_price.*component/i);
    expect(content).toContain("quote.sell_price.total_vnd");
    expect(content).toContain("getPublicBookingStatus");
  });
});
