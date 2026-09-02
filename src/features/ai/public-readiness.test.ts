import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ getActiveAIRuntime: vi.fn() }));
vi.mock("@/features/ai/runtime/data", () => ({ getActiveAIRuntime: mocks.getActiveAIRuntime }));

import { getPublicAssistantReadiness } from "@/features/ai/public-readiness";

describe("Phase 13C public readiness projection", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["ready", "ready"],
    ["disabled", "disabled"],
    ["unconfigured", "not_configured"],
    ["incomplete", "not_configured"],
    ["unsupported", "not_configured"],
  ] as const)("maps internal %s without exposing runtime details", async (status, expected) => {
    mocks.getActiveAIRuntime.mockResolvedValue({ config: { status, provider: "must-not-leak", model: "must-not-leak" } });
    await expect(getPublicAssistantReadiness()).resolves.toBe(expected);
  });

  it("fails closed to a coarse temporary state", async () => {
    mocks.getActiveAIRuntime.mockRejectedValue(new Error("private diagnostic"));
    await expect(getPublicAssistantReadiness()).resolves.toBe("temporarily_unavailable");
  });
});
