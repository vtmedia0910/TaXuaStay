import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Phase 13 public and Admin UI boundaries", () => {
  it("keeps assistant transcripts noindex and supplies a mobile-first launcher", () => {
    const page = read("src/app/(public)/assistant/page.tsx");
    const launcher = read("src/components/trip/assistant-launcher.tsx");
    expect(page).toContain("index: false");
    expect(page).toContain("noarchive: true");
    expect(launcher).toContain("safe-area-inset-bottom");
    expect(launcher).toContain('pathname.startsWith("/booking")');
  });

  it("uses a server endpoint, bounded text history and no provider SDK in the browser", () => {
    const ui = read("src/components/trip/assistant-experience.tsx");
    expect(ui).toContain('fetch("/api/assistant"');
    expect(ui).toContain("messages.slice(-6)");
    expect(ui).toContain("maxLength={1_200}");
    expect(ui).not.toMatch(/AI_API_KEY|SUPABASE|service.?role/i);
  });

  it("guards Admin diagnostics with admin role and never renders a key value", () => {
    const admin = read("src/app/admin/(protected)/integrations/ai/page.tsx");
    const diagnostics = read("src/features/ai/diagnostics.ts");
    const actions = read("src/features/ai/actions.ts");
    expect(admin).toContain('requireAdminUser(["admin"])');
    expect(admin).toContain("AI Control Center");
    expect(admin).toContain("Credentials & explicit health");
    expect(admin).toContain("AI BEHAVIOR STUDIO");
    expect(admin).toContain("PROMPT LAB");
    expect(admin).toContain("DRAFT → TEST → ACTIVATE");
    expect(actions).toContain('requireAdminUser(["admin"]');
    expect(actions).toContain("checkAIProviderHealth");
    expect(diagnostics).not.toContain("checkAIProviderHealth");
    expect(admin).not.toMatch(/process\.env\.(GEMINI|OPENAI|DEEPSEEK)_API_KEY/);
  });
});
