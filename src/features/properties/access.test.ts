import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatAccessCertainty } from "@/features/properties/access";

const publicPropertyPage = readFileSync(
  new URL("../../app/(public)/homestay/[slug]/page.tsx", import.meta.url),
  "utf8",
);

describe("Phase 2 public access certainty", () => {
  it("renders three unambiguous customer-facing states", () => {
    expect(formatAccessCertainty("unknown")).toBe("Chưa xác nhận");
    expect(formatAccessCertainty("yes")).toBe("Có");
    expect(formatAccessCertainty("no")).toBe("Không");
  });

  it("does not expose physical quantity or a merged unknown/no label", () => {
    expect(publicPropertyPage).not.toContain("room.quantity");
    expect(publicPropertyPage).not.toContain("phòng vật lý");
    expect(publicPropertyPage).not.toContain("Chưa xác nhận / không");
  });
});
