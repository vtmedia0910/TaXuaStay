import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getAIConversationMetricsSnapshot, resetAIConversationMetricsForTests } from "@/features/ai-conversations/metrics";
import { captureAIConversationTurn } from "@/features/ai-conversations/service";
import type { AIConversationStore } from "@/features/ai-conversations/types";

const input = {
  sessionHash: "a".repeat(64), entryPoint: "assistant_page" as const, customerMessage: "Gọi tôi 0912345678",
  assistantAnswer: "Đã nhận email a@example.com", provider: "gemini", model: "gemini-2.5-flash",
  runtimeRevision: 2, profileRevision: 3, toolNames: ["get_price"], inputTokens: 12, outputTokens: 7,
  estimatedCostUsd: 0.00002, latencyMs: 450, result: "success" as const, errorCode: null,
};

function store(overrides: Partial<AIConversationStore> = {}): AIConversationStore {
  return {
    appendTurn: vi.fn(async () => "7fbdf9fe-5d8d-465b-b083-31304025ef87"), getConversation: vi.fn(), listConversations: vi.fn(), getSummary: vi.fn(),
    deleteConversation: vi.fn(), deleteConversations: vi.fn(), deleteBefore: vi.fn(), deleteAll: vi.fn(), applyRetentionToExisting: vi.fn(),
    getRetentionConfig: vi.fn(async () => ({ loggingEnabled: true, retentionDays: 30, updatedAt: null, updatedBy: "default" })), updateRetentionConfig: vi.fn(),
    ...overrides,
  } as AIConversationStore;
}

describe("best-effort AI conversation capture", () => {
  beforeEach(() => resetAIConversationMetricsForTests());

  it("redacts both customer and assistant-visible messages before persistence", async () => {
    const target = store();
    await expect(captureAIConversationTurn(input, { store: target })).resolves.toMatchObject({ stored: true });
    expect(target.appendTurn).toHaveBeenCalledWith(expect.objectContaining({
      customerMessage: "Gọi tôi [PHONE_REDACTED]", assistantAnswer: "Đã nhận email [EMAIL_REDACTED]",
      toolNames: ["get_price"],
    }), 30);
  });

  it("does nothing while logging is disabled", async () => {
    const target = store({ getRetentionConfig: vi.fn(async () => ({ loggingEnabled: false, retentionDays: 30 as const, updatedAt: null, updatedBy: "default" as const })) });
    await expect(captureAIConversationTurn(input, { store: target })).resolves.toEqual({ stored: false, reason: "disabled" });
    expect(target.appendTurn).not.toHaveBeenCalled();
  });

  it("does not reject the assistant path when Redis or redaction fails", async () => {
    const target = store({ appendTurn: vi.fn(async () => { throw new Error("redis down with raw payload"); }) });
    await expect(captureAIConversationTurn(input, { store: target })).resolves.toEqual({ stored: false, reason: "write_failed" });
    await expect(captureAIConversationTurn(input, { store: store(), redact: () => { throw new Error("redactor down"); } })).resolves.toEqual({ stored: false, reason: "write_failed" });
    expect(getAIConversationMetricsSnapshot().conversationLogWriteErrors).toBe(2);
  });

  it("persists only the normalized provider error code and customer-visible fallback", async () => {
    const target = store();
    await captureAIConversationTurn({ ...input, assistantAnswer: "Kết nối tạm gián đoạn.", result: "error", errorCode: "AI_PROVIDER_UNAVAILABLE", toolNames: [] }, { store: target });
    expect(target.appendTurn).toHaveBeenCalledWith(expect.objectContaining({
      assistantAnswer: "Kết nối tạm gián đoạn.", result: "error", errorCode: "AI_PROVIDER_UNAVAILABLE", toolNames: [],
    }), 30);
  });
});
