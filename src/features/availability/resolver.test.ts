import { describe, expect, it } from "vitest";
import { resolveRoomAvailability } from "@/features/availability/resolver";
import type { PublicInventoryRowDto } from "@/features/availability/types";

const now = new Date("2026-08-29T12:00:00.000Z");
const roomId = "00000000-0000-4000-8000-000000000001";

function row(date: string, availableQuantity = 2, verifiedAt = "2026-08-29T11:00:00.000Z"): PublicInventoryRowDto {
  return {
    room_type_id: roomId,
    date,
    available_quantity: availableQuantity,
    source: "admin",
    verified_at: verifiedAt,
  };
}

function quote(inventory: PublicInventoryRowDto[], requestedRooms = 1) {
  return resolveRoomAvailability({
    roomTypeId: roomId,
    checkIn: "2026-11-15",
    checkOut: "2026-11-17",
    requestedRooms,
    inventory,
    now,
  });
}

describe("Phase 6 availability resolver", () => {
  it("returns live only when every night is fresh and sufficient", () => {
    const result = quote([row("2026-11-15"), row("2026-11-16")], 2);
    expect(result.state).toBe("live");
    expect(result.minimum_available_quantity).toBe(2);
    expect(result.missing_dates).toEqual([]);
  });

  it("aggregates mixed live and same-day verification as verified_today", () => {
    const result = quote([
      row("2026-11-15"),
      row("2026-11-16", 2, "2026-08-29T00:00:00.000Z"),
    ]);
    expect(result.nightly_lines.map((line) => line.state)).toEqual(["live", "verified_today"]);
    expect(result.state).toBe("verified_today");
  });

  it("uses needs_confirmation for stale data, including stale zero", () => {
    const result = quote([
      row("2026-11-15"),
      row("2026-11-16", 0, "2026-08-28T11:59:59.000Z"),
    ]);
    expect(result.nightly_lines[1].state).toBe("needs_confirmation");
    expect(result.state).toBe("needs_confirmation");
    expect(result.stale_dates).toEqual(["2026-11-16"]);
  });

  it("treats no rows and partial coverage as unknown, never available", () => {
    expect(quote([]).state).toBe("unknown");
    const partial = quote([row("2026-11-15")]);
    expect(partial.state).toBe("unknown");
    expect(partial.minimum_available_quantity).toBeNull();
    expect(partial.missing_dates).toEqual(["2026-11-16"]);
  });

  it("uses sold_out for any current night below requested room count", () => {
    const result = quote([row("2026-11-15", 2), row("2026-11-16", 1)], 2);
    expect(result.nightly_lines[1]).toMatchObject({ state: "sold_out", sufficient_quantity: false });
    expect(result.state).toBe("sold_out");
  });

  it("lets a current insufficient night deterministically override a missing night", () => {
    const result = quote([row("2026-11-15", 0)]);
    expect(result.state).toBe("sold_out");
    expect(result.missing_dates).toEqual(["2026-11-16"]);
  });

  it("returns unknown for invalid ranges and never falls back to physical quantity", () => {
    const result = resolveRoomAvailability({
      roomTypeId: roomId,
      checkIn: "2026-11-17",
      checkOut: "2026-11-15",
      requestedRooms: 1,
      inventory: [row("2026-11-15", 99)],
      now,
    });
    expect(result).toMatchObject({ nights: 0, state: "unknown", minimum_available_quantity: null });
  });

  it("does not expose future verification timestamps as current summary facts", () => {
    const result = quote([
      row("2026-11-15", 2, "2026-08-29T12:00:00.001Z"),
      row("2026-11-16", 2, "2026-08-29T12:00:00.001Z"),
    ]);

    expect(result.state).toBe("unknown");
    expect(result.freshest_verified_at).toBeNull();
    expect(result.oldest_verified_at).toBeNull();
    expect(result.oldest_verification_age_hours).toBeNull();
  });
});
