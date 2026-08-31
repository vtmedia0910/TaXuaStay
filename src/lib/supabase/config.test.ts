import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

  if (originalPublishableKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
  }

  if (originalAnonKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  }
});

describe("Supabase public configuration", () => {
  it("stays unconfigured until both public values are present", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("returns the dedicated Stay public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stay-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "example-publishable-key";

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://stay-project.supabase.co",
      publishableKey: "example-publishable-key",
    });
  });

  it("does not fall back to the legacy anon credential", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stay-project.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-key-must-be-ignored";

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("keeps every runtime client on the publishable credential path", () => {
    const runtime = [
      "src/lib/supabase/config.ts",
      "src/lib/supabase/public.ts",
      "src/lib/supabase/server.ts",
      "src/proxy.ts",
    ].map((file) => readFileSync(file, "utf8")).join("\n");

    expect(runtime).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(runtime).not.toMatch(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|sb_secret_/,
    );
  });
});
