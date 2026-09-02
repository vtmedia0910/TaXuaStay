import { describe, expect, it } from "vitest";
import { redactAIConversationText } from "@/features/ai-conversations/redaction";
import { retentionExpiry, retentionTtlSeconds, truncateConversationContent } from "@/features/ai-conversations/retention";

describe("AI conversation redaction and retention", () => {
  it("redacts deterministic PII, booking tokens, provider keys and payment-like numbers", () => {
    const input = "Email an@example.com, SĐT 0912 345 678, booking token: abcdefghijklmnopqrst, token AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde, mã TX-20260902-ABC123, password=hello, sk-abcdefghijklmnopqrstuv, thẻ 4111 1111 1111 1111";
    const output = redactAIConversationText(input);
    expect(output).not.toContain("an@example.com");
    expect(output).not.toContain("0912 345 678");
    expect(output).not.toContain("abcdefghijklmnopqrst");
    expect(output).not.toContain("hello");
    expect(output).not.toContain("4111 1111 1111 1111");
    expect(output).not.toContain("TX-20260902-ABC123");
    expect(output).not.toContain("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde");
    expect(output).toContain("[EMAIL_REDACTED]");
    expect(output).toContain("[PHONE_REDACTED]");
    expect(output).toContain("[TOKEN_REDACTED]");
    expect(output).toContain("[SECRET_REDACTED]");
    expect(output).toContain("[PAYMENT_REDACTED]");
  });

  it("uses bounded TTL presets and marks durable truncation", () => {
    expect(retentionTtlSeconds(30)).toBe(2_592_000);
    expect(retentionExpiry(new Date("2026-09-02T00:00:00.000Z"), 30).toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(truncateConversationContent("abcd", 3)).toEqual({ content: "abc", truncated: true });
  });
});
