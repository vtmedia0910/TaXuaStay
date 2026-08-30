-- Tà Xùa Trip V2 Phase 2.6: structured CMS, website media and content operations.
-- Draft fields and published snapshots are deliberately separate so editing never
-- leaks unpublished content. Public grants expose only the published snapshot.

create table public.cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null constraint cms_media_title_length check (char_length(title) between 2 and 160),
  alt_text text not null constraint cms_media_alt_length check (char_length(alt_text) between 2 and 300),
  caption text constraint cms_media_caption_length check (caption is null or char_length(caption) <= 500),
  media_type text not null default 'image'
    constraint cms_media_type_allowed check (media_type in ('image')),
  role text not null default 'general'
    constraint cms_media_role_allowed check (role in ('hero', 'card', 'gallery', 'banner', 'og', 'icon', 'general')),
  storage_bucket text,
  storage_path text,
  external_url text,
  mime_type text constraint cms_media_mime_allowed check (
    mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ),
  width integer constraint cms_media_width_positive check (width is null or width between 1 and 20000),
  height integer constraint cms_media_height_positive check (height is null or height between 1 and 20000),
  focal_x smallint not null default 50 constraint cms_media_focal_x_range check (focal_x between 0 and 100),
  focal_y smallint not null default 50 constraint cms_media_focal_y_range check (focal_y between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint cms_media_exactly_one_source check (
    ((storage_path is not null)::integer + (external_url is not null)::integer) = 1
  ),
  constraint cms_media_storage_pair check (
    (storage_path is null and storage_bucket is null)
    or (storage_path is not null and storage_bucket = 'site-content')
  ),
  constraint cms_media_storage_path_safe check (
    storage_path is null or (
      storage_path ~ '^(homepage|stay|about|banners|og|general)/[A-Za-z0-9][A-Za-z0-9._/-]*$'
      and storage_path !~ '(^|/)\.\.(/|$)'
    )
  ),
  constraint cms_media_external_https check (
    external_url is null or external_url ~ '^https://[^[:space:]]+$'
  )
);

create table public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique
    constraint cms_page_key_allowed check (page_key in ('home', 'stay', 'verified', 'footer', 'faq')),
  status text not null default 'draft'
    constraint cms_page_status_allowed check (status in ('draft', 'published', 'archived')),
  title text not null constraint cms_page_title_length check (char_length(title) between 2 and 160),
  seo_title text constraint cms_page_seo_title_length check (seo_title is null or char_length(seo_title) between 2 and 70),
  seo_description text constraint cms_page_seo_description_length check (seo_description is null or char_length(seo_description) between 10 and 180),
  og_media_id uuid references public.cms_media_assets(id) on delete restrict,
  published_title text constraint cms_page_published_title_length check (published_title is null or char_length(published_title) between 2 and 160),
  published_seo_title text constraint cms_page_published_seo_title_length check (published_seo_title is null or char_length(published_seo_title) between 2 and 70),
  published_seo_description text constraint cms_page_published_seo_description_length check (published_seo_description is null or char_length(published_seo_description) between 10 and 180),
  published_og_media_id uuid references public.cms_media_assets(id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table public.cms_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete cascade,
  section_key text not null
    constraint cms_section_key_allowed check (section_key in (
      'hero', 'why_choose_us', 'differentiators', 'verified_rooms', 'services',
      'cloud_view', 'brand_statement', 'final_cta', 'stay_intro', 'stay_notes',
      'footer_intro', 'footer_links', 'faq_list'
    )),
  section_type text not null
    constraint cms_section_type_allowed check (section_type in (
      'hero', 'feature_grid', 'dynamic_room_grid', 'service_grid', 'text', 'cta', 'link_list', 'faq'
    )),
  eyebrow text constraint cms_section_eyebrow_length check (eyebrow is null or char_length(eyebrow) <= 100),
  heading text constraint cms_section_heading_length check (heading is null or char_length(heading) <= 180),
  body text constraint cms_section_body_length check (body is null or char_length(body) <= 1200),
  cta_label text constraint cms_section_cta_label_length check (cta_label is null or char_length(cta_label) <= 80),
  cta_href text constraint cms_section_cta_href_safe check (
    cta_href is null or cta_href ~ '^(/[^[:space:]]*|https://[^[:space:]]+)$'
  ),
  desktop_media_id uuid references public.cms_media_assets(id) on delete restrict,
  mobile_media_id uuid references public.cms_media_assets(id) on delete restrict,
  sort_order integer not null default 0 constraint cms_section_sort_range check (sort_order between 0 and 1000),
  is_enabled boolean not null default true,
  max_items smallint constraint cms_section_max_items_range check (max_items is null or max_items between 1 and 24),
  published_eyebrow text constraint cms_section_published_eyebrow_length check (published_eyebrow is null or char_length(published_eyebrow) <= 100),
  published_heading text constraint cms_section_published_heading_length check (published_heading is null or char_length(published_heading) <= 180),
  published_body text constraint cms_section_published_body_length check (published_body is null or char_length(published_body) <= 1200),
  published_cta_label text constraint cms_section_published_cta_label_length check (published_cta_label is null or char_length(published_cta_label) <= 80),
  published_cta_href text constraint cms_section_published_cta_href_safe check (
    published_cta_href is null or published_cta_href ~ '^(/[^[:space:]]*|https://[^[:space:]]+)$'
  ),
  published_desktop_media_id uuid references public.cms_media_assets(id) on delete restrict,
  published_mobile_media_id uuid references public.cms_media_assets(id) on delete restrict,
  published_sort_order integer constraint cms_section_published_sort_range check (published_sort_order is null or published_sort_order between 0 and 1000),
  published_is_enabled boolean,
  published_max_items smallint constraint cms_section_published_max_items_range check (published_max_items is null or published_max_items between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (page_id, section_key)
);

create table public.cms_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.cms_sections(id) on delete cascade,
  item_key text not null constraint cms_item_key_format check (item_key ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  item_type text not null default 'content'
    constraint cms_item_type_allowed check (item_type in ('content', 'link', 'faq', 'room_reference')),
  title text not null constraint cms_item_title_length check (char_length(title) between 1 and 180),
  body text constraint cms_item_body_length check (body is null or char_length(body) <= 1000),
  label text constraint cms_item_label_length check (label is null or char_length(label) <= 80),
  href text constraint cms_item_href_safe check (href is null or href ~ '^(/[^[:space:]]*|https://[^[:space:]]+)$'),
  media_id uuid references public.cms_media_assets(id) on delete restrict,
  room_type_id uuid references public.room_types(id) on delete restrict,
  physical_room_id uuid references public.physical_rooms(id) on delete restrict,
  sort_order integer not null default 0 constraint cms_item_sort_range check (sort_order between 0 and 1000),
  is_enabled boolean not null default true,
  published_title text constraint cms_item_published_title_length check (published_title is null or char_length(published_title) between 1 and 180),
  published_body text constraint cms_item_published_body_length check (published_body is null or char_length(published_body) <= 1000),
  published_label text constraint cms_item_published_label_length check (published_label is null or char_length(published_label) <= 80),
  published_href text constraint cms_item_published_href_safe check (published_href is null or published_href ~ '^(/[^[:space:]]*|https://[^[:space:]]+)$'),
  published_media_id uuid references public.cms_media_assets(id) on delete restrict,
  published_room_type_id uuid references public.room_types(id) on delete restrict,
  published_physical_room_id uuid references public.physical_rooms(id) on delete restrict,
  published_sort_order integer constraint cms_item_published_sort_range check (published_sort_order is null or published_sort_order between 0 and 1000),
  published_is_enabled boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint cms_item_one_entity check (room_type_id is null or physical_room_id is null),
  constraint cms_item_published_one_entity check (published_room_type_id is null or published_physical_room_id is null),
  unique (section_id, item_key)
);

create index cms_sections_page_sort_idx on public.cms_sections (page_id, sort_order, id);
create index cms_section_items_section_sort_idx on public.cms_section_items (section_id, sort_order, id);
create index cms_media_assets_role_active_idx on public.cms_media_assets (role, is_active, created_at desc);

create or replace function public.set_cms_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  if tg_op = 'INSERT' then
    new.created_by = coalesce(new.created_by, auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function public.set_cms_audit() from public;
grant execute on function public.set_cms_audit() to authenticated;

create trigger cms_media_assets_audit before insert or update on public.cms_media_assets
for each row execute function public.set_cms_audit();
create trigger cms_pages_audit before insert or update on public.cms_pages
for each row execute function public.set_cms_audit();
create trigger cms_sections_audit before insert or update on public.cms_sections
for each row execute function public.set_cms_audit();
create trigger cms_section_items_audit before insert or update on public.cms_section_items
for each row execute function public.set_cms_audit();

alter table public.cms_media_assets enable row level security;
alter table public.cms_pages enable row level security;
alter table public.cms_sections enable row level security;
alter table public.cms_section_items enable row level security;

revoke all on table public.cms_media_assets, public.cms_pages, public.cms_sections, public.cms_section_items from anon, authenticated;
grant select, insert, update, delete on table public.cms_media_assets, public.cms_pages, public.cms_sections, public.cms_section_items to authenticated;

grant select (id, title, alt_text, caption, media_type, role, storage_bucket, storage_path, external_url, mime_type, width, height, focal_x, focal_y)
on table public.cms_media_assets to anon;
grant select (id, page_key, published_title, published_seo_title, published_seo_description, published_og_media_id, published_at)
on table public.cms_pages to anon;
grant select (id, page_id, section_key, section_type, published_eyebrow, published_heading, published_body, published_cta_label, published_cta_href, published_desktop_media_id, published_mobile_media_id, published_sort_order, published_is_enabled, published_max_items)
on table public.cms_sections to anon;
grant select (id, section_id, item_key, item_type, published_title, published_body, published_label, published_href, published_media_id, published_room_type_id, published_physical_room_id, published_sort_order, published_is_enabled)
on table public.cms_section_items to anon;

create policy "staff manages cms media" on public.cms_media_assets for all to authenticated
using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()));
create policy "staff manages cms pages" on public.cms_pages for all to authenticated
using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()));
create policy "staff manages cms sections" on public.cms_sections for all to authenticated
using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()));
create policy "staff manages cms items" on public.cms_section_items for all to authenticated
using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()));

create policy "public reads cms published pages" on public.cms_pages for select to anon
using (published_at is not null and status <> 'archived');
create policy "public reads cms published sections" on public.cms_sections for select to anon
using (
  published_is_enabled is true and exists (
    select 1 from public.cms_pages p
    where p.id = cms_sections.page_id and p.published_at is not null and p.status <> 'archived'
  )
);
create policy "public reads cms published items" on public.cms_section_items for select to anon
using (
  published_is_enabled is true and exists (
    select 1 from public.cms_sections s join public.cms_pages p on p.id = s.page_id
    where s.id = cms_section_items.section_id and s.published_is_enabled is true
      and p.published_at is not null and p.status <> 'archived'
  )
);
create policy "public reads referenced cms media" on public.cms_media_assets for select to anon
using (
  is_active is true and (
    exists (select 1 from public.cms_pages p where p.published_og_media_id = cms_media_assets.id and p.published_at is not null and p.status <> 'archived')
    or exists (select 1 from public.cms_sections s join public.cms_pages p on p.id = s.page_id where (s.published_desktop_media_id = cms_media_assets.id or s.published_mobile_media_id = cms_media_assets.id) and s.published_is_enabled is true and p.published_at is not null and p.status <> 'archived')
    or exists (select 1 from public.cms_section_items i join public.cms_sections s on s.id = i.section_id join public.cms_pages p on p.id = s.page_id where i.published_media_id = cms_media_assets.id and i.published_is_enabled is true and s.published_is_enabled is true and p.published_at is not null and p.status <> 'archived')
  )
);

create or replace view public.public_cms_pages
with (security_invoker = true, security_barrier = true)
as select id, page_key, published_title as title, published_seo_title as seo_title,
  published_seo_description as seo_description, published_og_media_id as og_media_id, published_at
from public.cms_pages where published_at is not null and status <> 'archived';

create or replace view public.public_cms_sections
with (security_invoker = true, security_barrier = true)
as select id, page_id, section_key, section_type, published_eyebrow as eyebrow,
  published_heading as heading, published_body as body, published_cta_label as cta_label,
  published_cta_href as cta_href, published_desktop_media_id as desktop_media_id,
  published_mobile_media_id as mobile_media_id, published_sort_order as sort_order,
  published_max_items as max_items
from public.cms_sections where published_is_enabled is true;

create or replace view public.public_cms_section_items
with (security_invoker = true, security_barrier = true)
as select id, section_id, item_key, item_type, published_title as title,
  published_body as body, published_label as label, published_href as href,
  published_media_id as media_id, published_room_type_id as room_type_id,
  published_physical_room_id as physical_room_id, published_sort_order as sort_order
from public.cms_section_items where published_is_enabled is true;

create or replace view public.public_cms_media_assets
with (security_invoker = true, security_barrier = true)
as select id, title, alt_text, caption, media_type, role, storage_bucket, storage_path,
  external_url, mime_type, width, height, focal_x, focal_y
from public.cms_media_assets where is_active is true;

grant select on table public.public_cms_pages, public.public_cms_sections,
  public.public_cms_section_items, public.public_cms_media_assets to anon, authenticated;

create or replace function public.publish_cms_page(target_page_key text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare target_page_id uuid;
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'CMS publish requires staff or admin';
  end if;

  select id into target_page_id from public.cms_pages where page_key = target_page_key for update;
  if target_page_id is null then raise exception 'CMS page not found'; end if;

  update public.cms_sections set
    published_eyebrow = eyebrow, published_heading = heading, published_body = body,
    published_cta_label = cta_label, published_cta_href = cta_href,
    published_desktop_media_id = desktop_media_id, published_mobile_media_id = mobile_media_id,
    published_sort_order = sort_order, published_is_enabled = is_enabled, published_max_items = max_items
  where page_id = target_page_id;

  update public.cms_section_items i set
    published_title = i.title, published_body = i.body, published_label = i.label,
    published_href = i.href, published_media_id = i.media_id,
    published_room_type_id = i.room_type_id, published_physical_room_id = i.physical_room_id,
    published_sort_order = i.sort_order, published_is_enabled = i.is_enabled
  from public.cms_sections s where s.id = i.section_id and s.page_id = target_page_id;

  update public.cms_pages set
    status = 'published', published_title = title, published_seo_title = seo_title,
    published_seo_description = seo_description, published_og_media_id = og_media_id,
    published_at = now(), published_by = auth.uid()
  where id = target_page_id;

  return target_page_id;
end;
$$;

create or replace function public.archive_cms_media_asset(target_media_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'CMS media archive requires staff or admin';
  end if;
  if exists (select 1 from public.cms_pages where og_media_id = target_media_id or published_og_media_id = target_media_id)
    or exists (select 1 from public.cms_sections where desktop_media_id = target_media_id or mobile_media_id = target_media_id or published_desktop_media_id = target_media_id or published_mobile_media_id = target_media_id)
    or exists (select 1 from public.cms_section_items where media_id = target_media_id or published_media_id = target_media_id)
  then raise exception 'CMS media is still referenced'; end if;
  update public.cms_media_assets set is_active = false where id = target_media_id and is_active is true;
  if not found then raise exception 'CMS media not found or already archived'; end if;
  return target_media_id;
end;
$$;

revoke all on function public.publish_cms_page(text) from public;
revoke all on function public.archive_cms_media_asset(uuid) from public;
grant execute on function public.publish_cms_page(text) to authenticated;
grant execute on function public.archive_cms_media_asset(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-content', 'site-content', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "public reads site content objects" on storage.objects for select to public
using (bucket_id = 'site-content');
create policy "staff uploads site content objects" on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-content' and (select public.is_staff_or_admin())
  and (storage.foldername(name))[1] = any (array['homepage', 'stay', 'about', 'banners', 'og', 'general'])
);
create policy "staff updates site content objects" on storage.objects for update to authenticated
using (bucket_id = 'site-content' and (select public.is_staff_or_admin()))
with check (
  bucket_id = 'site-content' and (select public.is_staff_or_admin())
  and (storage.foldername(name))[1] = any (array['homepage', 'stay', 'about', 'banners', 'og', 'general'])
);
create policy "staff deletes site content objects" on storage.objects for delete to authenticated
using (bucket_id = 'site-content' and (select public.is_staff_or_admin()));

-- Seed the currently approved public copy. These are real brand defaults, never demo entities.
insert into public.cms_pages (
  page_key, status, title, seo_title, seo_description,
  published_title, published_seo_title, published_seo_description, published_at
) values
  ('home', 'published', 'Tà Xùa Trip', 'Tà Xùa Trip | Đi thật. Biết trước.', 'Thẩm định nơi ở, bằng chứng và thông tin cần biết để chuẩn bị chuyến Tà Xùa rõ ràng hơn.', 'Tà Xùa Trip', 'Tà Xùa Trip | Đi thật. Biết trước.', 'Thẩm định nơi ở, bằng chứng và thông tin cần biết để chuẩn bị chuyến Tà Xùa rõ ràng hơn.', now()),
  ('stay', 'published', 'Lưu trú Tà Xùa', 'Homestay Tà Xùa: Xem phòng, view thật & giá', 'Khám phá nơi lưu trú Tà Xùa theo đúng loại phòng, sức chứa, view đã ghi nhận, giá theo ngày và tình trạng phòng khi có dữ liệu.', 'Lưu trú Tà Xùa', 'Homestay Tà Xùa: Xem phòng, view thật & giá', 'Khám phá nơi lưu trú Tà Xùa theo đúng loại phòng, sức chứa, view đã ghi nhận, giá theo ngày và tình trạng phòng khi có dữ liệu.', now()),
  ('footer', 'published', 'Chân trang', null, null, 'Chân trang', null, null, now()),
  ('faq', 'draft', 'Câu hỏi thường gặp', null, null, null, null, null, null)
on conflict (page_key) do nothing;

insert into public.cms_sections (
  page_id, section_key, section_type, eyebrow, heading, body, cta_label, cta_href,
  sort_order, is_enabled, max_items, published_eyebrow, published_heading, published_body,
  published_cta_label, published_cta_href, published_sort_order, published_is_enabled, published_max_items
)
select p.id, seed.section_key, seed.section_type, seed.eyebrow, seed.heading, seed.body,
  seed.cta_label, seed.cta_href, seed.sort_order, true, seed.max_items,
  seed.eyebrow, seed.heading, seed.body, seed.cta_label, seed.cta_href, seed.sort_order, true, seed.max_items
from public.cms_pages p
join (values
  ('home', 'hero', 'hero', 'TÀ XÙA • VERIFIED LOCAL TRAVEL', 'Đi thật. Biết trước.', 'Chúng tôi trực tiếp thẩm định nơi ở, quay video 360°, chỉ rõ ưu nhược điểm và giúp bạn chuẩn bị chuyến Tà Xùa rõ ràng hơn trước khi lên đường.', 'Tìm chuyến đi phù hợp', '/stay', 10, null::smallint),
  ('home', 'why_choose_us', 'feature_grid', 'Vì sao chọn chúng tôi?', 'Quyết định dễ hơn khi thông tin được tách rõ.', 'Chúng tôi kiểm tra và tách từng thông tin để bạn tự chọn phương án phù hợp, kể cả khi câu trả lời hiện tại là “Chưa xác minh”.', null, null, 20, null::smallint),
  ('home', 'differentiators', 'feature_grid', 'Chúng tôi làm gì khác?', 'Bắt đầu từ bằng chứng, không bắt đầu từ lời quảng cáo.', null, null, null, 30, null::smallint),
  ('home', 'verified_rooms', 'dynamic_room_grid', 'Dữ liệu thật đang công khai', 'Homestay & phòng Tà Xùa đã thẩm định', 'Chỉ hiển thị phòng có hồ sơ Cloud View còn hiệu lực trong dữ liệu công khai. Không có dữ liệu thì không tạo thẻ mẫu.', 'Xem toàn bộ Lưu trú', '/stay', 40, 3::smallint),
  ('home', 'brand_statement', 'text', 'Nguyên tắc thương hiệu', 'Không bán cái đẹp. Bán cái phù hợp.', 'Lựa chọn tốt không phải lúc nào cũng nổi bật nhất trên ảnh. Đó là lựa chọn phù hợp với cách bạn muốn đi và những điều bạn sẵn sàng đánh đổi.', null, null, 80, null::smallint),
  ('home', 'final_cta', 'cta', 'Tà Xùa, trước khi bạn đến.', 'Phần phức tạp để chúng tôi lo.', 'Bắt đầu bằng nơi lưu trú phù hợp. Các phần còn lại của chuyến sẽ chỉ được mở khi có dữ liệu và quy trình thật.', 'Bắt đầu tìm chuyến', '/stay', 90, null::smallint),
  ('stay', 'stay_intro', 'hero', 'LƯU TRÚ TÀ XÙA', 'Homestay Tà Xùa: xem phòng thật, view thật, giá rõ ràng', 'Chọn theo đúng loại phòng, sức chứa và bằng chứng đã công khai. Khi có đủ ngày, hệ thống đối chiếu từng đêm; dữ liệu thiếu không bao giờ được xem là còn phòng.', null, null, 10, null::smallint),
  ('stay', 'stay_notes', 'text', 'THÔNG TIN CẦN LƯU Ý', 'Giá và tình trạng phòng là hai dữ liệu độc lập.', 'Website chỉ hiển thị giá hoặc khả năng đáp ứng khi có dữ liệu tương ứng. Không suy luận từ dữ liệu thiếu.', null, null, 20, null::smallint),
  ('footer', 'footer_intro', 'text', null, 'Tà Xùa Trip', 'Nền tảng du lịch địa phương giúp bạn biết rõ nơi ở, bằng chứng và điều cần lưu ý trước khi lên đường.', null, null, 10, null::smallint)
) as seed(page_key, section_key, section_type, eyebrow, heading, body, cta_label, cta_href, sort_order, max_items)
on p.page_key = seed.page_key
on conflict (page_id, section_key) do nothing;

comment on table public.cms_pages is 'Allowlisted website pages with mutable draft fields and immutable-until-publish public snapshots.';
comment on function public.publish_cms_page(text) is 'Atomically publishes the full page, all sections and all items using auth.uid audit data.';
comment on table public.cms_media_assets is 'Website-only image library. Accommodation evidence continues to use media_assets.';
