-- V2 Phase 2.6 Storage hardening: an authenticated operator may delete only an
-- orphan object that has no CMS metadata row. Referenced metadata is already
-- protected by foreign keys and archive_cms_media_asset.

drop policy if exists "staff deletes site content objects" on storage.objects;
create policy "staff deletes orphan site content objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'site-content'
  and (select public.is_staff_or_admin())
  and not exists (
    select 1
    from public.cms_media_assets asset
    where asset.storage_bucket = storage.objects.bucket_id
      and asset.storage_path = storage.objects.name
  )
);
