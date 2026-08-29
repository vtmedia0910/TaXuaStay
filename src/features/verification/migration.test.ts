import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_CLOUD_VIEW_QUERY,
  PUBLIC_ROAD_VERIFICATION_QUERY,
  PUBLIC_VERIFICATION_BADGE_QUERY,
  PUBLIC_VERIFICATION_EVIDENCE_QUERY,
} from "@/features/verification/columns";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608290004_verified_standard.sql", import.meta.url),
  "utf8",
).toLowerCase();
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const declarativeSchema = migration.split("create or replace function", 1)[0];

describe("Phase 4 verification migration", () => {
  it("is additive, normalized, and does not fabricate verification data", () => {
    for (const table of [
      "verification_records",
      "cloud_view_verifications",
      "road_verifications",
      "verification_evidence",
    ]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(declarativeSchema).not.toContain(`insert into public.${table}`);
    }
    expect(migration).toContain("generated always as");
    expect(migration).toContain("score_10 numeric(3,1)");
  });

  it("constrains every Cloud View component and derives a 100-point score", () => {
    for (const constraint of [
      "direct_valley_points between 0 and 30",
      "view_width_points between 0 and 20",
      "obstruction_points between 0 and 15",
      "view_from_bed_points between 0 and 15",
      "private_position_points between 0 and 10",
      "orientation_points between 0 and 5",
      "evidence_points between 0 and 5",
    ]) {
      expect(migration).toContain(constraint);
    }
    expect(migration).toContain("::numeric / 10.0");
  });

  it("enforces exact-target, approved, type-compatible evidence", () => {
    expect(migration).toContain("asset_room_type_id is distinct from record_room_type_id");
    expect(migration).toContain("asset_property_id is distinct from record_property_id");
    expect(migration).toContain("room verification evidence must belong to the exact room type");
    expect(migration).toContain("property verification evidence must belong to the exact property");
    expect(migration).toContain("public verification evidence must be approved media");
    expect(migration).toContain("road verification evidence must show road or parking access");
    expect(migration).toContain("verification detail does not match its lifecycle record type");
  });

  it("requires a current verified lifecycle record and approved public evidence before a badge exists", () => {
    expect(migration).toContain("record.status = 'verified'");
    expect(migration).toContain("record.expires_at > now()");
    expect(migration).toContain("evidence.public_visible");
    expect(migration).toContain("media.is_verified");
    expect(migration).toContain("where public.is_verification_public(id)");
  });

  it("constrains Road grades, tri-state facts, walking distance, and grade D", () => {
    expect(migration).toContain("grade in ('a', 'b', 'c', 'd')");
    for (const field of ["car_access", "motorbike_access", "sedan_access", "parking"]) {
      expect(migration).toContain(`${field} in ('unknown', 'yes', 'no')`);
    }
    expect(migration).toContain("walk_from_parking_m is null or walk_from_parking_m >= 0");
    expect(migration).toContain("grade <> 'd' or (car_access = 'no' and sedan_access = 'no')");
    expect(migration).not.toContain("update public.properties\n    set\n      road_access_grade");
  });

  it("uses RLS, safe public views, and least-privilege function grants", () => {
    for (const table of [
      "verification_records",
      "cloud_view_verifications",
      "road_verifications",
      "verification_evidence",
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`revoke all on table public.${table} from anon, authenticated`);
    }
    expect(migration).toContain("with (security_invoker = true, security_barrier = true)");
    expect(migration).toContain("revoke all on function public.is_verification_public(uuid) from public");
    expect(migration).toContain("grant execute on function public.is_verification_public(uuid) to anon, authenticated");
    expect(migration).not.toContain("grant insert on table public.verification_records to anon");
    expect(migration).not.toContain("grant update on table public.verification_records to anon");
    expect(migration).not.toContain("grant delete on table public.verification_records to anon");
  });

  it("keeps public DTO allowlists free of lifecycle audit fields", () => {
    const publicQueries = [
      PUBLIC_VERIFICATION_BADGE_QUERY,
      PUBLIC_CLOUD_VIEW_QUERY,
      PUBLIC_ROAD_VERIFICATION_QUERY,
      PUBLIC_VERIFICATION_EVIDENCE_QUERY,
    ].join(",");
    expect(publicQueries).not.toContain("verified_by_user_id");
    expect(publicQueries).not.toContain("created_by_user_id");
    expect(publicQueries).not.toContain("updated_by_user_id");
    expect(publicQueries).not.toContain("method");
    expect(actions).not.toContain('select("*")');
  });

  it("saves lifecycle, details, and evidence through atomic security-invoker RPCs", () => {
    for (const rpc of [
      "save_basic_verification",
      "save_cloud_view_verification",
      "save_road_verification",
    ]) {
      expect(migration).toContain(`function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
      expect(actions).toContain(`rpc("${rpc}"`);
    }
    expect(migration).toContain("security invoker\nset search_path = ''");
    expect(migration).toContain("deferrable initially deferred");
  });
});
