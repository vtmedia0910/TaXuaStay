import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/features/bookings/data.ts"), "utf8");

describe("Phase 8 Booking request review", () => {
  it("does not treat an empty source selection as a request-ready review", () => {
    expect(source).toMatch(/input\.selections\.length\s*>\s*0\s*&&\s*items\.length\s*===\s*input\.selections\.length/);
  });
});
