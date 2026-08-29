import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608290010_v2_verified_room_profile.sql",
  "utf8",
);

describe("V2 Phase 2 migration", () => {
  it("creates normalized quality and factual notes without production seed data", () => {
    expect(migration).toContain("create table public.room_quality_assessments");
    expect(migration).toContain("create table public.room_profile_notes");
    expect(migration).toContain("num_nonnulls(room_type_id, physical_room_id) = 1");
    expect(migration).not.toContain("insert into public.room_profile_notes");
    expect(migration).not.toMatch(/target_cleanliness_score\s*:=\s*\d/);
    expect(migration).not.toContain("overall_score");
  });

  it("uses bounded integer dimensions and separates Cloud View", () => {
    for (const dimension of ["cleanliness", "soundproof", "heating", "hot_water", "wifi", "bathroom", "room_accuracy", "comfort"]) {
      expect(migration).toContain(`${dimension}_score smallint`);
    }
    expect(migration).toContain("between 0 and 100");
    expect(migration).not.toContain("update public.cloud_view_verifications");
  });

  it("centralizes freshness and public-current resolution", () => {
    expect(migration).toContain("room_quality_freshness_interval");
    expect(migration).toContain("when 'cleanliness' then interval '90 days'");
    expect(migration).toContain("resolve_room_quality_dimension_state");
    expect(migration).toContain("public.is_verification_public(record.id)");
  });

  it("keeps internal notes and staff IDs out of public views", () => {
    const publicQualityView = migration.split("create or replace view public.public_room_quality_assessments")[1].split("create or replace view public.public_room_profile_notes")[0];
    expect(publicQualityView).toContain("quality.notes_public");
    expect(publicQualityView).not.toContain("notes_internal");
    expect(publicQualityView).not.toContain("created_by");
    expect(publicQualityView).not.toContain("updated_by");
  });

  it("enforces exact-target evidence and exact-room state independently of bookability", () => {
    expect(migration).toContain("Physical-room verification evidence must belong to the exact physical room");
    expect(migration).toContain("resolve_exact_room_verification");
    const resolver = migration.split("create or replace function public.resolve_exact_room_verification")[1].split("create or replace function public.is_exact_room_verified")[0];
    expect(resolver).toContain("public.is_verification_public(record.id)");
    expect(resolver).not.toContain("exact_room_bookable");
  });

  it("enables RLS, explicit public views, and authenticated-only mutation", () => {
    expect(migration).toContain("alter table public.room_quality_assessments enable row level security");
    expect(migration).toContain("alter table public.room_profile_notes enable row level security");
    expect(migration).toContain("with (security_invoker = true, security_barrier = true)");
    expect(migration).toContain("grant execute on function public.save_room_quality_verification");
    expect(migration).toContain(") to authenticated;");
  });
});
