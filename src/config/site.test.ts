import { describe, expect, it } from "vitest";
import { getSiteDeploymentPolicy } from "@/config/site";

describe("site deployment policy", () => {
  it("allows indexing only for an explicit HTTPS brand domain", () => {
    const policy = getSiteDeploymentPolicy({
      NEXT_PUBLIC_SITE_URL: "https://stay.example",
      VERCEL_PROJECT_PRODUCTION_URL: "temporary.vercel.app",
    });

    expect(policy).toMatchObject({ indexingEnabled: true, source: "configured" });
    expect(policy.siteUrl.toString()).toBe("https://stay.example/");
  });

  it("keeps an explicitly configured technical Vercel hostname out of the index", () => {
    const policy = getSiteDeploymentPolicy({
      NEXT_PUBLIC_SITE_URL: "taxuaslay1.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "taxuaslay1.vercel.app",
    });

    expect(policy).toMatchObject({ indexingEnabled: false, source: "configured" });
    expect(policy.siteUrl.toString()).toBe("https://taxuaslay1.vercel.app/");
  });

  it("uses the Vercel production hostname for URLs without enabling indexing", () => {
    const policy = getSiteDeploymentPolicy({
      NEXT_PUBLIC_SITE_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: "temporary.vercel.app",
    });

    expect(policy).toMatchObject({ indexingEnabled: false, source: "vercel" });
    expect(policy.siteUrl.toString()).toBe("https://temporary.vercel.app/");
  });

  it("falls back safely when configuration is invalid or absent", () => {
    const invalid = getSiteDeploymentPolicy({
      NEXT_PUBLIC_SITE_URL: "not a valid host",
      VERCEL_PROJECT_PRODUCTION_URL: "temporary.vercel.app",
    });
    const local = getSiteDeploymentPolicy({
      NEXT_PUBLIC_SITE_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: undefined,
    });

    expect(invalid).toMatchObject({ indexingEnabled: false, source: "vercel" });
    expect(local).toMatchObject({ indexingEnabled: false, source: "local" });
    expect(local.siteUrl.toString()).toBe("http://localhost:3000/");
  });
});
