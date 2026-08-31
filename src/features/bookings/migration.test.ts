import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290024_v2_unified_booking_supplier_confirmation.sql"), "utf8").toLowerCase();
const correctiveSql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290025_fix_phase8_booking_code_generation.sql"), "utf8").toLowerCase();
const aggregationSql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290026_fix_phase8_selected_component_aggregation.sql"), "utf8").toLowerCase();
const publicStatus = sql.split("create or replace function public.get_public_booking_status")[1].split("create or replace function public.update_booking_lifecycle")[0];

describe("V2 Phase 8 unified booking migration", () => {
  it("creates one private Booking with many immutable items, separate confirmations, and append-only events", () => {
    for (const table of ["bookings", "booking_items", "booking_item_confirmations", "booking_events"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain("booking submission snapshot is immutable");
    expect(sql).toContain("booking item snapshot is immutable");
    expect(sql).toContain("booking events are append-only");
    expect(sql).toContain("quoted_at timestamptz not null default now()");
    expect(sql).toContain("confirmation_mode_snapshot text not null");
  });

  it("exposes only controlled anon RPCs and no direct Booking table access", () => {
    expect(sql).toContain("grant execute on function public.create_public_booking_request(jsonb,text,text) to anon,authenticated");
    expect(sql).toContain("grant execute on function public.get_public_booking_status(text,text) to anon,authenticated");
    expect(sql).not.toMatch(/grant\s+(select|insert|update|delete).*public\.(bookings|booking_items|booking_item_confirmations|booking_events).*anon/);
    expect(publicStatus).not.toMatch(/customer_name|customer_phone|customer_email|customer_zalo|customer_note|supplier_snapshot|external_reference|internal_note/);
  });

  it("re-resolves sources and ignores browser price, availability, verification, and supplier facts", () => {
    const createRpc = sql.split("create or replace function public.create_public_booking_request")[1].split("create or replace function public.get_public_booking_status")[0];
    expect(createRpc).toContain("public.phase8_room_snapshot");
    expect(createRpc).toContain("public.phase8_package_price_snapshot");
    expect(createRpc).toContain("public.is_current_motorbike_source");
    expect(createRpc).toContain("idempotency key was already used for a different request");
    expect(createRpc).not.toMatch(/target_request[^\n]*?(price|availability|verification|supplier)/);
  });

  it("keeps Package total authoritative and prevents component double-counting", () => {
    expect(sql).toContain("'package_price_authority','explicit_total'");
    expect(sql).toContain("'component_double_counting',false");
    expect(sql).toContain("counts_toward_booking_total");
    expect(sql).toContain("'included_in_package'");
    expect(sql).toContain("component_cost_snapshot");
  });

  it("keeps missing monetary data null and excludes later commerce/security regressions", () => {
    expect(sql).toContain("sell_price_vnd bigint");
    expect(sql).toContain("quoted_sell_total_vnd bigint");
    expect(sql).not.toMatch(/coalesce\([^)]*(sell_price|quoted_sell|net_cost)[^)]*,\s*0\)/);
    expect(sql).not.toMatch(/create table public\.(payments|deposits|refunds|settlements|checkouts|booking_holds|my_trips)/);
    expect(sql).not.toMatch(/service_role|sb_secret|supabase_secret/);
  });

  it("resolves pgcrypto from the managed extension schema without opening schema creation", () => {
    expect(correctiveSql).toContain("migration 024 is already remote-applied and remains immutable");
    expect(correctiveSql).toContain("has_schema_privilege('anon', 'extensions', 'create')");
    expect(correctiveSql).toContain("has_schema_privilege('authenticated', 'extensions', 'create')");
    expect(correctiveSql).toContain("set search_path = pg_catalog, extensions");
  });

  it("requires every selected Package component to resolve even if it was optional in the catalog", () => {
    expect(aggregationSql).toContain("catalog-optional package components count after traveler selection");
    expect(aggregationSql).toContain("item.confirmation_status <> 'not_required'");
    expect(aggregationSql).toContain("item.confirmation_status not in ('confirmed', 'not_required')");
    expect(aggregationSql).not.toMatch(/item\.is_required/);
  });
});
