import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290027_v2_booking_operations_checkout_readiness.sql"), "utf8").toLowerCase();
const correctiveSql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290028_fix_phase9_deposit_function_volatility.sql"), "utf8").toLowerCase();
const publicResolver = sql.split("create or replace function public.get_public_booking_status")[1];

describe("V2 Phase 9 checkout-readiness migration", () => {
  it("creates private, RLS-protected versioned quote, policy, and checkout tables", () => {
    for (const table of ["booking_quotes", "booking_quote_items", "booking_deposit_policies", "checkout_sessions"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("quote_version integer not null");
    expect(sql).toContain("policy_version integer not null");
    expect(sql).toContain("quote_id uuid not null");
    expect(sql).toContain("quote financial snapshot is immutable");
    expect(sql).toContain("booking_quote_items_append_only");
    expect(sql).toContain("phase 9 history is append-only");
  });

  it("keeps Checkout Readiness, Booking, and Supplier Confirmation separate", () => {
    expect(sql).toContain("phase9-checkout-readiness-v1");
    expect(sql).toContain("confirmation_incomplete");
    expect(sql).toContain("confirmation_failed");
    expect(sql).toContain("booking_not_active");
    expect(sql).toContain("booking_terminal");
    expect(sql).toContain("quote_expired");
    expect(sql).toContain("price_conflict");
  });

  it("re-resolves authoritative facts on the server and preserves package price authority", () => {
    expect(sql).toContain("public.phase8_room_snapshot");
    expect(sql).toContain("public.phase8_package_price_snapshot");
    expect(sql).toContain("public.is_current_motorbike_source");
    expect(sql).toContain("item.counts_toward_booking_total");
    expect(sql).toContain("if not item.counts_toward_booking_total");
    expect(sql).not.toMatch(/coalesce\([^)]*(booking_total|sell_price|amount_due)[^)]*,\s*0\)/);
  });

  it("invalidates active checkout sessions when quote, policy, Booking, or confirmation facts change", () => {
    expect(sql).toContain("quote_superseded");
    expect(sql).toContain("deposit_policy_changed");
    expect(sql).toContain("readiness_regressed");
    expect(sql).toContain("booking_terminal");
    expect(sql).toMatch(/where(?:\s+booking_id[^\n]+and\s+)?status in \('draft',\s*'ready'\)/);
    expect(sql).toContain("one_active_per_booking");
  });

  it("exposes only safe public status data and no anonymous direct table access", () => {
    expect(publicResolver).toContain("'checkout'");
    expect(sql).toContain("'provider_state', 'unconfigured'");
    expect(publicResolver).not.toMatch(/customer_name|customer_phone|customer_email|supplier_snapshot|net_cost|provider_reference/);
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete).*public\.(booking_quotes|booking_quote_items|booking_deposit_policies|checkout_sessions).*anon/);
  });

  it("does not introduce a payment implementation, paid state, credentials, or privileged runtime", () => {
    expect(sql).not.toMatch(/create table public\.(payments|payment_transactions|refunds|payouts|settlements)/);
    expect(sql).not.toMatch(/service_role|sb_secret|supabase_secret|api_key|webhook_secret/);
    expect(sql).not.toMatch(/mark_paid|['\"]paid['\"]|qr_code|payment_link/);
    expect(sql).toContain("provider_state text not null default 'unconfigured'");
  });

  it("preserves immutable migration 027 and corrects only calculator volatility additively", () => {
    expect(correctiveSql).toContain("migration 027 is remote-applied and immutable");
    expect(correctiveSql).toContain("alter function public.phase9_calculate_deposit(text, bigint, bigint, integer) stable");
    expect(correctiveSql).not.toMatch(/create table|drop table|service_role|sb_secret/);
  });
});
