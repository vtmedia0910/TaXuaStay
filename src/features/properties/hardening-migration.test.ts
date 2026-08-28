import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608290003_harden_phase2_accommodation.sql", import.meta.url),
  "utf8",
).toLowerCase();
const propertyAction = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const roomAction = readFileSync(new URL("../rooms/actions.ts", import.meta.url), "utf8");

describe("Phase 2 hardening migration", () => {
  it("migrates access booleans without inventing negative facts", () => {
    for (const field of ["car_access", "motorbike_access", "parking"]) {
      expect(migration).toContain(`alter column ${field} type text`);
      expect(migration).toContain(`check (${field} in ('unknown', 'yes', 'no'))`);
      expect(migration).toContain(`when ${field} then 'yes' else 'unknown'`);
      expect(migration).not.toContain(`when ${field} then 'yes' else 'no'`);
    }
  });

  it("removes physical quantity from anonymous reads", () => {
    expect(migration).toContain("revoke select (quantity) on table public.room_types from anon");
  });

  it("provides authenticated security-invoker atomic save RPCs", () => {
    expect(migration).toContain("function public.save_property_with_amenities");
    expect(migration).toContain("function public.save_room_type_with_amenities");
    expect(migration).toContain("security invoker\nset search_path = ''");
    expect(migration).toContain("perform public.set_property_amenities");
    expect(migration).toContain("perform public.set_room_amenities");
    expect(migration).toContain("grant execute on function public.save_property_with_amenities");
    expect(migration).toContain("grant execute on function public.save_room_type_with_amenities");
  });

  it("uses one RPC per application save instead of a two-step mutation", () => {
    expect(propertyAction).toContain('.rpc("save_property_with_amenities"');
    expect(propertyAction).not.toContain('.rpc("set_property_amenities"');
    expect(roomAction).toContain('.rpc("save_room_type_with_amenities"');
    expect(roomAction).not.toContain('.rpc("set_room_amenities"');
  });
});
