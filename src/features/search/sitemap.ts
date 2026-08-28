import type { MetadataRoute } from "next";
import type { PublicSitemapData } from "@/features/search/types";

export function buildPublicSitemap(
  siteUrl: URL,
  staticPaths: string[],
  data: PublicSitemapData,
): MetadataRoute.Sitemap {
  const absolute = (path: string) => new URL(path, siteUrl).toString();
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path, index) => ({
    url: absolute(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: index === 0 ? 1 : path === "/tim-phong" ? 0.9 : 0.7,
  }));

  const properties: MetadataRoute.Sitemap = data.properties.map((property) => ({
    url: absolute(`/homestay/${property.slug}`),
    lastModified: property.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const rooms: MetadataRoute.Sitemap = data.rooms.map((room) => ({
    url: absolute(`/homestay/${room.property.slug}/phong/${room.slug}`),
    lastModified: room.updated_at,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  return [...staticEntries, ...properties, ...rooms];
}
