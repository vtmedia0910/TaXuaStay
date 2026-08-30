import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290011_v2_cms_media_content_operations.sql"), "utf8");
const correctiveSql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290012_fix_cms_public_view_grants.sql"), "utf8");
const storageHardeningSql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290013_harden_cms_storage_delete.sql"), "utf8");
const lifecycleHardeningSql = readFileSync(resolve(process.cwd(), "supabase/migrations/202608290014_enforce_cms_archive_lifecycle.sql"), "utf8");

describe("V2 Phase 2.6 CMS migration", () => {
  it("creates only the structured CMS and website media domain", () => {
    for (const table of ["cms_pages", "cms_sections", "cms_section_items", "cms_media_assets"]) {
      expect(sql).toMatch(new RegExp(`create table public\\.${table}`, "i"));
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    }
    expect(sql).not.toMatch(/create table public\.(bookings|customers|payments|transport|combos)/i);
    expect(sql).not.toMatch(/raw_html|javascript|page_builder/i);
  });

  it("separates drafts from published snapshots and publishes one page atomically", () => {
    expect(sql).toMatch(/published_title text/i);
    expect(sql).toMatch(/published_is_enabled boolean/i);
    expect(sql).toMatch(/create or replace function public\.publish_cms_page\(target_page_key text\)/i);
    const publish = sql.split("create or replace function public.publish_cms_page")[1].split("create or replace function public.archive_cms_media_asset")[0];
    expect(publish).toContain("published_eyebrow = eyebrow");
    expect(publish).toContain("published_title = i.title");
    expect(publish).toContain("published_title = title");
    expect(publish).toContain("published_by = auth.uid()");
    expect(publish).not.toMatch(/commit|rollback/i);
  });

  it("exposes only allowlisted published columns to anonymous visitors", () => {
    expect(sql).toMatch(/grant select \(id, page_key, published_title,[\s\S]*?\)\s*on table public\.cms_pages to anon/i);
    expect(correctiveSql).toMatch(/grant select \(status\) on table public\.cms_pages to anon/i);
    expect(correctiveSql).toMatch(/grant select \(is_active\) on table public\.cms_media_assets to anon/i);
    expect(sql).toMatch(/create policy "public reads cms published pages"/i);
    expect(sql).toMatch(/with \(security_invoker = true, security_barrier = true\)/i);
    expect(sql).not.toMatch(/grant select on table public\.(cms_pages|cms_sections|cms_section_items|cms_media_assets) to anon/i);
    expect(sql).not.toMatch(/grant (insert|update|delete)[\s\S]*? to anon/i);
    expect(correctiveSql).not.toMatch(/grant (insert|update|delete)[\s\S]*? to anon/i);
    const publicViews = sql.slice(sql.indexOf("create or replace view public.public_cms_pages"), sql.indexOf("create or replace function public.publish_cms_page"));
    expect(publicViews).not.toMatch(/created_by|updated_by|published_by|created_at|updated_at/i);
  });

  it("keeps media sources exclusive and storage writes staff-only", () => {
    expect(sql).toMatch(/cms_media_exactly_one_source/i);
    expect(sql).toMatch(/storage_bucket = 'site-content'/i);
    expect(sql).toMatch(/insert into storage\.buckets/i);
    expect(sql).toMatch(/file_size_limit[\s\S]*10485760/i);
    expect(sql).toMatch(/staff uploads site content objects/i);
    expect(sql).toMatch(/public\.is_staff_or_admin\(\)/i);
    expect(sql).not.toMatch(/service_role/i);
    expect(sql).not.toMatch(/image\/svg\+xml/i);
  });

  it("blocks archival while media is referenced", () => {
    const archive = sql.split("create or replace function public.archive_cms_media_asset")[1];
    expect(archive).toMatch(/published_og_media_id = target_media_id/i);
    expect(archive).toMatch(/published_desktop_media_id = target_media_id/i);
    expect(archive).toMatch(/published_media_id = target_media_id/i);
    expect(archive).toMatch(/raise exception 'CMS media is still referenced'/i);
    expect(storageHardeningSql).toMatch(/staff deletes orphan site content objects/i);
    expect(storageHardeningSql).toMatch(/not exists \([\s\S]*?public\.cms_media_assets/i);
    expect(storageHardeningSql).toMatch(/asset\.storage_path = storage\.objects\.name/i);
    for (const table of ["cms_pages", "cms_sections", "cms_section_items", "cms_media_assets"]) {
      expect(lifecycleHardeningSql).toMatch(new RegExp(`revoke delete on table public\\.${table} from authenticated`, "i"));
    }
  });
});
