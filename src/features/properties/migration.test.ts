import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608290002_properties_rooms_amenities_media.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("Phase 2 accommodation migration", () => {
  it("creates only the Phase 2 content tables", () => {
    const tables = migration.match(/create table public\.[a-z_]+/g) ?? [];
    expect(tables).toEqual([
      "create table public.properties",
      "create table public.room_types",
      "create table public.amenities",
      "create table public.property_amenities",
      "create table public.room_amenities",
      "create table public.media_assets",
    ]);
    expect(migration).not.toMatch(/create table public\.(rates|room_inventory|bookings|verification_records|referral_events)/);
  });

  it("prevents duplicate amenity assignments and invalid media ownership", () => {
    expect(migration).toContain("primary key (property_id, amenity_id)");
    expect(migration).toContain("primary key (room_type_id, amenity_id)");
    expect(migration).toContain("num_nonnulls(property_id, room_type_id) = 1");
    expect(migration).toContain("create or replace function public.set_property_amenities");
    expect(migration).toContain("create or replace function public.set_room_amenities");
  });

  it("enables RLS, public visibility guards, and no anonymous writes", () => {
    for (const table of ["properties", "room_types", "amenities", "property_amenities", "room_amenities", "media_assets"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("create policy \"public reads published properties\"");
    expect(migration).toContain("create policy \"public reads published rooms\"");
    expect(migration).toContain("create policy \"public reads approved media\"");
    expect(migration).toContain("create or replace function public.is_property_public");
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^;]+to anon/);
  });
});
