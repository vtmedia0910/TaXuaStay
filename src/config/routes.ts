export const PUBLIC_ROUTES = {
  home: "/",
  stay: "/stay",
  motorbike: "/motorbike",
  packages: "/packages",
  tripFinder: "/trip-finder",
  assistant: "/assistant",
  bookingRequest: "/booking/request",
  legacyStaySearch: "/tim-phong",
  verification: "/verified",
} as const;

export const PUBLIC_ROUTE_COMPATIBILITY = [
  { current: "/tim-phong", target: "/stay", behavior: "compatibility page with /stay canonical" },
  { current: "/homestay/[slug]", target: "/stay/[slug]", behavior: "compatibility page with target canonical" },
  { current: "/homestay/[slug]/phong/[roomSlug]", target: "/stay/[slug]/[roomSlug]", behavior: "compatibility page with target canonical" },
  { current: "/verified", target: "/verified", behavior: "preserved public method route" },
] as const;

export function buildPropertyPath(propertySlug: string) {
  return `/stay/${propertySlug}`;
}

export function buildRoomPath(propertySlug: string, roomSlug: string) {
  return `/stay/${propertySlug}/${roomSlug}`;
}

export function buildMotorbikePath(slug: string) {
  return `/motorbike/${slug}`;
}

export function buildPackagePath(slug: string) {
  return `/packages/${slug}`;
}
