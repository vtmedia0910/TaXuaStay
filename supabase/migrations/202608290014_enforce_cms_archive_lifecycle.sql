-- V2 Phase 2.6 lifecycle hardening: CMS content/media uses archive or disable
-- workflows. Direct table DELETE would bypass those safety checks.

revoke delete on table public.cms_pages from authenticated;
revoke delete on table public.cms_sections from authenticated;
revoke delete on table public.cms_section_items from authenticated;
revoke delete on table public.cms_media_assets from authenticated;
