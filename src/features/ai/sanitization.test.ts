import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { redactUserPII, sanitizeAssistantText, sanitizeProviderContext } from "@/features/ai/sanitization";

describe("Phase 13 customer-safe DTO sanitization", () => {
  it("preserves unknown, false and true as three separate values", () => {
    expect(sanitizeProviderContext({ cloud: null, road: false, room: true })).toEqual({ cloud: null, road: false, room: true });
  });

  it("strips PII/private economics/operations and credential-shaped fields", () => {
    const safe = sanitizeProviderContext({
      title: "Phòng A", supplier_phone: "0900000000", staff_id: "staff-1", net_cost_vnd: 100,
      margin_bps: 2000, internal_note: "private", booking_token: "opaque", telegram_chat_id: -1001,
      nested: { contribution_vnd: 50, public_label: "Đã xác minh" },
    });
    expect(safe).toEqual({ title: "Phòng A", nested: { public_label: "Đã xác minh" } });
  });

  it("redacts credential-like text and bounds provider output", () => {
    expect(sanitizeAssistantText("Bearer abc.def.ghi")).toBe("[redacted]");
    expect(sanitizeAssistantText("x".repeat(3_000))).toHaveLength(2_400);
  });

  it("removes unnecessary email and phone PII before provider context", () => {
    expect(redactUserPII("Liên hệ an@example.com hoặc 0987 654 321")).toBe("Liên hệ [email đã ẩn] hoặc [số điện thoại đã ẩn]");
    expect(redactUserPII("Booking TX-20260902-ABC123")).toBe("Booking TX-20260902-ABC123");
  });
});
