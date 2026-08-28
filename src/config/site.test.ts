import { afterEach, describe, expect, it } from "vitest";
import { getSiteUrl } from "@/config/site";

const originalConfiguredUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalVercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

afterEach(() => {
  if (originalConfiguredUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalConfiguredUrl;

  if (originalVercelProductionUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = originalVercelProductionUrl;
});

describe("site URL resolution", () => {
  it("uses an explicit configured URL first", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://stay.example";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "fallback.vercel.app";
    expect(getSiteUrl().toString()).toBe("https://stay.example/");
  });

  it("accepts a configured production hostname without a protocol", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "taxuaslay1.vercel.app";
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(getSiteUrl().toString()).toBe("https://taxuaslay1.vercel.app/");
  });

  it("falls back to Vercel's production hostname when configuration is invalid", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "not a valid host";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "taxuaslay1.vercel.app";
    expect(getSiteUrl().toString()).toBe("https://taxuaslay1.vercel.app/");
  });

  it("keeps the public app usable locally without environment variables", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
  });
});
