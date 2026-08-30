-- V2 Phase 2.6H: keep draft work available to staff while reserving every
-- production/lifecycle transition for administrators at the database boundary.

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

revoke all on function public.is_cms_admin() from public;
grant execute on function public.is_cms_admin() to authenticated;

create or replace function public.guard_cms_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  protected_key text;
  protected_keys text[];
begin
  if (select public.is_cms_admin()) then
    return new;
  end if;
  if not (select public.is_staff_or_admin()) then
    raise exception 'CMS mutation requires staff or admin';
  end if;

  old_row := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  new_row := to_jsonb(new);

  if tg_table_name = 'cms_pages' then
    protected_keys := array[
      'published_title', 'published_seo_title', 'published_seo_description',
      'published_og_media_id', 'published_at', 'published_by'
    ];
    if (tg_op = 'INSERT' and new_row ->> 'status' <> 'draft')
      or (tg_op = 'UPDATE' and new_row -> 'status' is distinct from old_row -> 'status' and (
        (new_row ->> 'status') = any (array['published', 'archived'])
        or old_row ->> 'status' = 'archived'
      ))
    then
      raise exception 'CMS publish/archive requires admin';
    end if;
  elsif tg_table_name = 'cms_sections' then
    protected_keys := array[
      'published_eyebrow', 'published_heading', 'published_body',
      'published_cta_label', 'published_cta_href', 'published_desktop_media_id',
      'published_mobile_media_id', 'published_sort_order',
      'published_is_enabled', 'published_max_items'
    ];
  elsif tg_table_name = 'cms_section_items' then
    protected_keys := array[
      'published_title', 'published_body', 'published_label', 'published_href',
      'published_media_id', 'published_room_type_id', 'published_physical_room_id',
      'published_sort_order', 'published_is_enabled'
    ];
  elsif tg_table_name = 'cms_media_assets' then
    if (tg_op = 'INSERT' and coalesce((new_row ->> 'is_active')::boolean, false) is not true)
      or (tg_op = 'UPDATE' and new_row -> 'is_active' is distinct from old_row -> 'is_active')
    then
      raise exception 'CMS media lifecycle requires admin';
    end if;
    return new;
  end if;

  foreach protected_key in array protected_keys loop
    if (tg_op = 'INSERT' and new_row ->> protected_key is not null)
      or (tg_op = 'UPDATE' and new_row -> protected_key is distinct from old_row -> protected_key)
    then
      raise exception 'CMS published snapshots require admin';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.guard_cms_lifecycle() from public;
grant execute on function public.guard_cms_lifecycle() to authenticated;

drop trigger if exists cms_pages_lifecycle_guard on public.cms_pages;
create trigger cms_pages_lifecycle_guard before insert or update on public.cms_pages
for each row execute function public.guard_cms_lifecycle();
drop trigger if exists cms_sections_lifecycle_guard on public.cms_sections;
create trigger cms_sections_lifecycle_guard before insert or update on public.cms_sections
for each row execute function public.guard_cms_lifecycle();
drop trigger if exists cms_items_lifecycle_guard on public.cms_section_items;
create trigger cms_items_lifecycle_guard before insert or update on public.cms_section_items
for each row execute function public.guard_cms_lifecycle();
drop trigger if exists cms_media_lifecycle_guard on public.cms_media_assets;
create trigger cms_media_lifecycle_guard before insert or update on public.cms_media_assets
for each row execute function public.guard_cms_lifecycle();

create or replace function public.publish_cms_page(target_page_key text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare target_page_id uuid;
begin
  if not (select public.is_cms_admin()) then
    raise exception 'CMS publish requires admin';
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

create or replace function public.archive_cms_page(target_page_key text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare target_page_id uuid;
begin
  if not (select public.is_cms_admin()) then
    raise exception 'CMS page archive requires admin';
  end if;
  update public.cms_pages set status = 'archived'
  where page_key = target_page_key and status <> 'archived'
  returning id into target_page_id;
  if target_page_id is null then raise exception 'CMS page not found or already archived'; end if;
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
  if not (select public.is_cms_admin()) then
    raise exception 'CMS media archive requires admin';
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

create or replace function public.reorder_cms_section(
  target_page_key text,
  target_section_id uuid,
  move_direction text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_page_id uuid;
  ordered_ids uuid[];
  target_position integer;
  swap_id uuid;
  position integer;
begin
  if not (select public.is_staff_or_admin()) then raise exception 'CMS reorder requires staff or admin'; end if;
  if move_direction not in ('up', 'down') then raise exception 'Invalid CMS reorder direction'; end if;
  select id into target_page_id from public.cms_pages where page_key = target_page_key for update;
  if target_page_id is null then raise exception 'CMS page not found'; end if;
  perform 1 from public.cms_sections where page_id = target_page_id order by sort_order, id for update;
  select array_agg(id order by sort_order, id) into ordered_ids
  from public.cms_sections where page_id = target_page_id;
  target_position := array_position(ordered_ids, target_section_id);
  if target_position is null then raise exception 'CMS section not found'; end if;
  if move_direction = 'up' and target_position > 1 then
    swap_id := ordered_ids[target_position - 1];
    ordered_ids[target_position - 1] := target_section_id;
    ordered_ids[target_position] := swap_id;
  elsif move_direction = 'down' and target_position < coalesce(array_length(ordered_ids, 1), 0) then
    swap_id := ordered_ids[target_position + 1];
    ordered_ids[target_position + 1] := target_section_id;
    ordered_ids[target_position] := swap_id;
  end if;
  for position in 1..coalesce(array_length(ordered_ids, 1), 0) loop
    update public.cms_sections set sort_order = position * 10 where id = ordered_ids[position];
  end loop;
  update public.cms_pages set status = 'draft'
  where id = target_page_id and status <> 'archived';
end;
$$;

create or replace function public.reorder_cms_section_item(
  target_page_key text,
  target_item_id uuid,
  move_direction text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_page_id uuid;
  target_section_id uuid;
  ordered_ids uuid[];
  target_position integer;
  swap_id uuid;
  position integer;
begin
  if not (select public.is_staff_or_admin()) then raise exception 'CMS reorder requires staff or admin'; end if;
  if move_direction not in ('up', 'down') then raise exception 'Invalid CMS reorder direction'; end if;
  select p.id, i.section_id into target_page_id, target_section_id
  from public.cms_section_items i
  join public.cms_sections s on s.id = i.section_id
  join public.cms_pages p on p.id = s.page_id
  where i.id = target_item_id and p.page_key = target_page_key
  for update of p, s, i;
  if target_section_id is null then raise exception 'CMS item not found'; end if;
  perform 1 from public.cms_section_items where section_id = target_section_id order by sort_order, id for update;
  select array_agg(id order by sort_order, id) into ordered_ids
  from public.cms_section_items where section_id = target_section_id;
  target_position := array_position(ordered_ids, target_item_id);
  if move_direction = 'up' and target_position > 1 then
    swap_id := ordered_ids[target_position - 1];
    ordered_ids[target_position - 1] := target_item_id;
    ordered_ids[target_position] := swap_id;
  elsif move_direction = 'down' and target_position < coalesce(array_length(ordered_ids, 1), 0) then
    swap_id := ordered_ids[target_position + 1];
    ordered_ids[target_position + 1] := target_item_id;
    ordered_ids[target_position] := swap_id;
  end if;
  for position in 1..coalesce(array_length(ordered_ids, 1), 0) loop
    update public.cms_section_items set sort_order = position * 10 where id = ordered_ids[position];
  end loop;
  update public.cms_pages set status = 'draft'
  where id = target_page_id and status <> 'archived';
end;
$$;

revoke all on function public.publish_cms_page(text) from public;
revoke all on function public.archive_cms_page(text) from public;
revoke all on function public.archive_cms_media_asset(uuid) from public;
revoke all on function public.reorder_cms_section(text, uuid, text) from public;
revoke all on function public.reorder_cms_section_item(text, uuid, text) from public;
grant execute on function public.publish_cms_page(text) to authenticated;
grant execute on function public.archive_cms_page(text) to authenticated;
grant execute on function public.archive_cms_media_asset(uuid) to authenticated;
grant execute on function public.reorder_cms_section(text, uuid, text) to authenticated;
grant execute on function public.reorder_cms_section_item(text, uuid, text) to authenticated;

comment on function public.publish_cms_page(text) is 'Atomically publishes a full CMS page; requires app_metadata.role admin.';
comment on function public.archive_cms_page(text) is 'Archives a CMS page; requires app_metadata.role admin.';
comment on function public.archive_cms_media_asset(uuid) is 'Archives unreferenced website media; requires app_metadata.role admin.';
