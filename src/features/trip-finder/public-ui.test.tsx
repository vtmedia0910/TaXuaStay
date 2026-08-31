// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TripFinderExperience } from "@/components/trip/trip-finder-experience";
import { parseTripFinderParams } from "@/features/trip-finder/params";
import type { PublicTripRecommendation, TripFinderCandidateSet, TripFinderResolution } from "@/features/trip-finder/types";

afterEach(cleanup);

describe("Trip Finder public experience", () => {
  it("renders one clear mobile landing CTA and truthful promise", () => {
    render(<TripFinderExperience parsed={parseTripFinderParams({})} />);
    expect(screen.getByRole("heading", { level: 1, name: /Tìm chuyến đi dựa trên/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /BẮT ĐẦU/ }).getAttribute("href")).toContain("/trip-finder?");
    expect(screen.getByText(/“Chưa xác nhận” luôn khác “Không”/)).toBeTruthy();
  });

  it("renders progressive controls with large semantic form fields", () => {
    render(<TripFinderExperience parsed={parseTripFinderParams({ step: "1" })} />);
    expect(screen.getByLabelText("Ngày đi").hasAttribute("required")).toBe(true);
    expect(screen.getByLabelText("Ngày về").hasAttribute("required")).toBe(true);
    expect(screen.getByRole("button", { name: /TIẾP TỤC/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Quay lại/ }).getAttribute("href")).toBe("/trip-finder");
  });

  it("keeps query/result pages canonical and noindex while preserving temporary-host policy", async () => {
    const page = await readFile(resolve(process.cwd(), "src/app/(public)/trip-finder/page.tsx"), "utf8");
    expect(page).toContain('alternates: { canonical: "/trip-finder" }');
    expect(page).toContain("index: false, follow: true");
    expect(page).toContain("getPublicPageRobots");
  });

  it("keeps the locked Hero room-search action unchanged", async () => {
    const hero = await readFile(resolve(process.cwd(), "src/components/trip/hero-search.tsx"), "utf8");
    const mobile = await readFile(resolve(process.cwd(), "src/components/trip/mobile-hero-search.tsx"), "utf8");
    expect(hero).toContain('action="/stay"');
    expect(hero).toContain("TÌM PHÒNG PHÙ HỢP");
    expect(mobile).toContain('action="/stay"');
  });

  it("uses only the public Supabase client and existing public views", async () => {
    const data = await readFile(resolve(process.cwd(), "src/features/trip-finder/data.ts"), "utf8");
    expect(data).toContain("createPublicSupabaseClient");
    expect(data).not.toMatch(/createServerSupabaseClient|SERVICE_ROLE|SECRET_KEY|ANON_KEY/);
    expect(data).not.toMatch(/supplier|partner_relationship|commercial_rate|room_commercial/i);
  });

  it("renders reasons, caveats and only truthful Phase 7 actions without a mystery score", () => {
    const parsed = parseTripFinderParams({ results: "1", check_in: "2026-10-10", check_out: "2026-10-12" });
    const item: PublicTripRecommendation = {
      id: "stay:room-1", kind: "stay", kindLabel: "Phòng", name: "Phòng Mây",
      context: "Nhà Mây · Tà Xùa", imageUrl: null, imageAlt: "Phòng Mây", group: "conditional",
      reasons: ["Sức chứa phù hợp với số khách và số phòng đã chọn."],
      tradeOffs: [], unknownFacts: ["Chưa xác nhận ô tô có vào được theo yêu cầu của bạn."],
      verificationLabels: ["Loại phòng"],
      price: { state: "unknown", amountVnd: null, label: "Cần xác nhận giá" },
      availability: { state: "unknown", label: "Chưa có dữ liệu tình trạng phòng" },
      confirmation: { state: "detail", label: "Xem chi tiết; chưa phải giữ phòng." },
      actions: [{ label: "XEM PHÒNG", href: "/stay/nha-may/phong-may", external: false }],
      policyVersion: "phase7-trip-finder-v1",
    };
    const resolution: TripFinderResolution = {
      groups: [{ key: "conditional", label: "Phù hợp nếu...", items: [item] }],
      recommendations: [item], excludedCount: 0, relaxationOptions: [], policyVersion: "phase7-trip-finder-v1",
    };
    const candidateSet: TripFinderCandidateSet = {
      candidates: [], status: "ready", sources: { stay: "ready", packages: "empty", motorbike: "empty" },
    };
    render(<TripFinderExperience parsed={parsed} candidateSet={candidateSet} resolution={resolution} />);
    expect(screen.getByRole("heading", { name: "Phù hợp nếu..." })).toBeTruthy();
    expect(screen.getByText(/Sức chứa phù hợp/)).toBeTruthy();
    expect(screen.getByText(/Chưa xác nhận ô tô/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /XEM PHÒNG/ })).toBeTruthy();
    expect(screen.queryByText(/AI Score|% Match|ĐẶT NGAY|THANH TOÁN|GIỮ CHỖ/i)).toBeNull();
  });

  it("renders a truthful empty state and keeps error recovery inside the existing route", async () => {
    const parsed = parseTripFinderParams({ results: "1", check_in: "2026-10-10", check_out: "2026-10-12" });
    const candidateSet: TripFinderCandidateSet = {
      candidates: [], status: "empty", sources: { stay: "empty", packages: "empty", motorbike: "empty" },
    };
    const resolution: TripFinderResolution = {
      groups: [], recommendations: [], excludedCount: 0,
      relaxationOptions: ["Thử ngày khác để kiểm tra lại giá và tình trạng phòng."],
      policyVersion: "phase7-trip-finder-v1",
    };
    render(<TripFinderExperience parsed={parsed} candidateSet={candidateSet} resolution={resolution} />);
    expect(screen.getByRole("heading", { name: /Chưa có lựa chọn đủ dữ liệu/ })).toBeTruthy();
    expect(screen.getByText(/không tạo ứng viên, giá hay tình trạng mẫu/i)).toBeTruthy();
    const errorBoundary = await readFile(resolve(process.cwd(), "src/app/(public)/trip-finder/error.tsx"), "utf8");
    expect(errorBoundary).toContain("Lựa chọn của bạn vẫn nằm trong đường dẫn");
    expect(errorBoundary).toContain("reset");
  });
});
