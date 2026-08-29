import { describe, expect, it } from "vitest";
import {
  formatRoomQualityScore,
  getRoomQualityLabel,
  resolveRoomQualityDimensionState,
  resolveRoomQualityLifecycle,
} from "@/features/room-profiles/policy";

describe("Room Quality scoring", () => {
  it.each([
    [0, "Kém"],
    [29, "Kém"],
    [30, "Yếu"],
    [49, "Yếu"],
    [50, "Trung bình"],
    [69, "Trung bình"],
    [70, "Tốt"],
    [79, "Tốt"],
    [80, "Rất tốt"],
    [89, "Rất tốt"],
    [90, "Xuất sắc"],
    [100, "Xuất sắc"],
  ] as const)("labels %i as %s", (score, label) => {
    expect(getRoomQualityLabel(score)).toBe(label);
  });

  it("stores integer hundred-point values and formats public decimal tens", () => {
    expect(formatRoomQualityScore(87)).toBe("8.7 / 10");
    expect(formatRoomQualityScore(0)).toBe("0.0 / 10");
    expect(formatRoomQualityScore(100)).toBe("10.0 / 10");
    expect(formatRoomQualityScore(null)).toBe("Chưa xác minh");
  });

  it("rejects scores below, above, or between integer storage points", () => {
    expect(() => getRoomQualityLabel(-1)).toThrow(RangeError);
    expect(() => getRoomQualityLabel(101)).toThrow(RangeError);
    expect(() => getRoomQualityLabel(87.5)).toThrow(RangeError);
  });
});

describe("Room Quality freshness", () => {
  const verifiedAt = "2026-01-01T00:00:00.000Z";
  const expiresAt = "2027-01-01T00:00:00.000Z";

  it("uses the shorter cleanliness cycle", () => {
    expect(resolveRoomQualityDimensionState({
      dimension: "cleanliness",
      score: 85,
      verifiedAt,
      expiresAt,
      now: new Date("2026-03-31T23:59:59.000Z"),
    })).toBe("current");
    expect(resolveRoomQualityDimensionState({
      dimension: "cleanliness",
      score: 85,
      verifiedAt,
      expiresAt,
      now: new Date("2026-04-01T00:00:00.000Z"),
    })).toBe("stale");
  });

  it("distinguishes missing, future, expired, and current dimensions", () => {
    expect(resolveRoomQualityDimensionState({ dimension: "wifi", score: null, verifiedAt, expiresAt })).toBe("unknown");
    expect(resolveRoomQualityDimensionState({ dimension: "wifi", score: 80, verifiedAt: "2027-01-01T00:00:00.000Z", expiresAt: "2028-01-01T00:00:00.000Z", now: new Date("2026-01-01T00:00:00.000Z") })).toBe("stale");
    expect(resolveRoomQualityDimensionState({ dimension: "wifi", score: 80, verifiedAt, expiresAt: "2026-02-01T00:00:00.000Z", now: new Date("2026-02-01T00:00:00.000Z") })).toBe("stale");
    expect(resolveRoomQualityDimensionState({ dimension: "room_accuracy", score: 90, verifiedAt, expiresAt, now: new Date("2026-08-30T00:00:00.000Z") })).toBe("current");
  });

  it.each(["pending", "needs_review", "rejected", "expired"] as const)("does not resolve %s as public-current", (status) => {
    expect(resolveRoomQualityLifecycle(status, verifiedAt, expiresAt, new Date("2026-08-30T00:00:00.000Z"))).toBe("not_current");
  });

  it("allows only a current verified lifecycle", () => {
    expect(resolveRoomQualityLifecycle("verified", verifiedAt, expiresAt, new Date("2026-08-30T00:00:00.000Z"))).toBe("current");
    expect(resolveRoomQualityLifecycle("verified", "2026-09-01T00:00:00.000Z", "2027-09-01T00:00:00.000Z", new Date("2026-08-30T00:00:00.000Z"))).toBe("not_current");
  });
});
