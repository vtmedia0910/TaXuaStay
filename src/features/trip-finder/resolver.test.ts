import { describe, expect, it } from "vitest";
import { DEFAULT_TRIP_FINDER_INTENT } from "@/features/trip-finder/params";
import { resolveTripFinder } from "@/features/trip-finder/resolver";
import {
  TRIP_FINDER_POLICY_VERSION,
  type TripFinderCandidate,
  type TripFinderIntent,
} from "@/features/trip-finder/types";

function candidate(id: string, overrides: Partial<TripFinderCandidate> = {}): TripFinderCandidate {
  return {
    id,
    kind: "stay",
    name: `Phòng ${id}`,
    context: "Nơi lưu trú thật · Tà Xùa",
    imageUrl: null,
    imageAlt: `Ảnh ${id}`,
    capacity: "yes",
    carAccess: "yes",
    motorbikeAccess: "yes",
    roadVerified: true,
    bathroomType: "private",
    viewType: "mountain",
    hasPrivateBalcony: false,
    cloudScore: null,
    viewFromBed: null,
    currentQualityDimensions: 0,
    verificationLabels: [],
    componentTypes: ["ROOM"],
    price: { state: "current", amountVnd: 1_000_000, label: "1.000.000 ₫ · Giá đã xác minh" },
    availability: { state: "available", label: "Còn phòng" },
    confirmation: { state: "detail", label: "Xem chi tiết; chưa phải giữ phòng." },
    actions: [{ label: "XEM PHÒNG", href: `/stay/demo/${id}`, external: false }],
    ...overrides,
  };
}

function intent(overrides: Partial<TripFinderIntent> = {}): TripFinderIntent {
  return {
    ...DEFAULT_TRIP_FINDER_INTENT,
    checkIn: "2026-10-10",
    checkOut: "2026-10-12",
    ...overrides,
  };
}

describe("Phase 7 deterministic Trip Finder policy", () => {
  it("eliminates definite capacity failures, sold-out candidates, and definite car-access failures", () => {
    const result = resolveTripFinder({
      intent: intent({ roadNeed: "car_required" }),
      candidates: [
        candidate("capacity", { capacity: "no" }),
        candidate("sold", { availability: { state: "unavailable", label: "Hết phòng" } }),
        candidate("road", { carAccess: "no" }),
        candidate("eligible"),
      ],
    });
    expect(result.recommendations.map((item) => item.id)).toEqual(["eligible"]);
    expect(result.excludedCount).toBe(3);
  });

  it("keeps unknown distinct from no and puts an unknown hard fact in the conditional group", () => {
    const result = resolveTripFinder({
      intent: intent({ roadNeed: "car_required" }),
      candidates: [candidate("unknown-road", { carAccess: "unknown", roadVerified: false })],
    });
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].group).toBe("conditional");
    expect(result.recommendations[0].unknownFacts.join(" ")).toContain("Chưa xác nhận ô tô");
  });

  it("uses view, quality, verification, and verified road facts only as explainable fit signals", () => {
    const preferred = candidate("preferred", {
      cloudScore: 8.6,
      viewFromBed: "yes",
      currentQualityDimensions: 5,
      verificationLabels: ["Loại phòng", "Cloud View", "Đường vào"],
    });
    const result = resolveTripFinder({
      intent: intent({ viewPriority: "cloud_view", qualityPreference: "current_quality", prefersVerified: true, roadNeed: "car_required" }),
      candidates: [candidate("plain"), preferred],
    });
    expect(result.recommendations[0].id).toBe("preferred");
    expect(result.recommendations[0].reasons.join(" ")).toContain("Cloud View");

    const qualityResult = resolveTripFinder({
      intent: intent({ qualityPreference: "current_quality" }),
      candidates: [candidate("plain"), preferred],
    });
    expect(qualityResult.recommendations[0].reasons.join(" ")).toContain("5 tiêu chí");

    const verificationResult = resolveTripFinder({
      intent: intent({ prefersVerified: true }),
      candidates: [candidate("plain"), preferred],
    });
    expect(verificationResult.recommendations[0].reasons.join(" ")).toContain("dữ liệu đã thẩm định");
  });

  it("treats preferences as ranking signals instead of silently filtering non-matches", () => {
    const result = resolveTripFinder({
      intent: intent({ viewPriority: "valley" }),
      candidates: [candidate("mountain"), candidate("valley", { viewType: "valley" })],
    });
    expect(result.recommendations.map((item) => item.id)).toEqual(["valley", "mountain"]);
    expect(result.recommendations).toHaveLength(2);
  });

  it("does not turn missing price into zero and explains the unknown price", () => {
    const result = resolveTripFinder({
      intent: intent({ budgetPreference: "complete_price" }),
      candidates: [candidate("missing-price", { price: { state: "unknown", amountVnd: null, label: "Cần xác nhận giá" } })],
    });
    expect(result.recommendations[0].price.amountVnd).toBeNull();
    expect(result.recommendations[0].unknownFacts).toContain("Cần xác nhận giá");
  });

  it("keeps unknown availability as a conditional fact instead of treating it as sold out", () => {
    const result = resolveTripFinder({
      intent: intent(),
      candidates: [candidate("unknown-availability", { availability: { state: "unknown", label: "Chưa có dữ liệu tình trạng phòng" } })],
    });
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].group).toBe("conditional");
    expect(result.recommendations[0].unknownFacts).toContain("Chưa có dữ liệu tình trạng phòng");
  });

  it("keeps Package and Motorbike manual confirmation explicit", () => {
    const packageResult = resolveTripFinder({
      intent: intent({ wantsPackage: true }),
      candidates: [candidate("pkg", {
        kind: "package",
        componentTypes: ["ROOM", "MOTORBIKE"],
        confirmation: { state: "manual", label: "Đội ngũ xác nhận thủ công" },
        actions: [{ label: "XEM GÓI", href: "/packages/pkg", external: false }],
      })],
    });
    expect(packageResult.recommendations[0].tradeOffs).toContain("Đội ngũ xác nhận thủ công");

    const hiddenBike = resolveTripFinder({ intent: intent(), candidates: [candidate("bike", { kind: "motorbike", capacity: "not_applicable", componentTypes: ["MOTORBIKE"] })] });
    const requestedBike = resolveTripFinder({ intent: intent({ wantsMotorbike: true }), candidates: [candidate("bike", { kind: "motorbike", capacity: "not_applicable", componentTypes: ["MOTORBIKE"], confirmation: { state: "manual", label: "Xác nhận thủ công với nhà vận hành" } })] });
    expect(hiddenBike.recommendations).toHaveLength(0);
    expect(requestedBike.recommendations[0].tradeOffs).toContain("Xác nhận thủ công với nhà vận hành");
  });

  it("uses a stable ID tie-breaker and returns at most three recommendations", () => {
    const first = resolveTripFinder({ intent: intent(), candidates: [candidate("c"), candidate("a"), candidate("d"), candidate("b")] });
    const second = resolveTripFinder({ intent: intent(), candidates: [candidate("b"), candidate("d"), candidate("a"), candidate("c")] });
    expect(first.recommendations.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(second.recommendations.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("returns policy version and explicit relaxation choices without auto-relaxing hard constraints", () => {
    const result = resolveTripFinder({
      intent: intent({ roadNeed: "car_required", wantsMotorbike: true, rooms: 2 }),
      candidates: [candidate("no", { carAccess: "no" })],
    });
    expect(result.policyVersion).toBe(TRIP_FINDER_POLICY_VERSION);
    expect(result.recommendations).toEqual([]);
    expect(result.relaxationOptions.join(" ")).toContain("Bỏ yêu cầu ô tô");
    expect(result.relaxationOptions.join(" ")).toContain("Điều chỉnh số phòng");
  });

  it("has no commercial-economics or Partner-tier input surface", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("./resolver.ts", import.meta.url), "utf8"));
    expect(source).not.toMatch(/margin|contribution|supplier[_ ]?tier|partner[_ ]?tier|net_cost/i);
    expect(source).not.toMatch(/confidence[_ ]?score|ai[_ ]?score/i);
  });

  it("returns an allow-listed public DTO without the internal score or private fields", () => {
    const result = resolveTripFinder({
      intent: intent(),
      candidates: [candidate("public-safe")],
    });
    const publicResult = JSON.stringify(result.recommendations[0]);
    expect(publicResult).not.toMatch(/score|net_cost|margin|contribution|partner_tier|supplier|contract|internal_notes|external_reference/i);
    expect(Object.keys(result.recommendations[0])).toEqual([
      "id", "kind", "kindLabel", "name", "context", "imageUrl", "imageAlt", "group",
      "reasons", "tradeOffs", "unknownFacts", "verificationLabels", "price", "availability",
      "confirmation", "actions", "policyVersion",
    ]);
  });
});
