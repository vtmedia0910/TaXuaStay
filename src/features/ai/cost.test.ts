import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { estimateAIUsageCostMicros, microsToUsd } from "@/features/ai/cost";

describe("Phase 13A provider-aware cost estimation", () => {
  it("uses normalized usage for the single approved model", () => {
    expect(estimateAIUsageCostMicros("openai", "gpt-5-mini-2025-08-07", { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(2_250_000);
    expect(microsToUsd(2_250_000)).toBe(2.25);
  });

  it("returns null rather than inventing cost for unknown or malformed usage", () => {
    expect(estimateAIUsageCostMicros("other", "model", { inputTokens: 1, outputTokens: 1 })).toBeNull();
    expect(estimateAIUsageCostMicros("gemini", "gemini-2.5-flash", { inputTokens: 1, outputTokens: 1 })).toBeNull();
    expect(estimateAIUsageCostMicros("deepseek", "deepseek-v4-flash", { inputTokens: 1, outputTokens: 1 })).toBeNull();
    expect(estimateAIUsageCostMicros("openai", "gpt-5-mini-2025-08-07", { inputTokens: 1 })).toBeNull();
    expect(estimateAIUsageCostMicros("openai", "gpt-5-mini-2025-08-07", { inputTokens: -1, outputTokens: 1 })).toBeNull();
  });
});
