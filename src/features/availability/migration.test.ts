import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/202608290008_room_inventory_and_availability.sql"),
  "utf8",
);

describe("Phase 6 availability migration", () => {
  it("creates normalized inventory without booking domains or seed data", () => {
    expect(sql).toMatch(/create table public\.room_inventory/i);
    expect(sql).toMatch(/unique \(room_type_id, date\)/i);
    expect(sql).toMatch(/available_quantity integer not null/i);
    expect(sql).toMatch(/available_quantity >= 0/i);
    expect(sql).toMatch(/source in \('partner', 'admin', 'booking_engine', 'import'\)/i);
    expect(sql).not.toMatch(/create table public\.(stay_bookings|booking_events|customers|payments)/i);
    expect(sql).not.toMatch(/insert into public\.room_inventory[\s\S]*?values/i);
  });

  it("enforces physical capacity and non-future verification in PostgreSQL", () => {
    expect(sql).toMatch(/Available quantity cannot exceed physical room quantity/i);
    expect(sql).toMatch(/Physical room quantity cannot be lower than recorded inventory/i);
    expect(sql).toMatch(/Availability verification timestamp cannot be in the future/i);
    expect(sql).toMatch(/for share/i);
  });

  it("uses RLS, explicit public columns, and hides operational fields", () => {
    expect(sql).toMatch(/alter table public\.room_inventory enable row level security/i);
    expect(sql).toMatch(/grant select \(\s*room_type_id, date, available_quantity, source, verified_at\s*\)/i);
    expect(sql).toMatch(/public\.is_room_public\(room_type_id\)/i);
    expect(sql).toMatch(/security_invoker = true/i);
    const viewStart = sql.indexOf("create view public.public_room_inventory");
    const viewEnd = sql.indexOf("revoke all on table public.public_room_inventory");
    const view = sql.slice(viewStart, viewEnd);
    expect(view).not.toMatch(/updated_by|price_override_vnd/);
    expect(sql).not.toMatch(/grant (insert|update|delete)[\s\S]*? to anon/i);
  });

  it("provides a bounded atomic inclusive range upsert", () => {
    expect(sql).toMatch(/create or replace function public\.set_room_inventory_range/i);
    expect(sql).toMatch(/date_to - date_from \+ 1\) > 365/i);
    expect(sql).toMatch(/generate_series\(date_from, date_to, interval '1 day'\)/i);
    expect(sql).toMatch(/on conflict \(room_type_id, date\) do update/i);
    expect(sql).toMatch(/grant execute on function public\.set_room_inventory_range[\s\S]*?to authenticated/i);
  });
});
