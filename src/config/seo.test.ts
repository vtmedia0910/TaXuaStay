import { describe, expect, it } from "vitest";
import { buildPublicRobotsFile, getPublicPageRobots } from "@/config/seo";
import { getSiteDeploymentPolicy } from "@/config/site";

describe("environment-aware indexing", () => {
  const stagingPolicy = getSiteDeploymentPolicy({
    NEXT_PUBLIC_SITE_URL: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: "temporary.vercel.app",
  });
  const brandPolicy = getSiteDeploymentPolicy({
    NEXT_PUBLIC_SITE_URL: "https://stay.example",
    VERCEL_PROJECT_PRODUCTION_URL: "temporary.vercel.app",
  });

  it("emits noindex metadata and blocks crawling on a technical deployment", () => {
    expect(getPublicPageRobots({}, stagingPolicy)).toMatchObject({
      index: false,
      follow: false,
      noarchive: true,
    });
    expect(buildPublicRobotsFile(stagingPolicy)).toEqual({
      rules: { userAgent: "*", disallow: "/" },
      host: "https://temporary.vercel.app",
    });
  });

  it("allows public crawling and advertises the sitemap on a final brand domain", () => {
    expect(getPublicPageRobots({}, brandPolicy)).toEqual({ index: true, follow: true });
    expect(buildPublicRobotsFile(brandPolicy)).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/"],
      },
      sitemap: "https://stay.example/sitemap.xml",
      host: "https://stay.example",
    });
  });

  it("keeps parameterized search noindex after brand indexing is enabled", () => {
    expect(getPublicPageRobots({ index: false, follow: true }, brandPolicy)).toEqual({
      index: false,
      follow: true,
    });
  });
});
