import { describe, expect, it } from "vitest";
import {
  PUBLIC_SITE_SETTINGS_COLUMNS,
  PUBLIC_SITE_SETTINGS_QUERY,
} from "@/features/settings/columns";

describe("public site settings projection", () => {
  it("uses an explicit public-safe allowlist", () => {
    expect(PUBLIC_SITE_SETTINGS_COLUMNS).toContain("site_name");
    expect(PUBLIC_SITE_SETTINGS_COLUMNS).toContain("announcement_enabled");
    expect(PUBLIC_SITE_SETTINGS_COLUMNS).not.toContain("updated_by");
    expect(PUBLIC_SITE_SETTINGS_COLUMNS).not.toContain("created_at");
    expect(PUBLIC_SITE_SETTINGS_QUERY).not.toContain("*");
  });
});
