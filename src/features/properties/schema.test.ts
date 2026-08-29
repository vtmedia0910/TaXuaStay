import { describe, expect, it } from "vitest";
import { propertySchema } from "@/features/properties/schema";

const validProperty = {
  id: "",
  destination_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  slug: "may-tren-doi",
  name: "Mây Trên Đồi",
  property_type: "homestay",
  short_description: "",
  description: "",
  area_name: "Tà Xùa",
  address: "",
  latitude: "21.305000",
  longitude: "104.430000",
  altitude_m: "",
  google_maps_url: "https://maps.google.com/example",
  public_phone: "",
  public_zalo_url: "",
  check_in_time: "14:00",
  check_out_time: "12:00",
  road_access_grade: "unknown",
  car_access: "yes",
  motorbike_access: "unknown",
  parking: "no",
  restaurant: null,
  breakfast: null,
  bbq: null,
  wifi: "on",
  is_featured: null,
  is_active: "on",
  publish_status: "published",
  amenity_ids: [],
};

describe("property schema", () => {
  it("accepts a URL-safe slug and bounded coordinates", () => {
    const result = propertySchema.parse(validProperty);
    expect(result.slug).toBe("may-tren-doi");
    expect(result.latitude).toBe(21.305);
    expect(result.publish_status).toBe("published");
  });

  it("rejects invalid slugs", () => {
    expect(propertySchema.safeParse({ ...validProperty, slug: "Mây Trên Đồi" }).success).toBe(false);
  });

  it("rejects out-of-range or incomplete coordinates", () => {
    expect(propertySchema.safeParse({ ...validProperty, latitude: "91" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, longitude: "" }).success).toBe(false);
  });

  it("rejects unsupported publish statuses and inactive published records", () => {
    expect(propertySchema.safeParse({ ...validProperty, publish_status: "live" }).success).toBe(false);
    expect(propertySchema.safeParse({ ...validProperty, is_active: null }).success).toBe(false);
  });

  it("preserves unknown, yes, and no as distinct access states", () => {
    expect(propertySchema.parse(validProperty).car_access).toBe("yes");
    expect(propertySchema.parse(validProperty).motorbike_access).toBe("unknown");
    expect(propertySchema.parse(validProperty).parking).toBe("no");
    expect(propertySchema.safeParse({ ...validProperty, car_access: "on" }).success).toBe(false);
  });
});
