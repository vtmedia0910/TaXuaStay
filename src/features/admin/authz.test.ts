import { describe, expect, it } from "vitest";
import { isAuthorizedRole, normalizeAdminRole } from "@/features/admin/authz";

describe("Admin authorization", () => {
  it("accepts only roles from app metadata that Stay supports", () => {
    expect(normalizeAdminRole("admin")).toBe("admin");
    expect(normalizeAdminRole("staff")).toBe("staff");
    expect(normalizeAdminRole("partner")).toBeNull();
    expect(normalizeAdminRole(null)).toBeNull();
  });

  it("supports narrower admin-only checks", () => {
    expect(isAuthorizedRole("staff")).toBe(true);
    expect(isAuthorizedRole("admin", ["admin"])).toBe(true);
    expect(isAuthorizedRole("staff", ["admin"])).toBe(false);
  });
});
