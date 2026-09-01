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
    expect(admin).toContain('requireAdminUser(["admin"])');
    expect(admin).toContain("Không hiển thị API key");
    expect(admin).not.toContain("process.env.AI_API_KEY");
  });
});
