import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608290010_v2_verified_room_profile.sql",
  "utf8",
);

describe("V2 exact-room verification RPC permission correction", () => {
  it("restores authenticated execution on the physical-room-aware core RPC", () => {
    expect(migration).toContain(
      "grant execute on function public.save_verification_core(\n" +
      "  uuid, text, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]\n" +
      ") to authenticated;",
    );
  });
});
