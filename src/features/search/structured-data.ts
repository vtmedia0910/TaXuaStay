import type { MediaAssetDto } from "@/features/media/types";
import type { PublicPropertyDto } from "@/features/properties/types";

export function buildPropertyStructuredData(
  property: PublicPropertyDto,
  media: MediaAssetDto[],
  canonicalUrl: string,
) {
  const amenityFeature = [
    property.wifi && { "@type": "LocationFeatureSpecification", name: "Wi-Fi", value: true },
    property.breakfast && { "@type": "LocationFeatureSpecification", name: "Bữa sáng", value: true },
    property.restaurant && { "@type": "LocationFeatureSpecification", name: "Nhà hàng", value: true },
    property.bbq && { "@type": "LocationFeatureSpecification", name: "BBQ", value: true },
    property.parking === "yes" && { "@type": "LocationFeatureSpecification", name: "Chỗ đỗ xe", value: true },
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": property.property_type === "hotel" ? "Hotel" : "LodgingBusiness",
    name: property.name,
    url: canonicalUrl,
    description: property.short_description ?? property.description ?? undefined,
    image: media
      .filter((asset) => asset.media_type !== "video")
      .map((asset) => asset.thumbnail_url ?? asset.url),
    telephone: property.public_phone ?? undefined,
    checkinTime: property.check_in_time,
    checkoutTime: property.check_out_time,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.area_name,
      streetAddress: property.address ?? undefined,
      addressCountry: "VN",
    },
    geo: property.latitude !== null && property.longitude !== null
      ? {
          "@type": "GeoCoordinates",
          latitude: property.latitude,
          longitude: property.longitude,
        }
      : undefined,
    amenityFeature,
  };
}

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
