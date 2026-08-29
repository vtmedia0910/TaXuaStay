export const SITE = {
  name: "TÀ XÙA STAY",
  tagline: "Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.",
  description:
    "Tìm loại phòng tại Tà Xùa theo sức chứa, hướng nhìn, đường vào và tiện ích đang được ghi nhận.",
} as const;

interface SiteEnvironment {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
}

export interface SiteDeploymentPolicy {
  siteUrl: URL;
  indexingEnabled: boolean;
  source: "configured" | "vercel" | "local";
}

function parseSiteUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isFinalBrandUrl(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const isLocal = hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "0.0.0.0"
    || hostname === "[::1]"
    || hostname.endsWith(".localhost");
  const isTechnicalVercelHost = hostname === "vercel.app" || hostname.endsWith(".vercel.app");
  return url.protocol === "https:" && !isLocal && !isTechnicalVercelHost;
}

export function getSiteDeploymentPolicy(
  environment: SiteEnvironment = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  },
): SiteDeploymentPolicy {
  const configuredUrl = parseSiteUrl(environment.NEXT_PUBLIC_SITE_URL);
  if (configuredUrl) {
    return {
      siteUrl: configuredUrl,
      indexingEnabled: isFinalBrandUrl(configuredUrl),
      source: "configured",
    };
  }

  const vercelUrl = parseSiteUrl(environment.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercelUrl) {
    return { siteUrl: vercelUrl, indexingEnabled: false, source: "vercel" };
  }

  return {
    siteUrl: new URL("http://localhost:3000"),
    indexingEnabled: false,
    source: "local",
  };
}

export function getSiteUrl() {
  return getSiteDeploymentPolicy().siteUrl;
}
