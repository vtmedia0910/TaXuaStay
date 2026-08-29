import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/202608290006_rate_plans_and_pricing.sql"),
  "utf8",
);

describe("Phase 5 migration", () => {
  it("adds integer VND rate plans and rules without inventory or bookings", () => {
    expect(sql).toMatch(/create table public\.rate_plans/i);
    expect(sql).toMatch(/create table public\.room_rate_rules/i);
    expect(sql).toMatch(/price_vnd integer not null/i);
    expect(sql).toMatch(/currency text not null default 'VND'/i);
    expect(sql).not.toMatch(/create table public\.(bookings|availability|inventory)/i);
  });

  it("uses RLS and explicit anonymous column grants", () => {
    expect(sql).toMatch(/alter table public\.rate_plans enable row level security/i);
    expect(sql).toMatch(/alter table public\.room_rate_rules enable row level security/i);
    expect(sql).toMatch(/revoke all on table public\.rate_plans from anon, authenticated/i);
    expect(sql).toMatch(/grant select \([\s\S]*?\) on table public\.room_rate_rules to anon/i);
    expect(sql).not.toMatch(/grant select on table public\.(rate_plans|room_rate_rules) to anon/i);
    expect(sql).toMatch(/security_invoker = true/i);
    expect(sql).toMatch(/public\.is_room_public\(room_type_id\)/i);
    expect(sql).toMatch(/plan\.publish_status = 'published'/i);
    expect(sql).toMatch(/for all to authenticated[\s\S]*?public\.is_staff_or_admin/i);
  });

  it("keeps internal pricing fields out of the public view", () => {
    const view = sql.slice(sql.indexOf("create view public.public_room_rate_rules"));
    expect(view).not.toMatch(/internal_notes/);
    expect(view).not.toMatch(/description/);
    expect(view).not.toMatch(/created_by|updated_by/);
  });

  it("protects cross-property ownership and forbids anonymous mutations by privilege", () => {
    expect(sql).toMatch(/Rate plan and room type must belong to the same property/);
    expect(sql).toMatch(/room_types_protect_rate_owner_links/);
    expect(sql).not.toMatch(/grant (insert|update|delete)[\s\S]*? to anon/i);
  });
});
