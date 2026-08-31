import type { MetadataRoute } from "next";
import { getSiteDeploymentPolicy } from "@/config/site";
import { getPublicSitemapData } from "@/features/search/data";
import { SEO_LANDING_SLUGS } from "@/features/search/seo";
import { buildPublicSitemap, buildStaticSitemapPaths } from "@/features/search/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const policy = getSiteDeploymentPolicy();
  const staticPaths = buildStaticSitemapPaths(SEO_LANDING_SLUGS, policy.indexingEnabled);
  try {
    const data = await getPublicSitemapData();
    return buildPublicSitemap(policy.siteUrl, staticPaths, data);
  } catch {
    return buildPublicSitemap(policy.siteUrl, staticPaths, { properties: [], rooms: [], motorbikes: [], packages: [] });
  }
}
