import type { Metadata, MetadataRoute } from "next";
import {
  getSiteDeploymentPolicy,
  type SiteDeploymentPolicy,
} from "@/config/site";

type RequestedRobots = {
  index?: boolean;
  follow?: boolean;
};

export function getPublicPageRobots(
  requested: RequestedRobots = {},
  policy: SiteDeploymentPolicy = getSiteDeploymentPolicy(),
): NonNullable<Metadata["robots"]> {
  if (!policy.indexingEnabled) {
    return {
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    };
  }

  return {
    index: requested.index ?? true,
    follow: requested.follow ?? true,
  };
}

export function buildPublicRobotsFile(
  policy: SiteDeploymentPolicy = getSiteDeploymentPolicy(),
): MetadataRoute.Robots {
  if (!policy.indexingEnabled) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      host: policy.siteUrl.origin,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/"],
    },
    sitemap: new URL("/sitemap.xml", policy.siteUrl).toString(),
    host: policy.siteUrl.origin,
  };
}
