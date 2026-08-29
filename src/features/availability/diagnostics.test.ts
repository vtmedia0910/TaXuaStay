import { describe, expect, it } from "vitest";
import { detectAdminAvailabilityIssues } from "@/features/availability/diagnostics";
import type { AdminInventoryRowDto } from "@/features/availability/types";

const room = { id: "room-a", name: "Phòng A", quantity: 2, is_active: true };
const now = new Date("2026-08-29T12:00:00Z");

function row(date: string, available_quantity: number, verified_at: string): AdminInventoryRowDto {
  return {
    id: `inventory-${date}`,
    room_type_id: room.id,
    date,
    available_quantity,
    price_override_vnd: null,
    source: "admin",
    verified_at,
    updated_at: verified_at,
  };
}

describe("Admin availability diagnostics", () => {
  it("reports missing, stale, and current sold-out nights", () => {
    const issues = detectAdminAvailabilityIssues({
      rooms: [room],
      expectedDates: ["2026-08-29", "2026-08-30", "2026-08-31"],
      rows: [
        row("2026-08-29", 0, "2026-08-29T11:00:00Z"),
        row("2026-08-30", 2, "2026-08-28T11:00:00Z"),
      ],
      now,
    });
    expect(issues.map((issue) => issue.code)).toEqual(["missing", "stale", "sold-out"]);
  });

  it("ignores inactive rooms in operational warnings", () => {
    expect(detectAdminAvailabilityIssues({
      rooms: [{ ...room, is_active: false }],
      expectedDates: ["2026-08-29"],
      rows: [],
      now,
    })).toEqual([]);
  });

  it("reports inventory that exceeds the physical room quantity", () => {
    const issues = detectAdminAvailabilityIssues({
      rooms: [room],
      expectedDates: ["2026-08-29"],
      rows: [row("2026-08-29", 3, "2026-08-29T11:00:00Z")],
      now,
    });

    expect(issues.map((issue) => issue.code)).toContain("capacity");
    expect(issues.find((issue) => issue.code === "capacity")?.severity).toBe("error");
  });
});
