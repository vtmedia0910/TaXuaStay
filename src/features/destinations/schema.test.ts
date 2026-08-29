import { describe, expect, it } from "vitest";
import { destinationSchema } from "@/features/destinations/schema";

const validDestination = {
  id: "",
  slug: "ta-xua",
  name: "Tà Xùa",
  short_name: "",
  province: "",
  country_code: "vn",
  timezone: "Asia/Ho_Chi_Minh",
  latitude: "",
  longitude: "",
  altitude_reference_m: "",
  description: "",
  is_active: "on",
  publish_status: "published",
};

describe("destination schema", () => {
  it("accepts the factual Tà Xùa identity and normalizes country code", () => {
    const result = destinationSchema.parse(validDestination);
    expect(result.slug).toBe("ta-xua");
    expect(result.country_code).toBe("VN");
    expect(result.latitude).toBeNull();
  });

  it("requires a URL-safe slug and timezone", () => {
    expect(destinationSchema.safeParse({ ...validDestination, slug: "Tà Xùa" }).success).toBe(false);
    expect(destinationSchema.safeParse({ ...validDestination, timezone: "" }).success).toBe(false);
  });

  it("enforces coordinate bounds and pairs", () => {
    expect(destinationSchema.safeParse({ ...validDestination, latitude: "91", longitude: "104" }).success).toBe(false);
    expect(destinationSchema.safeParse({ ...validDestination, latitude: "21.3" }).success).toBe(false);
  });

  it("rejects an inactive published destination", () => {
    expect(destinationSchema.safeParse({ ...validDestination, is_active: null }).success).toBe(false);
  });
});
