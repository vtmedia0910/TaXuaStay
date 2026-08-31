import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizePublicMotorbikeOffering } from "@/features/motorbike/adapter/normalize";
import { PUBLIC_MOTORBIKE_OFFERING_COLUMNS } from "@/features/motorbike/columns";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("V2 Phase 5 motorbike adapter boundary", () => {
  it("normalizes only the Trip public projection and fixes provider identity", () => {
    const offering = normalizePublicMotorbikeOffering({
      slug: "xe-so", display_name: "Xe số", vehicle_category: "motorbike",
      transmission_type: "semi_automatic", engine_class_cc: 110, suitable_for: null,
      helmet_status: "unknown", pickup_summary: null, return_summary: null,
      public_description: null, public_price_vnd: null, price_source: null,
      price_checked_at: null, price_valid_until: null, availability_state: "needs_confirmation",
      public_request_url: "https://example.com", source_checked_at: "2026-08-30T00:00:00Z",
      updated_at: "2026-08-30T00:00:00Z", image_media_id: null,
    });
    expect(offering.source_system_key).toBe("taxua_biker");
    expect(offering.confirmation_mode).toBe("manual");
    expect(offering.image).toBeNull();
  });

  it("uses an explicit manual adapter and no Biker database or credential dependency", () => {
    const adapter = source("src/features/motorbike/adapter/manual.ts");
    expect(adapter).toContain('readonly mode = "manual_reference"');
    expect(adapter).toContain('from("public_motorbike_offerings")');
    expect(adapter).not.toMatch(/service.?role|biker.*supabase|authorization|bearer|fetch\s*\(/i);
  });

  it("adds no Biker or service-role environment dependency anywhere in the feature", () => {
    const runtime = [
      "src/features/motorbike/actions.ts",
      "src/features/motorbike/admin-data.ts",
      "src/features/motorbike/public-data.ts",
      "src/features/motorbike/adapter/manual.ts",
      "src/features/motorbike/adapter/normalize.ts",
    ].map(source).join("\n");
    expect(runtime).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|BIKER_(URL|KEY|TOKEN|SECRET)|NEXT_PUBLIC_BIKER|process\.env/);
  });

  it("keeps private Supplier, external mapping, economics, fleet and audit fields out of the public query", () => {
    for (const field of ["supplier_id", "source_external_ref_id", "external_reference", "metadata", "net_cost", "margin", "plate", "maintenance", "internal_notes", "created_by", "updated_by"]) {
      expect(PUBLIC_MOTORBIKE_OFFERING_COLUMNS).not.toContain(field);
    }
  });
});
