-- V2 Phase 2.6 corrective grant: security_invoker views must be able to read
-- the lifecycle columns used by their own WHERE clauses. RLS still limits anon
-- rows to published pages and referenced active media.

grant select (status) on table public.cms_pages to anon;
grant select (is_active) on table public.cms_media_assets to anon;
