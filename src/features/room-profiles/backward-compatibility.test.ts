import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pricing = readFileSync("src/features/pricing/data.ts", "utf8");
const availability = readFileSync("src/features/availability/data.ts", "utf8");
const search = readFileSync("src/features/search/data.ts", "utf8");
const structuredData = readFileSync("src/features/search/structured-data.ts", "utf8");
const roomPage = readFileSync("src/app/(public)/homestay/[slug]/phong/[roomSlug]/page.tsx", "utf8");

describe("V2 Phase 2 backward compatibility", () => {
  it("keeps pricing and availability room-type based", () => {
    expect(pricing).not.toContain("room_quality");
    expect(pricing).not.toContain("physical_room_id");
    expect(availability).not.toContain("room_quality");
    expect(availability).not.toContain("physical_room_id");
  });

  it("keeps search room-type-first without quality threshold filters", () => {
    expect(search).toContain('.from("room_types")');
    expect(search).not.toContain("soundproof_score");
    expect(search).not.toContain("cleanliness_score");
  });

  it("does not serialize quality as ratings or create a physical-room route", () => {
    expect(structuredData).not.toContain("aggregateRating");
    expect(structuredData).not.toContain("reviewRating");
    expect(roomPage).toContain("getPublicVerifiedRoomProfileBundle(room.id)");
  });
});
