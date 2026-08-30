import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PARTNER_TIER_POLICY, PARTNER_TRUST_INVARIANT } from "@/features/suppliers/policy";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V2 Phase 3 Supplier Admin", () => {
  it("provides list, search, filters, create, and structured detail sections", () => {
    const list = source("src/app/admin/(protected)/suppliers/page.tsx");
    const detail = source("src/app/admin/(protected)/suppliers/[id]/edit/page.tsx");
    expect(list).toContain("Mã hoặc tên nhà cung cấp");
    expect(list).toContain('name="query"');
    expect(list).toContain('name="type"');
    expect(list).toContain('name="status"');
    expect(detail).toContain('id="contacts"');
    expect(detail).toContain('id="properties"');
    expect(detail).toContain('id="partner"');
    expect(detail).toContain('id="references"');
  });

  it("keeps role enforcement inside every supplier mutation", () => {
    const actions = source("src/features/suppliers/actions.ts");
    expect(actions).toContain('requireAdminUser(["admin"]');
    expect(actions).toContain('requireAdminUser(["admin", "staff"]');
    expect(actions).toContain('.rpc("save_supplier_profile"');
    expect(actions).toContain('.rpc("save_supplier_contact"');
    expect(actions).toContain('.rpc("save_supplier_property_link"');
    expect(actions).toContain('.rpc("save_partner_relationship"');
    expect(actions).toContain('.rpc("save_supplier_external_ref"');
  });

  it("integrates a private summary into Property Admin without changing the public Property model", () => {
    const page = source("src/app/admin/(protected)/properties/[id]/edit/page.tsx");
    const summary = source("src/components/admin/property-supplier-summary.tsx");
    const publicTypes = source("src/features/properties/types.ts");
    expect(page).toContain("getPropertySupplierSummary");
    expect(summary).toContain("Quan hệ vận hành riêng tư");
    expect(publicTypes).not.toMatch(/supplier(_id|_code|_contact)/i);
  });

  it("centralizes private tier meanings and every trust invariant", () => {
    expect(PARTNER_TIER_POLICY.verified.meaning).toContain("rà soát nội bộ");
    expect(PARTNER_TIER_POLICY.cloud_partner.meaning).toContain("không tạo Cloud View Verified");
    expect(PARTNER_TRUST_INVARIANT).toEqual([
      "Exact Room Verified",
      "Room Type Verified",
      "Cloud View",
      "Room Quality",
      "Road Verified",
      "Price Confidence",
      "Availability",
      "public search ranking",
    ]);
  });
});
