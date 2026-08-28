import { describe, expect, it } from "vitest";
import { mediaAssetSchema } from "@/features/media/schema";

const validMedia = {
  id: "",
  property_id: "11111111-1111-4111-8111-111111111111",
  room_type_id: "",
  media_type: "photo",
  evidence_type: "property",
  url: "https://example.com/property.jpg",
  thumbnail_url: "",
  caption: "",
  alt_text: "Mặt trước nơi lưu trú",
  sort_order: "0",
  captured_at: "2026-08-29T06:30",
  latitude: "21.305",
  longitude: "104.43",
  compass_heading_deg: "359.99",
  horizontal_fov_deg: "120",
  is_verified: "on",
};

describe("media asset schema", () => {
  it("accepts reviewed HTTPS evidence with one owner", () => {
    const result = mediaAssetSchema.parse(validMedia);
    expect(result.media_type).toBe("photo");
    expect(result.evidence_type).toBe("property");
  });

  it("rejects insecure URLs and unsupported media/evidence types", () => {
    expect(mediaAssetSchema.safeParse({ ...validMedia, url: "http://example.com/a.jpg" }).success).toBe(false);
    expect(mediaAssetSchema.safeParse({ ...validMedia, media_type: "audio" }).success).toBe(false);
    expect(mediaAssetSchema.safeParse({ ...validMedia, evidence_type: "marketing" }).success).toBe(false);
  });

  it("enforces relation, heading, FOV, and coordinate semantics", () => {
    expect(mediaAssetSchema.safeParse({ ...validMedia, room_type_id: "22222222-2222-4222-8222-222222222222" }).success).toBe(false);
    expect(mediaAssetSchema.safeParse({ ...validMedia, compass_heading_deg: "360" }).success).toBe(false);
    expect(mediaAssetSchema.safeParse({ ...validMedia, horizontal_fov_deg: "0" }).success).toBe(false);
    expect(mediaAssetSchema.safeParse({ ...validMedia, longitude: "" }).success).toBe(false);
  });
});
