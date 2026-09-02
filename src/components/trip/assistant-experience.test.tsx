// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantExperience } from "@/components/trip/assistant-experience";
import { createDefaultAdvisorState } from "@/features/ai/advisor/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/assistant" }));

describe("Phase 13A AssistantExperience states", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders a bounded long answer and public source without HTML execution", async () => {
    const longAnswer = `${"Thông tin đã xác nhận. ".repeat(130)}<script>unsafe()</script>`;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      answer: longAnswer,
      sources: [{ label: "Lưu trú Tà Xùa", href: "/stay" }],
    }), { status: 200, headers: { "content-type": "application/json" } })));
    const { container } = render(<AssistantExperience />);
    fireEvent.change(screen.getByLabelText("Câu hỏi cho Trợ lý Tà Xùa Trip"), { target: { value: "Cho tôi thông tin chi tiết" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    await waitFor(() => expect(container.textContent).toContain("<script>unsafe()</script>"));
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByRole("link", { name: "Lưu trú Tà Xùa" }).getAttribute("href")).toBe("/stay");
  });

  it("shows safe rate-limit feedback, fallback actions and retry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      error: { code: "AI_RATE_LIMITED", message: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi một chút rồi thử lại." },
      fallbacks: [{ label: "Tìm chuyến đi", href: "/trip-finder" }],
    }), { status: 429, headers: { "content-type": "application/json" } })));
    render(<AssistantExperience />);
    fireEvent.change(screen.getByLabelText("Câu hỏi cho Trợ lý Tà Xùa Trip"), { target: { value: "Tìm phòng" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    expect(await screen.findByText(/đang gửi yêu cầu quá nhanh/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tìm chuyến đi" }).getAttribute("href")).toBe("/trip-finder");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
  });

  it("keeps bounded advisor state in session storage, sends it on follow-up and resets only the conversation", async () => {
    const state = createDefaultAdvisorState();
    state.trip.guestCount = 2;
    state.preferences.cloudView = true;
    state.preferences.priorityTags = ["cloud_view"];
    state.consultation.stage = "NARROW";
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({
      answer: "Mình đã ghi nhận chuyến đi 2 người và ưu tiên săn mây.",
      sources: [],
      advisor: { statePatch: state, stage: "NARROW", suggestedReplies: ["Dưới 1,5 triệu/đêm", "Đi ô tô"] },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantExperience />);

    fireEvent.change(screen.getByLabelText("Câu hỏi cho Trợ lý Tà Xùa Trip"), { target: { value: "2 người, ưu tiên săn mây" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    expect(await screen.findByText("Mình đã ghi nhận chuyến đi 2 người và ưu tiên săn mây.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dưới 1,5 triệu/đêm" })).toBeTruthy();
    expect(JSON.parse(window.sessionStorage.getItem("tx-trip-advisor-state-phase13e-v1") ?? "{}").trip.guestCount).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "Đi ô tô" }));
    expect((screen.getByLabelText("Câu hỏi cho Trợ lý Tà Xùa Trip") as HTMLTextAreaElement).value).toBe("Đi ô tô");
    fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).toContain('"guestCount":2');

    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu lại cuộc tư vấn" }));
    expect(screen.queryByText("Mình đã ghi nhận chuyến đi 2 người và ưu tiên săn mây.")).toBeNull();
    expect(window.sessionStorage.getItem("tx-trip-advisor-state-phase13e-v1")).toBeNull();
    expect(window.sessionStorage.getItem("tx-trip-assistant-session")).toBeTruthy();
  });
});
