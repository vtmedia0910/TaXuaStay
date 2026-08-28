import { describe, expect, it } from "vitest";
import { roomTypeSchema } from "@/features/rooms/schema";

const validRoom = {
  id: "",
  property_id: "11111111-1111-4111-8111-111111111111",
  slug: "bungalow-panorama",
  name: "Bungalow Panorama",
  short_description: "",
  description: "",
  capacity_adults: "2",
  capacity_children: "1",
  max_guests: "3",
  bed_type: "queen",
  bed_count: "1",
  bathroom_type: "private",
  quantity: "2",
  size_m2: "28.5",
  floor_label: "",
  has_private_balcony: "on",
  view_type: "valley",
  is_active: "on",
  publish_status: "published",
  amenity_ids: [],
};

describe("room type schema", () => {
  it("accepts sensible capacity, physical quantity, and publish status", () => {
    const result = roomTypeSchema.parse(validRoom);
    expect(result.max_guests).toBe(3);
    expect(result.quantity).toBe(2);
    expect(result.publish_status).toBe("published");
  });

  it("rejects invalid slug, capacity, and quantity", () => {
    expect(roomTypeSchema.safeParse({ ...validRoom, slug: "Phòng View" }).success).toBe(false);
    expect(roomTypeSchema.safeParse({ ...validRoom, max_guests: "4" }).success).toBe(false);
    expect(roomTypeSchema.safeParse({ ...validRoom, quantity: "-1" }).success).toBe(false);
  });

  it("requires active physical units before publication", () => {
    expect(roomTypeSchema.safeParse({ ...validRoom, quantity: "0" }).success).toBe(false);
    expect(roomTypeSchema.safeParse({ ...validRoom, is_active: null }).success).toBe(false);
  });
});
