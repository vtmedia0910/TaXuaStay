import { describe, expect, it } from "vitest";
import { telegramAssignmentSchema, telegramDisableSchema, telegramDispatchSchema, telegramTestSchema } from "@/features/telegram/schema";

const id = "11111111-1111-4111-8111-111111111111";

describe("Telegram Admin schemas", () => {
  it("bounds assignments and destructive disable reasons", () => {
    expect(telegramAssignmentSchema.safeParse({ supplier_id: id, user_id: id, assignment_role: "primary", is_active: "true" }).success).toBe(true);
    expect(telegramAssignmentSchema.safeParse({ supplier_id: id, user_id: id, assignment_role: "margin", is_active: "true" }).success).toBe(false);
    expect(telegramDisableSchema.safeParse({ supplier_id: id, channel_id: id, reason: "x" }).success).toBe(false);
  });

  it("requires stale-state facts for dispatch and an explicit owner test capability", () => {
    expect(telegramDispatchSchema.safeParse({ booking_id: id, confirmation_id: id, expected_confirmation_updated_at: "2026-09-01T01:00:00Z", expected_booking_revision: 2, dispatch_mode: "initial" }).success).toBe(true);
    expect(telegramDispatchSchema.safeParse({ booking_id: id, confirmation_id: id, expected_confirmation_updated_at: "2026-09-01T01:00:00Z", expected_booking_revision: 0, dispatch_mode: "initial" }).success).toBe(false);
    expect(telegramTestSchema.safeParse({ supplier_id: id, channel_id: id, owner_authorization: "not-approved" }).success).toBe(false);
  });
});
