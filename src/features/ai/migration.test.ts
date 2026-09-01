import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609020034_v2_ai_runtime_and_behavior_studio.sql"), "utf8");

describe("Phase 13B migration 034 security contract", () => {
  it("creates versioned runtime/profile/health/audit metadata and no active runtime seed", () => {
    expect(sql).toContain("create table public.ai_assistant_profiles");
    expect(sql).toContain("create table public.ai_runtime_settings");
    expect(sql).toContain("create table public.ai_provider_health_checks");
    expect(sql).toContain("create table public.ai_runtime_audit_events");
    expect(sql).toContain("'Tà Xùa Local Expert'");
    const seedSection = sql.slice(sql.lastIndexOf("insert into public.ai_assistant_profiles"));
    expect(seedSection).not.toMatch(/insert\s+into\s+public\.ai_runtime_settings/i);
  });

  it("keeps tables private and exposes only a fixed active-runtime projection", () => {
    for (const table of ["ai_assistant_profiles", "ai_runtime_settings", "ai_provider_health_checks", "ai_runtime_audit_events"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table} from anon, authenticated`);
    }
    expect(sql).not.toMatch(/grant\s+select\s+on\s+table\s+public\.ai_\w+\s+to\s+anon/i);
    expect(sql).toContain("grant execute on function public.get_active_ai_runtime() to anon, authenticated");
  });

  it("contains no credential value storage, service role, secret key or automatic paid inference", () => {
    expect(sql).not.toMatch(/service_role|SUPABASE_SECRET|GEMINI_API_KEY|OPENAI_API_KEY|DEEPSEEK_API_KEY|UPSTASH_REDIS_REST_TOKEN/i);
    expect(sql).toContain("Migration 034 creates no ACTIVE row");
  });

  it("enforces Admin-only mutation functions and immutable rollback revisions", () => {
    expect(sql).toMatch(/create or replace function public\.activate_ai_runtime[\s\S]*AI runtime activation requires admin/i);
    expect(sql).toMatch(/create or replace function public\.rollback_ai_runtime[\s\S]*insert into public\.ai_runtime_settings/i);
    expect(sql).toContain("A current connected provider health check is required");
    expect(sql).toContain("AI runtime must pass Prompt Lab before activation");
  });
});
