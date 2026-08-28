import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";
import { getPublicSitemapData } from "@/features/search/data";
import { SEO_LANDING_SLUGS } from "@/features/search/seo";
import { buildPublicSitemap } from "@/features/search/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["/", "/tim-phong", ...SEO_LANDING_SLUGS.map((slug) => `/${slug}`)];
  try {
    const data = await getPublicSitemapData();
    return buildPublicSitemap(getSiteUrl(), staticPaths, data);
  } catch {
    return buildPublicSitemap(getSiteUrl(), staticPaths, { properties: [], rooms: [] });
  }
}
