import { describe, expect, it } from "vitest";
import { buildChangePayload, createChangeRequestFormSchema, followUpConfirmationSchema } from "@/features/operations/schema";

const base = { booking_id: "10000000-0000-4000-8000-000000000001", expected_revision: "4", customer_reason: "", internal_note: "Căn cứ kiểm thử" };

describe("Phase 11 controlled operation schemas", () => {
  it("allows only a bounded date change payload", () => {
    const parsed = createChangeRequestFormSchema.parse({ ...base, change_type: "dates", check_in: "2026-09-10", check_out: "2026-09-12", adults: "", children: "", target_item_id: "", quantity: "", replacement_component_type: "", replacement_source_id: "" });
    expect(buildChangePayload(parsed)).toEqual({ check_in: "2026-09-10", check_out: "2026-09-12" });
  });

  it("rejects incomplete, cross-type replacement input", () => {
    const result = createChangeRequestFormSchema.safeParse({ ...base, change_type: "replace_item", check_in: "", check_out: "", adults: "", children: "", target_item_id: "10000000-0000-4000-8000-000000000002", quantity: "", replacement_component_type: "ROOM", replacement_source_id: "" });
    expect(result.success).toBe(false);
  });

  it("requires a confirmation revision and an explicit follow-up reason", () => {
    expect(followUpConfirmationSchema.safeParse({ booking_id: base.booking_id, confirmation_id: "10000000-0000-4000-8000-000000000003", expected_updated_at: "2026-09-01T08:00:00Z", reason: "Gọi lại Supplier" }).success).toBe(true);
    expect(followUpConfirmationSchema.safeParse({ booking_id: base.booking_id, confirmation_id: "10000000-0000-4000-8000-000000000003", expected_updated_at: "2026-09-01T08:00:00Z", reason: "" }).success).toBe(false);
  });
});
