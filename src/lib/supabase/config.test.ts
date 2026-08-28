import { afterEach, describe, expect, it } from "vitest";
import { getSupabasePublicConfig, isSupabaseConfigured } from "@/lib/supabase/config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

  if (originalAnonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
});

describe("Supabase public configuration", () => {
  it("stays unconfigured until both public values are present", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(isSupabaseConfigured()).toBe(false);
    expect(getSupabasePublicConfig()).toBeNull();
  });

  it("returns the dedicated Stay public configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stay-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "example-anon-key";

    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabasePublicConfig()).toEqual({
      url: "https://stay-project.supabase.co",
      anonKey: "example-anon-key",
    });
  });
});
