import { describe, expect, it } from "vitest";
import {
  isExactRoomVerified,
  resolveExactRoomVerificationState,
} from "@/features/physical-rooms/policy";
import type { PublicVerificationBadgeDto } from "@/features/verification/types";

const now = new Date("2026-08-30T00:00:00.000Z");
const exactBadge: PublicVerificationBadgeDto = {
  verification_id: "verification-exact-room",
  verification_type: "room",
  property_id: null,
  room_type_id: null,
  physical_room_id: "physical-room-a",
  verified_at: "2026-08-29T00:00:00.000Z",
  expires_at: "2027-08-29T00:00:00.000Z",
};

function resolve(overrides: Partial<Parameters<typeof isExactRoomVerified>[0]> = {}) {
  return isExactRoomVerified({
    physicalRoomId: "physical-room-a",
    roomCode: "TX-MAY-203",
    isPublicPhysicalRoom: true,
    roomVerification: exactBadge,
    evidencePhysicalRoomIds: ["physical-room-a"],
    now,
    ...overrides,
  });
}

describe("exact physical-room verification resolver", () => {
  it("does not verify a physical-room row or approved media alone", () => {
    expect(resolve({ roomVerification: null, evidencePhysicalRoomIds: [] })).toBe(false);
    expect(resolve({ roomVerification: null, evidencePhysicalRoomIds: ["physical-room-a"] })).toBe(false);
  });

  it("does not promote a room-type verification to exact-room verification", () => {
    expect(resolve({
      roomVerification: { ...exactBadge, room_type_id: "room-type-a", physical_room_id: null },
    })).toBe(false);
  });

  it("requires exact-target evidence for the current physical-room verification", () => {
    expect(resolve()).toBe(true);
    expect(resolve({ evidencePhysicalRoomIds: ["physical-room-b"] })).toBe(false);
  });

  it("rejects expired and future exact-room verification", () => {
    expect(resolve({ roomVerification: { ...exactBadge, expires_at: now.toISOString() } })).toBe(false);
    expect(resolve({ roomVerification: { ...exactBadge, verified_at: "2026-08-31T00:00:00.000Z" } })).toBe(false);
  });

  it("does not treat bookability or an unpublished physical room as verification", () => {
    expect(resolve({ isPublicPhysicalRoom: false })).toBe(false);
  });

  it("resolves lifecycle states without using exact-room bookability", () => {
    const common = {
      physicalRoomId: "physical-room-a",
      roomCode: "TX-MAY-203",
      isPublicPhysicalRoom: true,
      evidencePhysicalRoomIds: ["physical-room-a"],
      now,
    };
    expect(resolveExactRoomVerificationState({ ...common, roomVerification: null })).toBe("not_verified");
    expect(resolveExactRoomVerificationState({ ...common, roomVerification: { ...exactBadge, status: "needs_review" } })).toBe("needs_review");
    expect(resolveExactRoomVerificationState({ ...common, roomVerification: { ...exactBadge, status: "expired" } })).toBe("expired");
    expect(resolveExactRoomVerificationState({ ...common, roomVerification: exactBadge })).toBe("verified");
  });
});
