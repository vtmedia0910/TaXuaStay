import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveAIRuntimeRow } from "@/features/ai/runtime/data";

const row = {
  enabled: true,
  provider: "gemini",
  model: "gemini-2.5-flash",
  runtime_revision: 7,
  profile_revision: 3,
  profile_name: "Tà Xùa Local Expert",
  role_description: "Trợ lý du lịch dùng dữ liệu thực tế của Tà Xùa Trip.",
  persona: "Thân thiện, thực tế và không khoa trương với khách.",
  tone: "friendly",
  verbosity: "short",
  answer_style: "direct",
  language_policy: "vietnamese_first",
  sales_policy: "light",
  uncertainty_policy: "explicit",
  custom_instructions: "Nói rõ dữ liệu chưa biết.",
};

const env = {
  AI_ENABLED: "true",
  GEMINI_API_KEY: "test-only",
  AI_IDENTITY_HASH_SALT: "test-salt",
  UPSTASH_REDIS_REST_URL: "https://example.invalid",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
} as unknown as NodeJS.ProcessEnv;

describe("Phase 13B active runtime resolver", () => {
  it("resolves one active revision and compiles its exact profile revision", () => {
    const result = resolveAIRuntimeRow(row, env);
    expect(result.config).toMatchObject({ status: "ready", provider: "gemini", model: "gemini-2.5-flash" });
    expect(result.runtime).toMatchObject({ runtimeRevision: 7, profileRevision: 3 });
    expect(result.compiledPrompt).toContain("Nói rõ dữ liệu chưa biết.");
  });

  it("fails closed for missing runtime, invalid profile or disabled revision", () => {
    expect(resolveAIRuntimeRow(null, env)).toMatchObject({ runtime: null, compiledPrompt: null, config: { status: "disabled" } });
    expect(resolveAIRuntimeRow({ ...row, tone: "aggressive" }, env)).toMatchObject({ runtime: null, compiledPrompt: null });
    expect(resolveAIRuntimeRow({ ...row, enabled: false }, env)).toMatchObject({ config: { status: "disabled", runtimeEnabled: false } });
  });

  it("never falls back to another configured provider", () => {
    const result = resolveAIRuntimeRow(row, { ...env, GEMINI_API_KEY: "", OPENAI_API_KEY: "present" } as NodeJS.ProcessEnv);
    expect(result.config).toMatchObject({ status: "incomplete", provider: "gemini", credentialConfigured: false });
  });
});
