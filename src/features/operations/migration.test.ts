import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202609010030_v2_trip_operations_hardening.sql"), "utf8").toLowerCase();
const resolverFix = readFileSync(resolve(process.cwd(), "supabase/migrations/202609010031_fix_phase11_operational_resolvers.sql"), "utf8").toLowerCase();
const triggerFix = readFileSync(resolve(process.cwd(), "supabase/migrations/202609010032_fix_phase11_booking_touch_trigger.sql"), "utf8").toLowerCase();
const publicProjection = sql.split("create or replace function public.get_public_booking_status")[1].split("alter table public.booking_change_requests enable row level security")[0];

describe("V2 Phase 11 operational hardening migration", () => {
  it("adds controlled changes and append-only confirmation history with strict RLS", () => {
    for (const table of ["booking_change_requests", "booking_confirmation_events"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("operational history is append-only");
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete).*public\.(booking_change_requests|booking_confirmation_events).*anon/);
  });

  it("requires role, stale-state, transaction-bound application and immutable old item history", () => {
    expect(sql).toContain("applying a booking change requires admin");
    expect(sql).toContain("booking changed; reload before continuing");
    expect(sql).toContain("operational_status='replaced'");
    expect(sql).toContain("replacement_for_booking_item_id");
    expect(sql).toContain("only an approved change can be applied");
    expect(sql).toContain("quote_superseded");
  });

  it("keeps Package authority, active-item aggregation, missing price null, and manual Motorbike isolation", () => {
    expect(sql).toContain("and operational_status = 'active'");
    expect(sql).toContain("counts_toward_booking_total");
    expect(sql).toContain("'included_in_package'");
    expect(sql).toContain("'taxua_biker_manual_reference'");
    expect(sql).not.toMatch(/coalesce\([^)]*(sell_price|booking_total|net_cost)[^)]*,\s*0\)/);
    expect(sql).not.toMatch(/https?:\/\/[^'\s]*taxuabiker|dblink|postgres_fdw/);
  });

  it("keeps the public projection token-gated, active-only, and free of operational/private fields", () => {
    expect(publicProjection).toContain("public_access_token_hash=target_token_hash");
    expect(publicProjection).toContain("item.operational_status='active'");
    expect(publicProjection).not.toMatch(/customer_name|customer_phone|supplier_snapshot|booking_change_requests|booking_confirmation_events|net_cost|margin|contribution/);
  });

  it("does not add payment, privileged credentials, AI workflow, or new verticals", () => {
    expect(sql).not.toMatch(/create table public\.(payments|payment_transactions|refunds|settlements|bus_|transfer_|addons)/);
    expect(sql).not.toMatch(/service_role|sb_secret|supabase_secret/);
  });

  it("keeps applied 030 immutable and corrects only lint-discovered resolvers and trigger branching additively", () => {
    expect(resolverFix).toContain("migration 030 is remotely applied");
    expect(resolverFix).toContain("alter function public.phase11_validate_change_payload(text,jsonb) stable");
    expect(resolverFix).toContain("select source_offering.* into offering_row");
    expect(resolverFix).toContain("package.lifecycle_status='published'");
    expect(resolverFix).not.toContain("package.publication_status");
    expect(triggerFix).toContain("migrations 030–031 are remotely");
    expect(triggerFix).toContain("if tg_table_name = 'booking_item_confirmations' then");
    expect(triggerFix).not.toContain("target_booking_id := case tg_table_name");
  });
});
