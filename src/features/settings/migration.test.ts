import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608290001_stay_foundation.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("Phase 1 migration", () => {
  it("derives supported authorization roles from app metadata", () => {
    expect(migration).toContain("'app_metadata'");
    expect(migration).toContain("in ('admin', 'staff')");
    expect(migration).not.toContain("user_metadata");
  });

  it("enables RLS and restricts settings updates to admins", () => {
    expect(migration).toContain("alter table public.site_settings enable row level security");
    expect(migration).toContain('create policy "public reads safe site settings"');
    expect(migration).toContain('create policy "admins update site settings"');
    expect(migration).toContain("with check (id = 'main' and (select public.is_admin()))");
  });

  it("contains only the Phase 1 settings table", () => {
    const tables = migration.match(/create table if not exists public\.[a-z_]+/g) ?? [];

    expect(tables).toEqual(["create table if not exists public.site_settings"]);
    expect(migration).not.toMatch(/public\.(properties|rooms|bookings|availability|rates)\b/);
    expect(migration).not.toMatch(/public\.(fleet|motorbikes|handovers)\b/);
  });
});
