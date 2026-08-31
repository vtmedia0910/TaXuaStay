-- Correct V2 Phase 5 public catalog ordering after migration 021 was applied.
-- The adapter orders by sort_order, so the security-invoker view must expose
-- that intentionally public presentation field. No new data is created.

create or replace view public.public_motorbike_offerings
with (security_invoker = true, security_barrier = true)
as
select
  offering.slug,
  offering.display_name,
  offering.vehicle_category,
  offering.transmission_type,
  offering.engine_class_cc,
  offering.suitable_for,
  offering.helmet_status,
  offering.pickup_summary,
  offering.return_summary,
  offering.public_description,
  offering.public_price_vnd,
  offering.price_source,
  offering.price_checked_at,
  offering.price_valid_until,
  offering.availability_state,
  offering.confirmation_mode,
  offering.public_request_url,
  offering.source_checked_at,
  offering.updated_at,
  'taxua_biker'::text as source_system_key,
  'Tà Xùa Biker'::text as source_provider,
  media.id as image_media_id,
  media.title as image_title,
  media.alt_text as image_alt_text,
  media.caption as image_caption,
  media.media_type as image_media_type,
  media.role as image_role,
  media.storage_bucket as image_storage_bucket,
  media.storage_path as image_storage_path,
  media.external_url as image_external_url,
  media.mime_type as image_mime_type,
  media.width as image_width,
  media.height as image_height,
  media.focal_x as image_focal_x,
  media.focal_y as image_focal_y,
  offering.sort_order
from public.motorbike_offerings offering
left join public.cms_media_assets media on media.id = offering.image_media_id
where offering.publication_status = 'published';

grant select on table public.public_motorbike_offerings to anon, authenticated;

comment on view public.public_motorbike_offerings is
  'Public-safe Trip motorbike catalog projection with explicit presentation ordering; operational Biker and private Supplier fields remain excluded.';
