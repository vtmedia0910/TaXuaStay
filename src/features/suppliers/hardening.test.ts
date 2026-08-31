import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608290017_harden_supplier_lifecycle.sql"),
  "utf8",
).toLowerCase();
const integration = readFileSync(
  resolve(process.cwd(), "supabase/tests/202608290017_supplier_lifecycle.sql"),
  "utf8",
).toLowerCase();
const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V2 Phase 3H Supplier lifecycle hardening", () => {
  it("uses one ordered archive orchestrator and removes the migration-016 AFTER cascade", () => {
    const archiveRpc = migration.split("create or replace function public.archive_supplier")[1]
      .split("revoke execute on function public.save_supplier_profile")[0];
    expect(migration).toContain("drop trigger if exists suppliers_close_archived_relationships");
    expect(migration).toContain("drop function if exists public.close_archived_supplier_relationships");
    expect(archiveRpc.indexOf("update public.supplier_contacts")).toBeLessThan(archiveRpc.indexOf("update public.suppliers"));
    expect(archiveRpc.indexOf("update public.supplier_properties")).toBeLessThan(archiveRpc.indexOf("update public.suppliers"));
    expect(archiveRpc.indexOf("update public.partner_relationships")).toBeLessThan(archiveRpc.indexOf("update public.suppliers"));
    expect(archiveRpc.indexOf("update public.supplier_external_refs")).toBeLessThan(archiveRpc.indexOf("update public.suppliers"));
    expect(archiveRpc).not.toMatch(/delete from/);
  });

  it("keeps inclusive relationship dates while making archive ordering safe", () => {
    expect(migration).toContain("valid_until is inclusive");
    expect(migration).toContain("valid_until is null or valid_until >= current_date");
    expect(migration).toContain("greatest(coalesce(valid_from, current_date), current_date)");
  });

  it("blocks direct archive and reserves the canonical RPC for authenticated Admin use", () => {
    expect(migration).toContain("create trigger suppliers_require_archive_rpc");
    expect(migration).toContain("use archive_supplier to archive suppliers");
    expect(migration).toContain("supplier archive requires admin");
    expect(integration).toContain("direct_archive_blocked");
    expect(integration).toContain("supplier archive requires admin");
  });

  it("updates the identified current primary contact instead of inserting on every edit", () => {
    const profileRpc = migration.split("create or replace function public.save_supplier_profile_v2")[1]
      .split("create or replace function public.archive_supplier")[0];
    expect(profileRpc).toContain("primary_contact_id uuid");
    expect(profileRpc).toContain("primary contact changed; reload the supplier before saving");
    expect(profileRpc).toContain("where id = current_primary_id");
    expect(migration).toContain("revoke execute on function public.save_supplier_profile(");
    expect(integration).toContain("primary_contact_edit_preserves_id");
    expect(integration).toContain("repeated_profile_edit_count_stable");
    expect(integration).toContain("intentional_contact_replacement");
  });

  it("covers full-graph archive, reactivation, rollback, and role boundaries transactionally", () => {
    for (const testName of [
      "archive_full_graph",
      "reactivation_keeps_history_closed",
      "full_graph_constraint_rollback",
      "role_and_grant_regression",
    ]) {
      expect(integration).toContain(testName);
    }
    expect(integration).toContain("rollback;");
    expect(integration).toContain("check (is_active) not valid");
    expect(integration).not.toMatch(/^\s*commit\s*;/m);
  });

  it("updates the Admin contract and explains archive/history behavior", () => {
    const actions = source("src/features/suppliers/actions.ts");
    const form = source("src/components/admin/supplier-forms.tsx");
    const detail = source("src/app/admin/(protected)/suppliers/[id]/edit/page.tsx");
    expect(actions).toContain('.rpc("save_supplier_profile_v2"');
    expect(actions).toContain("primary_contact_id: value.primary_contact_id");
    expect(form).toContain('name="primary_contact_id"');
    expect(form).toContain("Liên hệ chính hiện tại");
    expect(form).toContain("không tạo thêm bản ghi");
    expect(detail).toContain("lịch sử không bị xóa");
  });

  it("does not introduce Phase 4 economics or public Supplier exposure", () => {
    expect(migration).not.toMatch(/\b(cost|commission|margin|settlement|bank_details|payment_terms)\b/);
    expect(migration).not.toMatch(/grant\s+[^;]+\s+to anon/);
    expect(migration).not.toMatch(/create (or replace )?view public\./);
  });
});
