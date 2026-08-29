import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const roomPage = readFileSync(
  new URL("../../app/(public)/homestay/[slug]/phong/[roomSlug]/page.tsx", import.meta.url),
  "utf8",
);
const searchData = readFileSync(new URL("../search/data.ts", import.meta.url), "utf8");
const pricingData = readFileSync(new URL("../pricing/data.ts", import.meta.url), "utf8");
const availabilityData = readFileSync(new URL("../availability/data.ts", import.meta.url), "utf8");

describe("V2 Phase 1 backward compatibility", () => {
  it("keeps the public room-type route and makes the exact-room section optional", () => {
    expect(roomPage).toContain("getPublicRoom(property.id, roomSlug)");
    expect(roomPage).toContain("getPublicVerifiedRoomProfileBundle(room.id)");
    expect(roomPage).toContain("<ExactRoomVerifiedSection rooms={roomProfile.exactRooms} />");
  });

  it("keeps search room-type-first", () => {
    expect(searchData).toContain('.from("room_types")');
    expect(searchData).not.toContain('.from("physical_rooms")');
  });

  it("keeps pricing and availability keyed by room type", () => {
    expect(pricingData).toContain("roomTypeIds");
    expect(availabilityData).toContain("roomTypeIds");
    expect(pricingData).not.toContain("physical_room_id");
    expect(availabilityData).not.toContain("physical_room_id");
  });
});
