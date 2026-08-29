import { describe, expect, it } from "vitest";
import { physicalRoomSchema } from "@/features/physical-rooms/schema";

const validPhysicalRoom = {
  id: "",
  property_id: "11111111-1111-4111-8111-111111111111",
  room_type_id: "22222222-2222-4222-8222-222222222222",
  room_code: "tx-may-203",
  display_name: "Phòng 203",
  floor_label: "Tầng 2",
  unit_label: "203",
  position_notes: "",
  exact_room_bookable: null,
  is_active: "on",
  publish_status: "published",
};

describe("physical room schema", () => {
  it("requires a stable code and normalizes it to uppercase", () => {
    expect(physicalRoomSchema.parse(validPhysicalRoom).room_code).toBe("TX-MAY-203");
    expect(physicalRoomSchema.safeParse({ ...validPhysicalRoom, room_code: "Phòng 203" }).success).toBe(false);
  });

  it("requires property and room-type identities", () => {
    expect(physicalRoomSchema.safeParse({ ...validPhysicalRoom, property_id: "" }).success).toBe(false);
    expect(physicalRoomSchema.safeParse({ ...validPhysicalRoom, room_type_id: "" }).success).toBe(false);
  });

  it("does not allow an inactive published room", () => {
    expect(physicalRoomSchema.safeParse({ ...validPhysicalRoom, is_active: null }).success).toBe(false);
  });
});
