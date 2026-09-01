import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAIProviderConfig } from "@/features/ai/config";
import { createAIProviderAdapter } from "@/features/ai/provider";
import { AssistantError } from "@/features/ai/errors";

describe("Phase 13 provider adapter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fails closed when provider configuration is absent", async () => {
    const adapter = createAIProviderAdapter({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
    expect(adapter).toMatchObject({ configured: false, provider: "unconfigured", model: "unconfigured" });
    await expect(adapter.generate({} as never)).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
  });

  it("reports partial and unsupported configuration without exposing the credential", () => {
    expect(getAIProviderConfig({ NODE_ENV: "test", AI_PROVIDER: "example" } as NodeJS.ProcessEnv)).toMatchObject({ status: "incomplete", credentialConfigured: false });
    const config = getAIProviderConfig({ NODE_ENV: "test", AI_PROVIDER: "example", AI_MODEL: "small", AI_API_KEY: "never-render-this-key" } as NodeJS.ProcessEnv);
    expect(config).toMatchObject({ status: "unsupported", provider: "example", model: "small", credentialConfigured: true });
    expect(JSON.stringify(config)).not.toContain("never-render-this-key");
  });

  it("uses the public error taxonomy", () => {
    const error = new AssistantError("AI_TOOL_ERROR", 503);
    expect(error.message).toBe("Mình chưa xác nhận được thông tin này từ hệ thống lúc này.");
  });
});
