import type { MetadataRoute } from "next";
import type { PublicSitemapData } from "@/features/search/types";

export function buildStaticSitemapPaths(landingSlugs: string[], indexingEnabled: boolean) {
  return ["/", "/stay", ...landingSlugs.map((slug) => `/${slug}`), ...(indexingEnabled ? ["/verified"] : [])];
}

export function buildPublicSitemap(
  siteUrl: URL,
  staticPaths: string[],
  data: PublicSitemapData,
): MetadataRoute.Sitemap {
  const absolute = (path: string) => new URL(path, siteUrl).toString();
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path, index) => ({
    url: absolute(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : path === "/stay" ? 0.9 : 0.7,
  }));

  const properties: MetadataRoute.Sitemap = data.properties.map((property) => ({
    url: absolute(`/stay/${property.slug}`),
    lastModified: property.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const rooms: MetadataRoute.Sitemap = data.rooms.map((room) => ({
    url: absolute(`/stay/${room.property.slug}/${room.slug}`),
    lastModified: room.updated_at,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  return [...staticEntries, ...properties, ...rooms];
}
