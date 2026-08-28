-- Tà Xùa Stay Phase 1: independent database foundation and Admin authorization.
-- This is a clean Stay migration. It intentionally contains no property, room,
-- availability, rate, customer, or booking tables.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_updated_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select public.current_app_role()) = 'admin'
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (select public.current_app_role()) in ('admin', 'staff')
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.set_updated_by() from public;
revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_staff_or_admin() from public;

grant execute on function public.set_updated_at() to authenticated;
grant execute on function public.set_updated_by() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;

create table if not exists public.site_settings (
  id text primary key default 'main'
    constraint site_settings_singleton check (id = 'main'),
  site_name text not null default 'TÀ XÙA STAY'
    constraint site_settings_name_length check (char_length(site_name) between 2 and 80),
  tagline text not null default 'Đúng phòng. Đúng view. Yên tâm lên Tà Xùa.'
    constraint site_settings_tagline_length check (char_length(tagline) between 2 and 160),
  hotline text
    constraint site_settings_hotline_length check (hotline is null or char_length(hotline) between 3 and 30),
  zalo_url text
    constraint site_settings_zalo_https check (zalo_url is null or zalo_url ~ '^https://[^[:space:]]+$'),
  facebook_url text
    constraint site_settings_facebook_https check (facebook_url is null or facebook_url ~ '^https://[^[:space:]]+$'),
  tiktok_url text
    constraint site_settings_tiktok_https check (tiktok_url is null or tiktok_url ~ '^https://[^[:space:]]+$'),
  address text
    constraint site_settings_address_length check (address is null or char_length(address) <= 300),
  google_maps_url text
    constraint site_settings_maps_https check (google_maps_url is null or google_maps_url ~ '^https://[^[:space:]]+$'),
  announcement text
    constraint site_settings_announcement_length check (announcement is null or char_length(announcement) <= 300),
  announcement_enabled boolean not null default false,
  hero_title text not null default 'Tìm chỗ ở Tà Xùa rõ ràng hơn'
    constraint site_settings_hero_title_length check (char_length(hero_title) between 2 and 120),
  hero_subtitle text not null default 'Thông tin phòng, view, đường vào, giá và tình trạng phòng sẽ được xác minh theo từng giai đoạn.'
    constraint site_settings_hero_subtitle_length check (char_length(hero_subtitle) between 10 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_by on public.site_settings;
create trigger site_settings_set_updated_by
before update on public.site_settings
for each row execute function public.set_updated_by();

alter table public.site_settings enable row level security;

revoke all on table public.site_settings from anon, authenticated;

grant select (
  id,
  site_name,
  tagline,
  hotline,
  zalo_url,
  facebook_url,
  tiktok_url,
  address,
  google_maps_url,
  announcement,
  announcement_enabled,
  hero_title,
  hero_subtitle,
  updated_at
) on table public.site_settings to anon, authenticated;

grant update (
  site_name,
  tagline,
  hotline,
  zalo_url,
  facebook_url,
  tiktok_url,
  address,
  google_maps_url,
  announcement,
  announcement_enabled,
  hero_title,
  hero_subtitle
) on table public.site_settings to authenticated;

drop policy if exists "public reads safe site settings" on public.site_settings;
create policy "public reads safe site settings"
on public.site_settings
for select
to anon, authenticated
using (id = 'main');

drop policy if exists "admins update site settings" on public.site_settings;
create policy "admins update site settings"
on public.site_settings
for update
to authenticated
using ((select public.is_admin()))
with check (id = 'main' and (select public.is_admin()));

insert into public.site_settings (id)
values ('main')
on conflict (id) do nothing;

comment on table public.site_settings is
  'Single public-safe Tà Xùa Stay settings row. Only app_metadata.role=admin may update.';
comment on column public.site_settings.updated_by is
  'Server-maintained Auth user id; intentionally excluded from public column grants.';
