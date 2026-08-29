import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/202608290005_harden_phase4_verification.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("Phase 4 verification hardening migration", () => {
  it("keeps a future verification private at the database resolver", () => {
    expect(migration).toContain("record.verified_at <= now()");
    expect(migration).toContain("record.expires_at > now()");
  });

  it("rejects future starts and expired verified cycles", () => {
    expect(migration).toContain("new.verified_at > lifecycle_now");
    expect(migration).toContain("new.expires_at <= lifecycle_now");
    expect(migration).toContain("verified timestamp cannot be in the future");
    expect(migration).toContain("verified records require a future expiry");
  });

  it("refreshes stale re-verification dates while preserving explicit changed dates", () => {
    expect(migration).toContain("old_was_current");
    expect(migration).toContain("stale_cycle_resubmitted");
    expect(migration).toContain("new.verified_at := lifecycle_now");
    expect(migration).toContain("public.verification_freshness_interval(new.verification_type)");
  });

  it("replaces anonymous table-wide detail reads with current-view column allowlists", () => {
    for (const table of ["cloud_view_verifications", "road_verifications"]) {
      expect(migration).toContain(`revoke select on table public.${table} from anon`);
      expect(migration).not.toContain(`grant select on table public.${table} to anon`);
    }
    expect(migration).toContain("verification_id, total_points, score_10, view_from_bed");
    expect(migration).toContain("verification_id, grade, car_access, motorbike_access, sedan_access");
    expect(migration).not.toContain("created_at, updated_at\n) on table public.cloud_view_verifications to anon");
  });

  it("does not weaken RLS or modify the applied Phase 4 migration", () => {
    expect(migration).not.toContain("disable row level security");
    expect(migration).not.toContain("drop policy");
    expect(migration).not.toContain("create table");
  });
});
