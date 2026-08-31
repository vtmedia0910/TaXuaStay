import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290023_v2_package_commerce.sql"), "utf8").toLowerCase();
const publicView = sql.split("create or replace view public.public_packages")[1].split("create or replace function public.get_public_package_components")[0];
const componentProjection = sql.split("create or replace function public.get_public_package_components")[1].split("create or replace function public.get_public_package_price_rules")[0];
const priceProjection = sql.split("create or replace function public.get_public_package_price_rules")[1].split("create or replace function public.save_package_commerce")[0];
const beforeSaveFunction = sql.split("create or replace function public.save_package_commerce")[0];

describe("V2 Phase 6 Package Commerce migration", () => {
  it("creates package identity, generic components, and explicit package price rules with RLS", () => {
    for (const table of ["packages", "package_components", "package_price_rules"]) {
      expect(sql).toContain(`create table public.${table}`);
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    for (const type of ["room", "motorbike", "bus", "transfer", "activity", "meal", "guide", "service", "custom"]) {
      expect(sql).toContain(`'${type}'`);
    }
  });

  it("does not create later commerce, customer, payment, or transport inventory domains", () => {
    expect(sql).not.toMatch(/create table public\.(bookings|booking_items|customers|payments|deposits|refunds|settlements|bus_inventory|trip_components|my_trips)/);
    expect(beforeSaveFunction).not.toMatch(/insert into public\.(packages|package_components|package_price_rules)/);
    expect(sql).not.toContain("service_role");
  });

  it("validates real source ownership and refuses unsupported active component adapters", () => {
    expect(sql).toContain("room_type_id uuid references public.room_types");
    expect(sql).toContain("motorbike_offering_id uuid references public.motorbike_offerings");
    expect(sql).toContain("this component type has no truthful phase 6 source adapter");
    expect(sql).toContain("public.is_room_public(component.room_type_id)");
    expect(sql).toContain("public.is_current_motorbike_source");
    expect(sql).toContain("motorbike components require manual confirmation");
  });

  it("keeps public projections free of costs, private notes, supplier mappings, and rule identities", () => {
    const componentReturnShape = componentProjection.split("language sql")[0];
    const priceReturnShape = priceProjection.split("language sql")[0];
    for (const section of [publicView, componentReturnShape, priceReturnShape]) {
      expect(section).not.toMatch(/internal_notes|created_by|updated_by|supplier_id|source_external_ref_id|external_reference|gross_margin|gross_contribution/);
    }
    expect(componentReturnShape).not.toMatch(/unit_cost_vnd|cost_source|cost_verified_at|cost_valid_until/);
    expect(priceReturnShape).not.toMatch(/rule_id|rule_key/);
    expect(sql).not.toMatch(/grant select on table public\.(package_components|package_price_rules) to anon/);
  });

  it("uses an admin-only atomic save and never promises instant confirmation", () => {
    const save = sql.split("create or replace function public.save_package_commerce")[1];
    expect(save).toContain("if not (select public.is_admin())");
    expect(save).toContain("delete from public.package_price_rules");
    expect(save).toContain("perform public.assert_package_publishable(saved_id)");
    expect(sql).toContain("phase 6 packages cannot promise instant confirmation");
    expect(sql).not.toMatch(/grant\s+(insert|update|delete).*package/);
  });

  it("does not duplicate ROOM pricing, availability, or commercial cost", () => {
    expect(sql).toContain("room cost must come from commercial economics");
    expect(sql).not.toMatch(/create table public\.package_(room_prices|room_inventory|room_commercial_rules)/);
    expect(sql).toContain("explicit deterministic total package sell-price rules");
  });
});
