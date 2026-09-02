import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Phase 13D security boundaries", () => {
  it("keeps conversation Admin reads and every mutation admin-only", () => {
    expect(read("src/features/ai-conversations/admin-service.ts")).toContain('requireAdminUser(["admin"])');
    expect(read("src/features/ai-conversations/actions.ts")).toContain('requireAdminUser(["admin"]');
  });

  it("uses server-only dedicated Redis names without a public secret path", () => {
    const sources = [
      "src/features/ai-conversations/config.ts", "src/features/ai-conversations/repository.ts",
      "src/features/ai-conversations/service.ts", "src/app/api/assistant/route.ts",
      "src/components/trip/assistant-conversation.tsx",
    ].map(read).join("\n");
    expect(sources).not.toContain("NEXT_PUBLIC_AI_CONVERSATION");
    expect(sources).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(sources).not.toContain("SUPABASE_SECRET");
    expect(read("src/features/ai-conversations/config.ts")).toContain('import "server-only"');
    expect(read("src/features/ai-conversations/repository.ts")).toContain('import "server-only"');
  });

  it("persists names only, never tool payloads, prompts, cookies or raw provider data", () => {
    const store = read("src/features/ai-conversations/upstash-store.ts");
    const service = read("src/features/ai-conversations/service.ts");
    expect(store).toContain("toolNames");
    for (const prohibited of ["toolResults", "systemPrompt", "chainOfThought", "rawProviderResponse", "cookie", "bookingAccessToken"]) {
      expect(`${store}\n${service}`).not.toContain(prohibited);
    }
  });

  it("adds no Supabase migration 035 and leaves customer transparency visible", () => {
    expect(existsSync(join(root, "supabase/migrations/202609020035_ai_conversations.sql"))).toBe(false);
    expect(read("src/components/trip/assistant-conversation.tsx")).toContain("Không gửi mật khẩu hoặc thông tin thanh toán");
  });
});
