import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290021_v2_motorbike_integration.sql"), "utf8").toLowerCase();
const correctiveSql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290022_fix_motorbike_public_ordering.sql"), "utf8").toLowerCase();
const publicView = sql.split("create or replace view public.public_motorbike_offerings")[1].split("grant select on table public.public_motorbike_offerings")[0];
const beforeFunctions = sql.split("create or replace function public.is_current_motorbike_source")[0];

describe("V2 Phase 5 motorbike migration", () => {
  it("creates one small projection with RLS and no seeded or duplicated fleet/booking domain", () => {
    expect(sql).toContain("create table public.motorbike_offerings");
    expect(sql).toContain("alter table public.motorbike_offerings enable row level security");
    expect(beforeFunctions).not.toContain("insert into public.motorbike_offerings");
    expect(sql).not.toMatch(/create table public\.(motorbikes|fleet|maintenance|handovers|customers|bookings|booking_items|payments|deposits)/);
  });

  it("requires an owned taxua_biker external reference and an active source before public visibility", () => {
    expect(sql).toContain("external_ref.system_key = 'taxua_biker'");
    expect(sql).toContain("supplier.supplier_type = 'motorbike'");
    expect(sql).toContain("supplier.status = 'active'");
    expect(sql).toContain("external_ref.is_active is true");
    expect(sql).toContain("motorbike offering requires a matching taxua_biker reference");
  });

  it("exposes an explicit safe projection without private identities or operations", () => {
    for (const field of ["supplier_id", "source_external_ref_id", "external_reference", "metadata", "internal_notes", "created_by", "updated_by", "net_cost", "margin", "plate_number", "maintenance"]) {
      expect(publicView).not.toContain(field);
    }
    expect(sql).toContain('create policy "public reads published motorbike offerings"');
    expect(sql).toContain("grant select on table public.public_motorbike_offerings to anon, authenticated");
    expect(sql).not.toMatch(/grant select on table public\.(suppliers|supplier_external_refs) to anon/);
  });

  it("adds the public presentation order additively after 021 became immutable", () => {
    expect(correctiveSql).toContain("create or replace view public.public_motorbike_offerings");
    expect(correctiveSql).toContain("offering.sort_order");
    expect(correctiveSql).toContain("security_invoker = true");
    expect(correctiveSql).not.toMatch(/supplier_id|source_external_ref_id|external_reference|internal_notes|net_cost|margin/);
  });

  it("keeps price nullable, availability non-live, and publication manual", () => {
    expect(sql).toContain("public_price_vnd integer");
    expect(sql).toContain("'needs_confirmation', 'unknown', 'unavailable'");
    expect(sql).not.toContain("'available_live'");
    expect(sql).toContain("confirmation_mode in ('manual')");
    expect(sql).toContain("price_snapshot_complete");
  });

  it("archives projections before external refs and Supplier in the atomic archive RPC", () => {
    const archive = sql.split("create or replace function public.archive_supplier")[1];
    expect(archive.indexOf("update public.motorbike_offerings")).toBeLessThan(archive.indexOf("update public.supplier_external_refs"));
    expect(archive.indexOf("update public.motorbike_offerings")).toBeLessThan(archive.indexOf("update public.suppliers set status = 'archived'"));
    expect(archive).not.toMatch(/delete from/);
  });

  it("protects CMS media references and grants no hard delete", () => {
    expect(sql).toContain("cms_media_motorbike_archive_guard");
    expect(sql).toContain("public reads motorbike offering media");
    expect(sql).not.toMatch(/grant\s+delete/);
  });
});
