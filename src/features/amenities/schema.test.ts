import { describe, expect, it } from "vitest";
import { amenitySchema } from "@/features/amenities/schema";

describe("amenity schema", () => {
  it("accepts catalog slugs and supported categories", () => {
    const result = amenitySchema.parse({
      id: "",
      slug: "may-say-toc",
      name: "Máy sấy tóc",
      category: "bathroom",
      icon_key: "wind",
      description: "",
      is_active: "on",
      sort_order: "10",
    });
    expect(result.category).toBe("bathroom");
  });

  it("rejects invalid slugs and categories", () => {
    const base = { id: "", slug: "wifi", name: "Wi-Fi", icon_key: "", description: "", is_active: "on", sort_order: "0" };
    expect(amenitySchema.safeParse({ ...base, category: "network" }).success).toBe(false);
    expect(amenitySchema.safeParse({ ...base, category: "comfort", slug: "Wi Fi" }).success).toBe(false);
  });
});
