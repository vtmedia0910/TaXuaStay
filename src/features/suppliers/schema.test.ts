import { describe, expect, it } from "vitest";
import {
  partnerRelationshipSchema,
  supplierCodeSchema,
  supplierContactSchema,
  supplierExternalRefSchema,
  supplierProfileSchema,
  supplierPropertySchema,
} from "@/features/suppliers/schema";

describe("V2 Phase 3 supplier validation", () => {
  it("accepts the stable operational code and rejects unstable formats", () => {
    expect(supplierCodeSchema.parse("sup-tx-0001")).toBe("SUP-TX-0001");
    expect(supplierCodeSchema.safeParse("Pơ Mù Homestay").success).toBe(false);
    expect(supplierCodeSchema.safeParse("SUP-TX-1").success).toBe(false);
  });

  it("supports non-accommodation suppliers without a property", () => {
    const result = supplierProfileSchema.safeParse({
      id: "",
      supplier_code: "SUP-TX-0002",
      supplier_type: "guide",
      display_name: "Đầu mối hướng dẫn A",
      legal_name: "",
      status: "lead",
      tax_code: "",
      website_url: "",
      internal_notes: "",
      primary_contact_name: "",
      primary_contact_type: "",
      primary_role_title: "",
      primary_phone: "",
      primary_email: "",
      primary_zalo: "",
      primary_notes_internal: "",
    });
    expect(result.success).toBe(true);
  });

  it("requires a meaningful method for every contact", () => {
    const base = {
      id: "",
      supplier_id: "11111111-1111-4111-8111-111111111111",
      contact_name: "Nguyễn Văn A",
      contact_type: "operations",
      role_title: "",
      phone: "",
      email: "",
      zalo: "",
      notes_internal: "",
      is_primary: "on",
      is_active: "on",
    };
    expect(supplierContactSchema.safeParse(base).success).toBe(false);
    expect(supplierContactSchema.safeParse({ ...base, phone: "0987654321" }).success).toBe(true);
    expect(supplierContactSchema.safeParse({ ...base, email: "ops@example.com" }).success).toBe(true);
  });

  it("validates property relationship history dates", () => {
    const base = {
      id: "",
      supplier_id: "11111111-1111-4111-8111-111111111111",
      property_id: "22222222-2222-4222-8222-222222222222",
      relationship_type: "operator",
      is_primary: "on",
      valid_from: "2026-08-31",
      valid_until: "2026-08-30",
      notes_internal: "",
    };
    expect(supplierPropertySchema.safeParse(base).success).toBe(false);
    expect(supplierPropertySchema.safeParse({ ...base, valid_until: "2026-09-30" }).success).toBe(true);
  });

  it("keeps partner status and tier separate and lets the RPC default an end date", () => {
    const base = {
      id: "",
      supplier_id: "11111111-1111-4111-8111-111111111111",
      status: "ended",
      tier: "verified",
      started_at: "2026-08-01",
      reviewed_at: "2026-08-20",
      valid_until: "2026-08-31",
      ended_at: "",
      relationship_notes_internal: "",
    };
    expect(partnerRelationshipSchema.safeParse(base).success).toBe(true);
    expect(partnerRelationshipSchema.safeParse({ ...base, status: "active", ended_at: "2026-08-31" }).success).toBe(false);
    expect(partnerRelationshipSchema.safeParse({ ...base, tier: "gold" }).success).toBe(false);
  });

  it("accepts bounded object metadata and rejects arrays or invalid JSON", () => {
    const base = {
      id: "",
      supplier_id: "11111111-1111-4111-8111-111111111111",
      system_key: "taxua_biker",
      external_reference: "partner-001",
      metadata: "{\"note\":\"opaque identity only\"}",
      is_active: "on",
    };
    expect(supplierExternalRefSchema.safeParse(base).success).toBe(true);
    expect(supplierExternalRefSchema.safeParse({ ...base, metadata: "[]" }).success).toBe(false);
    expect(supplierExternalRefSchema.safeParse({ ...base, metadata: "{oops" }).success).toBe(false);
  });
});
