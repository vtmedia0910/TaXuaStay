import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608290016_v2_supplier_partner_foundation.sql"),
  "utf8",
).toLowerCase();
const schemaDefinition = sql.split("create or replace function public.protect_supplier_identity")[0];

describe("V2 Phase 3 supplier and partner migration", () => {
  it("creates the normalized private supply-side domain without seed data", () => {
    for (const table of ["suppliers", "supplier_contacts", "supplier_properties", "partner_relationships", "supplier_external_refs"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table} from anon, authenticated`);
    }
    expect(schemaDefinition).not.toMatch(/insert into public\.(suppliers|supplier_contacts|supplier_properties|partner_relationships|supplier_external_refs)/);
    expect(sql).not.toMatch(/create table public\.(bookings|booking_items|payments|packages|services)/);
  });

  it("enforces stable identities and relationship history", () => {
    expect(sql).toContain("suppliers_code_format");
    expect(sql).toContain("supplier code is immutable");
    expect(sql).toContain("external supplier identity is immutable");
    expect(sql).toContain("supplier_properties_one_open_exact_role");
    expect(sql).toContain("supplier_properties_one_open_primary_role");
    expect(sql).toContain("partner_relationships_one_open_relationship");
    expect(sql).toContain("archived supplier must be reactivated");
    expect(sql).not.toMatch(/grant delete/);
  });

  it("normalizes contacts and requires one contact method", () => {
    expect(sql).toContain("supplier_contacts_method_required");
    expect(sql).toContain("regexp_replace(btrim(new.phone)");
    expect(sql).toContain("lower(btrim(new.email))");
    expect(sql).toContain("supplier_contacts_one_active_primary");
  });

  it("uses explicit private RLS boundaries with no anonymous access", () => {
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete)[^;]*\s+to anon/);
    expect(sql).toContain('create policy "staff reads suppliers"');
    expect(sql).toContain('create policy "staff creates supplier contacts"');
    expect(sql).toContain('create policy "staff creates supplier properties"');
    expect(sql).toContain('create policy "admins create partner relationships"');
    expect(sql).toContain('create policy "admins create supplier external refs"');
  });

  it("makes critical workflows transactional through invoker RPCs", () => {
    const profileRpc = sql.split("create or replace function public.save_supplier_profile")[1]
      .split("create or replace function public.save_supplier_contact")[0];
    expect(profileRpc).toContain("security invoker");
    expect(profileRpc).toContain("insert into public.suppliers");
    expect(profileRpc).toContain("insert into public.supplier_contacts");
    expect(profileRpc).toContain("primary contact requires a name and contact type");
    expect(profileRpc).not.toMatch(/commit|rollback/);
    expect(sql).toContain("create or replace function public.save_supplier_property_link");
    expect(sql).toContain("create or replace function public.archive_supplier");
  });

  it("does not couple partner tier to trust, pricing, availability, CMS, or public search", () => {
    expect(sql).not.toMatch(/alter table public\.(verification_records|cloud_view_verifications|road_verifications|room_quality_assessments|room_rate_rules|room_inventory|cms_pages)/);
    expect(sql).not.toMatch(/create (or replace )?view public\./);
    expect(sql).toContain("never a verification or ranking signal");
    expect(sql).toContain("must not alter verification, pricing confidence, availability, or search ranking");
  });
});
