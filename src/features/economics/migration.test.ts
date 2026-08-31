import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_RATE_RULE_QUERY } from "@/features/pricing/columns";

const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/202608290018_v2_commercial_economics.sql"), "utf8");
const hardening = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/202608290019_harden_commercial_function_grants.sql"), "utf8");
const authenticatedPredicate = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/202608290020_restore_authenticated_relationship_predicate.sql"), "utf8");

describe("Phase 4 commercial economics migration", () => {
  it("creates only private commercial plans and rules without seed rows", () => {
    expect(migration).toContain("create table public.commercial_rate_plans");
    expect(migration).toContain("create table public.room_commercial_rules");
    expect(migration).not.toMatch(/insert into public\.(commercial_rate_plans|room_commercial_rules)/i);
  });

  it("enables RLS, grants no anonymous access, and allows no hard delete", () => {
    expect(migration).toContain("alter table public.commercial_rate_plans enable row level security");
    expect(migration).toContain("alter table public.room_commercial_rules enable row level security");
    expect(migration).toContain("revoke all on table public.commercial_rate_plans from public, anon, authenticated");
    expect(migration).not.toMatch(/grant\s+select[^;]+commercial_(rate_plans|rules)\s+to\s+anon/i);
    expect(migration).not.toMatch(/grant\s+delete/i);
    expect(hardening).toMatch(/revoke all on function public\.has_current_supplier_property_relationship[\s\S]+from public, anon, authenticated/i);
    expect(authenticatedPredicate).toMatch(/grant execute on function public\.has_current_supplier_property_relationship[\s\S]+to authenticated/i);
    expect(authenticatedPredicate).not.toMatch(/to anon|to public/i);
  });

  it("enforces ownership, verification dates, conflict inputs, and Supplier archive closure", () => {
    expect(migration).toContain("Commercial plan, Supplier, Property, and Room Type ownership must match");
    expect(migration).toContain("Commercial verification timestamp cannot be in the future");
    expect(migration).toContain("at time zone 'Asia/Ho_Chi_Minh'");
    expect(migration).toContain("Commercial rule ownership is immutable");
    expect(migration).toContain("update public.room_commercial_rules");
    expect(migration).toContain("set status = 'expired'");
  });

  it("keeps every private economics field out of the public pricing DTO", () => {
    expect(PUBLIC_RATE_RULE_QUERY).not.toMatch(/net_cost|market_reference|gross_contribution|gross_margin|contract_reference|notes_internal/i);
    expect(migration).not.toContain("create or replace view public.public_room_rate_rules");
  });

  it("does not add commission, settlement, payment, package, or Biker runtime concepts", () => {
    expect(migration).not.toMatch(/commission|settlement|bank_account|booking_items|package_items|motorbike|fleet|handover/i);
  });
});
