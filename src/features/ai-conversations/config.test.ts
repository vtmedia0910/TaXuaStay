import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getAIConversationStoreConfiguration } from "@/features/ai-conversations/config";

describe("AI conversation store configuration", () => {
  it("fails closed when missing and refuses reuse of quota Redis", () => {
    expect(getAIConversationStoreConfiguration({} as NodeJS.ProcessEnv).status).toBe("missing");
    expect(getAIConversationStoreConfiguration({
      AI_CONVERSATION_REDIS_REST_URL: "https://same.example",
      AI_CONVERSATION_REDIS_REST_TOKEN: "same-token",
      UPSTASH_REDIS_REST_URL: "https://same.example",
      UPSTASH_REDIS_REST_TOKEN: "same-token",
    } as unknown as NodeJS.ProcessEnv).status).toBe("not_separate");
  });

  it("returns only server-side configuration and accepts a dedicated store", () => {
    const result = getAIConversationStoreConfiguration({
      AI_CONVERSATION_REDIS_REST_URL: "https://conversation.example",
      AI_CONVERSATION_REDIS_REST_TOKEN: "conversation-token",
      UPSTASH_REDIS_REST_URL: "https://quota.example",
      UPSTASH_REDIS_REST_TOKEN: "quota-token",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.status).toBe("configured");
    expect(result.configured).toBe(true);
  });
});
