// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MobileHeroSearch } from "@/components/trip/mobile-hero-search";
import { parseRoomSearchParams } from "@/features/search/params";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

function renderSearch() {
  const page = document.createElement("div");
  page.className = "trip-public-shell";
  document.body.append(page);
  return render(<MobileHeroSearch />, { container: page });
}

describe("MobileHeroSearch", () => {
  it("shows one initial CTA and keeps the full form out of the initial mobile Hero", () => {
    renderSearch();
    expect(screen.getByRole("button", { name: "TÌM PHÒNG PHÙ HỢP" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText("Nhận phòng")).toBeNull();
  });

  it("opens an accessible sheet with exact services, fields, and preferences", () => {
    renderSearch();
    fireEvent.click(screen.getByRole("button", { name: "TÌM PHÒNG PHÙ HỢP" }));

    const dialog = screen.getByRole("dialog", { name: "Tìm phòng phù hợp" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    for (const field of ["Nhận phòng", "Trả phòng", "Số khách", "Số phòng"]) {
      expect(screen.getByLabelText(field)).toBeTruthy();
    }
    expect(dialog.querySelectorAll(".trip-hero-search-field")).toHaveLength(4);
    expect(dialog.querySelector('[name="destination"]')).toBeNull();
    expect(dialog.querySelector('[name="property_type"]')).toBeNull();

    for (const preference of ["Đã thẩm định", "Săn mây", "View từ giường", "Ô tô vào được"]) {
      expect(screen.getByText(preference, { exact: true })).toBeTruthy();
    }
    expect(dialog.querySelectorAll(".trip-hero-preference-chip")).toHaveLength(4);

    expect(screen.getByRole("tab", { name: "Lưu trú" }).getAttribute("aria-selected")).toBe("true");
    for (const future of ["Combo", "Xe khách", "Xe máy"]) {
      expect(screen.getByRole("tab", { name: new RegExp(future) }).getAttribute("aria-disabled")).toBe("true");
    }
    expect(screen.getAllByText("Sắp có", { exact: true })).toHaveLength(3);
  });

  it("locks background scroll, traps focus, closes with Escape, and restores trigger focus", () => {
    renderSearch();
    const menu = document.createElement("details");
    menu.className = "trip-mobile-menu";
    menu.open = true;
    document.querySelector(".trip-public-shell")?.prepend(menu);
    const trigger = screen.getByRole("button", { name: "TÌM PHÒNG PHÙ HỢP" });
    fireEvent.click(trigger);

    const close = screen.getByRole("button", { name: "Đóng tìm kiếm" });
    const page = document.querySelector(".trip-public-shell");
    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe("hidden");
    expect(page?.hasAttribute("inert")).toBe(true);
    expect(menu.open).toBe(false);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect((document.activeElement as HTMLInputElement).name).toBe("car_access");
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
    expect(page?.hasAttribute("inert")).toBe(false);
  });

  it("submits the existing /stay parameter contract without parallel search semantics", () => {
    renderSearch();
    fireEvent.click(screen.getByRole("button", { name: "TÌM PHÒNG PHÙ HỢP" }));

    fireEvent.change(screen.getByLabelText("Nhận phòng"), { target: { value: "2026-11-15" } });
    fireEvent.change(screen.getByLabelText("Trả phòng"), { target: { value: "2026-11-17" } });
    fireEvent.change(screen.getByLabelText("Số khách"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Số phòng"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Đã thẩm định"));
    fireEvent.click(screen.getByLabelText("View từ giường"));
    fireEvent.click(screen.getByLabelText("Ô tô vào được"));

    const form = screen.getByRole("button", { name: /XEM PHÒNG PHÙ HỢP/ }).closest("form");
    expect(form?.getAttribute("action")).toBe("/stay");
    const raw = Object.fromEntries(new FormData(form ?? undefined).entries()) as Record<string, string>;
    const parsed = parseRoomSearchParams(raw);
    expect(parsed.issues).toEqual([]);
    expect(parsed.params).toMatchObject({
      checkIn: "2026-11-15",
      checkOut: "2026-11-17",
      adults: 3,
      children: 0,
      rooms: 2,
      verifiedOnly: true,
      viewFromBedOnly: true,
      carAccess: "yes",
    });
    expect(parsed.normalizedQuery).toBe("check_in=2026-11-15&check_out=2026-11-17&adults=3&children=0&rooms=2&car_access=yes&verified=1&view_from_bed=1");
  });
});
