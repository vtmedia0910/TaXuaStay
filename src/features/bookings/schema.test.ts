import { describe, expect, it } from "vitest";
import { bookingRequestSchema, publicBookingSelectionSchema } from "@/features/bookings/schema";

const token = "A".repeat(43);
const base = {
  check_in: "2026-09-10", check_out: "2026-09-12", adults: 2, children: 0, rooms: 1,
  customer_name: "Nguyễn An", customer_phone: "0912345678", customer_email: "", customer_zalo: "", customer_note: "",
  selections: JSON.stringify([{ type: "ROOM", source_id: "11111111-1111-4111-8111-111111111111", quantity: 1 }]),
  request_token: token, rendered_at: Date.now(), website: "",
};

describe("Phase 8 booking request validation", () => {
  it("accepts a bounded mobile form and keeps optional contact fields null", () => {
    const parsed = bookingRequestSchema.parse(base);
    expect(parsed.selections).toHaveLength(1);
    expect(parsed.customer_email).toBeNull();
    expect(parsed.customer_zalo).toBeNull();
  });

  it("rejects honeypot, invalid dates, excessive items, and browser-shaped price fields", () => {
    expect(bookingRequestSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, check_out: base.check_in }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, selections: JSON.stringify(Array.from({ length: 9 }, () => ({ type: "MOTORBIKE", source_slug: "xe-so" }))) }).success).toBe(false);
    const parsed = bookingRequestSchema.parse({ ...base, price_vnd: 0, availability: "available" });
    expect(parsed).not.toHaveProperty("price_vnd");
    expect(parsed).not.toHaveProperty("availability");
    expect(bookingRequestSchema.safeParse({ ...base, customer_note: "<b>gọi lại</b>" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, customer_zalo: "x" }).success).toBe(false);
  });

  it("distinguishes real source identities for Room, Motorbike, and Package", () => {
    expect(publicBookingSelectionSchema.safeParse({ type: "ROOM", source_id: "11111111-1111-4111-8111-111111111111" }).success).toBe(true);
    expect(publicBookingSelectionSchema.safeParse({ type: "MOTORBIKE", source_slug: "xe-so-ta-xua" }).success).toBe(true);
    expect(publicBookingSelectionSchema.safeParse({ type: "PACKAGE", source_id: "22222222-2222-4222-8222-222222222222", optional_component_keys: ["bua-sang"] }).success).toBe(true);
    expect(publicBookingSelectionSchema.safeParse({ type: "MOTORBIKE", source_slug: "../biker" }).success).toBe(false);
  });
});
