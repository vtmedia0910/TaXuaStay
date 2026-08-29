import { describe, expect, it } from "vitest";
import { buildRoomSearchUrl, parseRoomSearchParams } from "@/features/search/params";

describe("Phase 3 search params", () => {
  it("accepts valid dates and bounded guest context", () => {
    const result = parseRoomSearchParams({
      check_in: "2026-11-15",
      check_out: "2026-11-17",
      adults: "2",
      children: "1",
      rooms: "2",
    });
    expect(result.issues).toEqual([]);
    expect(result.params).toMatchObject({
      checkIn: "2026-11-15",
      checkOut: "2026-11-17",
      adults: 2,
      children: 1,
      rooms: 2,
    });
  });

  it("drops invalid calendar dates without crashing", () => {
    const result = parseRoomSearchParams({ check_in: "2026-02-30", check_out: "not-a-date" });
    expect(result.params.checkIn).toBeUndefined();
    expect(result.params.checkOut).toBeUndefined();
    expect(result.issues).toHaveLength(2);
  });

  it.each(["2026-11-15", "2026-11-14"])("rejects checkout %s when check-in is 2026-11-15", (checkOut) => {
    const result = parseRoomSearchParams({ check_in: "2026-11-15", check_out: checkOut });
    expect(result.params.checkIn).toBe("2026-11-15");
    expect(result.params.checkOut).toBeUndefined();
    expect(result.issues).toContain("Ngày trả phòng phải sau ngày nhận phòng.");
  });

  it("falls back safely for adult, child, room, and page bounds", () => {
    const result = parseRoomSearchParams({ adults: "0", children: "21", rooms: "11", page: "-1" });
    expect(result.params).toMatchObject({ adults: 2, children: 0, rooms: 1, page: 1 });
    expect(result.issues).toHaveLength(4);
  });

  it("ignores unknown query params", () => {
    const result = parseRoomSearchParams({ unknown: "unsafe", adults: "3" });
    expect(result.issues).toEqual([]);
    expect(result.normalizedQuery).not.toContain("unknown");
  });

  it("normalizes URL parameters in a stable order and keeps date/guest context", () => {
    const parsed = parseRoomSearchParams({
      parking: "yes",
      area: "Tà Xùa",
      children: "0",
      rooms: "1",
      adults: "2",
      check_out: "2026-11-17",
      check_in: "2026-11-15",
      wifi: "1",
    });
    expect(buildRoomSearchUrl(parsed.params)).toBe(
      "/tim-phong?check_in=2026-11-15&check_out=2026-11-17&adults=2&children=0&rooms=1&area=T%C3%A0+X%C3%B9a&parking=yes&wifi=1",
    );
  });

  it("enables the current-availability filter only with a complete valid stay", () => {
    const valid = parseRoomSearchParams({ check_in: "2026-11-15", check_out: "2026-11-17", available: "1" });
    expect(valid.params.availableOnly).toBe(true);
    expect(valid.normalizedQuery).toContain("available=1");

    const missingDates = parseRoomSearchParams({ available: "1" });
    expect(missingDates.params.availableOnly).toBe(false);
    expect(missingDates.issues).toContain("Chỉ có thể lọc phòng đang xác nhận còn khi đã chọn đủ ngày hợp lệ.");
  });
});
