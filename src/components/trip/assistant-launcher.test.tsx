// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantLauncher } from "@/components/trip/assistant-launcher";

let currentPathname = "/";

vi.mock("next/navigation", () => ({ usePathname: () => currentPathname }));

describe("Phase 13C AssistantLauncher", () => {
  beforeEach(() => {
    currentPathname = "/";
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 1_000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows one restrained teaser after the delay and records the session", () => {
    vi.useFakeTimers();
    render(<AssistantLauncher readiness="ready" />);
    expect(screen.queryByLabelText("Gợi ý từ Trợ lý AI")).toBeNull();
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByLabelText("Gợi ý từ Trợ lý AI")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ẩn lời chào Trợ lý AI" }));
    expect(screen.queryByLabelText("Gợi ý từ Trợ lý AI")).toBeNull();
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(1);
  });

  it("can reveal the teaser after 30% scroll without waiting for the timer", () => {
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2_000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 500 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 500 });
    render(<AssistantLauncher readiness="ready" />);
    fireEvent.scroll(window);
    expect(screen.getByLabelText("Gợi ý từ Trợ lý AI")).toBeTruthy();
  });

  it("opens the lazy embedded panel without a provider call and submits only on explicit send", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response(JSON.stringify({ answer: "Thông tin đã kiểm tra.", sources: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantLauncher readiness="ready" />);
    fireEvent.click(screen.getByRole("button", { name: "Mở Trợ lý AI Tà Xùa Trip" }));
    const dialog = await screen.findByRole("dialog", { name: "Trợ lý AI Tà Xùa Trip" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("link", { name: "Mở Trợ lý AI toàn màn hình" }).getAttribute("href")).toBe("/assistant");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gợi ý phòng hợp 2 người" }));
    const input = screen.getByLabelText("Câu hỏi cho Trợ lý Tà Xùa Trip") as HTMLTextAreaElement;
    expect(input.value).toBe("Gợi ý phòng hợp 2 người");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Thông tin đã kiểm tra.")).toBeTruthy();
    const request = fetchMock.mock.calls[0]?.[1];
    expect(String(request?.body)).toContain('"pageKind":"home"');
    fireEvent.click(screen.getByRole("button", { name: "Thu nhỏ Trợ lý AI" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Mở Trợ lý AI Tà Xùa Trip" }));
    expect(await screen.findByText("Thông tin đã kiểm tra.")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Mở Trợ lý AI Tà Xùa Trip" }).getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Mở Trợ lý AI Tà Xùa Trip" }));
  });

  it("shows honest disabled fallback and never calls the assistant endpoint", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      return new Response();
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AssistantLauncher readiness="disabled" />);
    expect(screen.queryByLabelText("Gợi ý từ Trợ lý AI")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mở Trợ lý AI Tà Xùa Trip" }));
    expect(await screen.findByText("Trợ lý chưa sẵn sàng")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tìm chuyến đi" })).toBeTruthy();
    expect(screen.getByLabelText("Câu hỏi cho Trợ lý Tà Xùa Trip").hasAttribute("disabled")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not render on secure My Trip or Admin routes", () => {
    currentPathname = "/booking/TX-123";
    const { rerender } = render(<AssistantLauncher readiness="ready" />);
    expect(screen.queryByRole("button", { name: "Mở Trợ lý AI Tà Xùa Trip" })).toBeNull();
    currentPathname = "/admin/integrations/ai";
    rerender(<AssistantLauncher readiness="ready" />);
    expect(screen.queryByRole("button", { name: "Mở Trợ lý AI Tà Xùa Trip" })).toBeNull();
  });
});
