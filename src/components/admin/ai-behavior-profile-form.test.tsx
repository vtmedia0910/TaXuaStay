// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));

vi.mock("@/features/ai/actions", () => ({ saveAIBehaviorProfileAction: mocks.save }));

import { AIBehaviorProfileForm } from "@/components/admin/ai-behavior-profile-form";

describe("Phase 13E Behavior Studio advisor template", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("fills a DRAFT form for review without saving or activating", () => {
    render(<AIBehaviorProfileForm profiles={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Điền mẫu cố vấn" }));

    expect((screen.getByLabelText("Tên Profile") as HTMLInputElement).value).toBe("Tà Xùa Travel Advisor");
    expect((screen.getByLabelText("Vai trò") as HTMLTextAreaElement).value).toContain("Cố vấn chuyến đi Tà Xùa");
    expect((screen.getByLabelText("Persona") as HTMLTextAreaElement).value).toContain("không thúc ép");
    expect((screen.getByLabelText("Cách trả lời") as HTMLSelectElement).value).toBe("guided");
    expect((screen.getByLabelText("Chỉ dẫn bổ sung") as HTMLTextAreaElement).value).toContain("Chỉ hỏi một câu làm rõ");
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
