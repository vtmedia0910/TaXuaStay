import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609010029_phase10_my_trip_verification_projection.sql"),
  "utf8",
).toLowerCase();

describe("Phase 10 verification projection migration", () => {
  it("preserves the existing code-plus-token authorization boundary", () => {
    expect(sql).toContain("booking_code = upper(btrim(target_booking_code))");
    expect(sql).toContain("public_access_token_hash = target_token_hash");
    expect(sql).toContain("if not found then return null");
    expect(sql).toContain("grant execute on function public.get_public_booking_status(text,text) to anon, authenticated");
  });

  it("derives a minimal allow-list from the immutable item snapshot", () => {
    expect(sql).toContain("i.verification_snapshot ? 'room_verified'");
    expect(sql).toContain("jsonb_typeof(i.verification_snapshot->'cloud_view')");
    expect(sql).toContain("jsonb_typeof(i.verification_snapshot->'road')");
    for (const key of ["room_verified", "cloud_view_verified", "road_verified", "road_grade"]) {
      expect(sql).toContain(`'${key}'`);
    }
    expect(sql).not.toMatch(/'verification'\s*,\s*i\.verification_snapshot/);
    expect(sql).not.toMatch(/'verification_snapshot'\s*,/);
  });

  it("does not expose private Booking data or weaken table access", () => {
    expect(sql).not.toMatch(/grant\s+select\s+on\s+(?:table\s+)?public\.(?:booking_items|bookings|booking_item_confirmations|booking_events)/);
    expect(sql).not.toMatch(/disable\s+row\s+level\s+security/);
    expect(sql).not.toMatch(/'customer_(?:name|phone|email|zalo|note)'\s*,/);
    expect(sql).not.toMatch(/'(?:net_cost_vnd|internal_note|internal_detail|supplier_snapshot|actor_user_id|margin|contribution)'\s*,/);
  });
});
