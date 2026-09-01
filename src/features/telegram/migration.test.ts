import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609010033_v2_supplier_telegram_integration.sql"), "utf8").toLowerCase();

describe("V2 Phase 12 Telegram migration", () => {
  it("adds private mapping, assignments, outbox, receipts, actions and delivery logs with strict RLS", () => {
    for (const table of ["supplier_communication_channels", "supplier_operations_assignments", "telegram_connection_codes", "communication_outbox", "telegram_update_receipts", "telegram_actions", "communication_delivery_logs"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table} from public, anon, authenticated`);
    }
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete).*public\.(supplier_communication_channels|communication_outbox|telegram_actions).*anon/);
  });

  it("uses capability-scoped onboarding and callbacks with ownership, expiry, update dedupe and stale guards", () => {
    expect(sql).toContain("function public.connect_supplier_telegram_group");
    expect(sql).toContain("function public.process_telegram_supplier_callback");
    expect(sql).toContain("telegram_update_receipts where update_id = target_update_id");
    expect(sql).toContain("telegram_chat_id <> target_chat_id");
    expect(sql).toContain("expected_booking_revision");
    expect(sql).toContain("expected_confirmation_updated_at");
    expect(sql).toContain("operational_status <> 'active'");
    expect(sql).toContain("action_row.expires_at <= now()");
    expect(sql).toContain("phase12_apply_confirmation_transition");
  });

  it("implements a bounded SKIP LOCKED outbox worker with dedupe and sanitized delivery logs", () => {
    expect(sql).toContain("for update of outbox skip locked");
    expect(sql).toContain("attempt_count < outbox.max_attempts");
    expect(sql).toContain("dedupe_key text not null unique");
    expect(sql).toContain("delivery_logs_attempt_unique");
    expect(sql).toContain("payload - 'callback_tokens'");
    expect(sql).not.toContain("raw_telegram_update");
  });

  it("keeps Telegram communication-only and excludes privileged credentials, Payment and new verticals", () => {
    expect(sql).not.toMatch(/create table public\.(payments|payment_transactions|refunds|settlements|bus_|transfer_|addons)/);
    expect(sql).not.toMatch(/service_role|sb_secret|supabase_secret|telegram_bot_token|telegram_webhook_secret/);
    expect(sql).not.toMatch(/https?:\/\/[^'\s]*taxuabiker|dblink|postgres_fdw/);
  });
});
