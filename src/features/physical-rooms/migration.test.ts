import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY } from "@/features/physical-rooms/columns";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608290009_v2_destination_and_physical_rooms.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("V2 Phase 1 architecture migration", () => {
  it("creates destinations with factual Tà Xùa identity and no fabricated geo facts", () => {
    expect(migration).toContain("create table public.destinations");
    expect(migration).toContain("slug text not null unique");
    expect(migration).toContain("latitude is null or latitude between -90 and 90");
    expect(migration).toContain("longitude is null or longitude between -180 and 180");
    expect(migration).toContain("destinations_timezone_required");
    expect(migration).toContain("'ta-xua', 'tà xùa', 'vn', 'asia/ho_chi_minh'");
    expect(migration).not.toMatch(/'ta-xua',\s*'tà xùa'[\s\S]*?\b(21\.|104\.)/);
  });

  it("adds required destination ownership after a safe backfill", () => {
    expect(migration).toContain("add column destination_id uuid references public.destinations(id)");
    expect(migration).toContain("update public.properties\nset destination_id");
    expect(migration).toContain("alter column destination_id set not null");
    expect(migration).toContain("create index properties_destination_index");
  });

  it("creates stable physical-room identity without generating fake rows", () => {
    expect(migration).toContain("create table public.physical_rooms");
    expect(migration).toContain("unique (property_id, room_code)");
    expect(migration).toContain("room_code = upper(room_code)");
    expect(migration).toContain("physical room property and room code are immutable");
    expect(migration).not.toContain("insert into public.physical_rooms");
  });

  it("enforces that the room type and physical room belong to the same property", () => {
    expect(migration).toContain("room_types_id_property_unique unique (id, property_id)");
    expect(migration).toContain("foreign key (room_type_id, property_id)");
    expect(migration).toContain("references public.room_types(id, property_id)");
  });

  it("expands media ownership to exactly one owner without reinterpreting existing rows", () => {
    expect(migration).toContain("add column physical_room_id uuid references public.physical_rooms(id)");
    expect(migration).toContain("num_nonnulls(property_id, room_type_id, physical_room_id) = 1");
    expect(migration).not.toMatch(/update public\.media_assets\s+set physical_room_id/);
  });

  it("supports exactly one room-type or physical-room verification target", () => {
    expect(migration).toContain("num_nonnulls(room_type_id, physical_room_id) = 1");
    expect(migration).toContain("record.physical_room_id is not null");
    expect(migration).toContain("physical-room verification evidence must belong to the exact physical room");
    expect(migration).toContain("asset_physical_room_id is distinct from record_physical_room_id");
    expect(migration).not.toMatch(/update public\.verification_records\s+set physical_room_id/);
  });

  it("centralizes current exact-room badge semantics", () => {
    expect(migration).toContain("function public.is_exact_room_verified");
    expect(migration).toContain("record.verification_type = 'room'");
    expect(migration).toContain("public.is_verification_public(record.id)");
    expect(migration).toContain("media.physical_room_id = record.physical_room_id");
    expect(migration).toContain("public.public_verified_physical_rooms");
  });

  it("uses RLS and explicit anonymous column allowlists", () => {
    for (const table of ["destinations", "physical_rooms"]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on table public.${table} from anon, authenticated`);
      expect(migration).toContain(`staff manages ${table === "destinations" ? "destinations" : "physical rooms"}`);
    }
    expect(migration).toContain("public reads published destinations");
    expect(migration).toContain("public reads published physical rooms");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^;]+to anon/);
    expect(PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY).not.toContain("position_notes");
    expect(PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY).not.toContain("created_by");
    expect(PUBLIC_VERIFIED_PHYSICAL_ROOM_QUERY).not.toContain("updated_by");
  });

  it("does not move pricing or pooled availability to physical rooms", () => {
    expect(migration).not.toMatch(/alter table public\.(rate_plans|room_rate_rules|room_inventory|availability_overrides)/);
    expect(migration).not.toMatch(/create table public\.(bookings|booking_items|payments|suppliers|packages)/);
  });
});
