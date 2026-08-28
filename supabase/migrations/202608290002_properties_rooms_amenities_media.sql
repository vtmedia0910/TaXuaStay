-- Tà Xùa Stay Phase 2: accommodation content domain.
-- This additive migration intentionally excludes search, verification scoring,
-- rates, inventory, availability, bookings, weather, imports, and referrals.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  property_type text not null,
  short_description text,
  description text,
  area_name text not null,
  address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  altitude_m integer,
  google_maps_url text,
  public_phone text,
  public_zalo_url text,
  check_in_time time not null default time '14:00',
  check_out_time time not null default time '12:00',
  road_access_grade text not null default 'unknown',
  car_access boolean not null default false,
  motorbike_access boolean not null default false,
  parking boolean not null default false,
  restaurant boolean not null default false,
  breakfast boolean not null default false,
  bbq boolean not null default false,
  wifi boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default false,
  publish_status text not null default 'draft',
  archived_at timestamptz,
  property_verified_at timestamptz,
  location_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint properties_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint properties_name_length check (char_length(name) between 2 and 160),
  constraint properties_type check (
    property_type in ('homestay', 'bungalow', 'hotel', 'guesthouse', 'glamping', 'other')
  ),
  constraint properties_short_description_length check (
    short_description is null or char_length(short_description) <= 300
  ),
  constraint properties_description_length check (
    description is null or char_length(description) <= 10000
  ),
  constraint properties_area_name_length check (char_length(area_name) between 2 and 120),
  constraint properties_address_length check (address is null or char_length(address) <= 500),
  constraint properties_coordinate_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint properties_latitude_bounds check (latitude is null or latitude between -90 and 90),
  constraint properties_longitude_bounds check (longitude is null or longitude between -180 and 180),
  constraint properties_altitude_bounds check (altitude_m is null or altitude_m between -500 and 9000),
  constraint properties_maps_https check (
    google_maps_url is null or google_maps_url ~ '^https://[^[:space:]]+$'
  ),
  constraint properties_phone_length check (
    public_phone is null or char_length(public_phone) between 3 and 30
  ),
  constraint properties_zalo_https check (
    public_zalo_url is null or public_zalo_url ~ '^https://[^[:space:]]+$'
  ),
  constraint properties_check_times_differ check (check_in_time <> check_out_time),
  constraint properties_road_access_grade check (
    road_access_grade in ('unknown', 'a', 'b', 'c', 'd')
  ),
  constraint properties_publish_status check (
    publish_status in ('draft', 'published', 'archived')
  ),
  constraint properties_published_active check (
    publish_status <> 'published' or (is_active and archived_at is null)
  ),
  constraint properties_archived_state check (
    publish_status <> 'archived' or (not is_active and archived_at is not null)
  )
);

create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  slug text not null,
  name text not null,
  short_description text,
  description text,
  capacity_adults integer not null default 1,
  capacity_children integer not null default 0,
  max_guests integer not null default 1,
  bed_type text,
  bed_count integer,
  bathroom_type text not null default 'private',
  quantity integer not null default 0,
  size_m2 numeric(7, 2),
  floor_label text,
  has_private_balcony boolean not null default false,
  view_type text not null default 'unknown',
  is_active boolean not null default false,
  publish_status text not null default 'draft',
  room_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint room_types_property_slug_unique unique (property_id, slug),
  constraint room_types_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint room_types_name_length check (char_length(name) between 2 and 160),
  constraint room_types_short_description_length check (
    short_description is null or char_length(short_description) <= 300
  ),
  constraint room_types_description_length check (
    description is null or char_length(description) <= 10000
  ),
  constraint room_types_capacity_adults check (capacity_adults between 1 and 50),
  constraint room_types_capacity_children check (capacity_children between 0 and 50),
  constraint room_types_max_guests check (
    max_guests between capacity_adults and capacity_adults + capacity_children
  ),
  constraint room_types_bed_type_length check (bed_type is null or char_length(bed_type) <= 120),
  constraint room_types_bed_count check (bed_count is null or bed_count between 1 and 50),
  constraint room_types_bathroom_type check (
    bathroom_type in ('private', 'shared', 'ensuite', 'other')
  ),
  constraint room_types_quantity check (quantity between 0 and 1000),
  constraint room_types_published_quantity check (
    publish_status <> 'published' or (is_active and quantity >= 1)
  ),
  constraint room_types_size check (size_m2 is null or size_m2 > 0),
  constraint room_types_floor_label_length check (
    floor_label is null or char_length(floor_label) <= 80
  ),
  constraint room_types_view_type check (
    view_type in ('unknown', 'mountain', 'valley', 'garden', 'village', 'courtyard', 'none', 'other')
  ),
  constraint room_types_publish_status check (
    publish_status in ('draft', 'published', 'archived')
  )
);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  icon_key text,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint amenities_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint amenities_name_length check (char_length(name) between 2 and 120),
  constraint amenities_category check (
    category in ('room', 'bathroom', 'food', 'parking', 'comfort', 'family', 'outdoor', 'policy', 'other')
  ),
  constraint amenities_icon_key_format check (
    icon_key is null or (
      char_length(icon_key) between 1 and 80
      and icon_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    )
  ),
  constraint amenities_description_length check (
    description is null or char_length(description) <= 500
  ),
  constraint amenities_sort_order check (sort_order between 0 and 100000)
);

create table public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (property_id, amenity_id)
);

create table public.room_amenities (
  room_type_id uuid not null references public.room_types(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  primary key (room_type_id, amenity_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  room_type_id uuid references public.room_types(id) on delete cascade,
  media_type text not null,
  evidence_type text not null,
  url text not null,
  thumbnail_url text,
  caption text,
  alt_text text not null,
  sort_order integer not null default 0,
  captured_at timestamptz,
  captured_by_user_id uuid references auth.users(id) on delete set null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  compass_heading_deg numeric(6, 2),
  horizontal_fov_deg numeric(6, 2),
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint media_assets_one_owner check (num_nonnulls(property_id, room_type_id) = 1),
  constraint media_assets_type check (media_type in ('photo', 'video', 'panorama_360')),
  constraint media_assets_evidence_type check (
    evidence_type in (
      'property', 'room', 'bathroom', 'view_from_room', 'view_from_bed',
      'balcony', 'road_access', 'parking', 'food', 'sunrise', 'verification', 'other'
    )
  ),
  constraint media_assets_url_https check (
    char_length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'
  ),
  constraint media_assets_thumbnail_https check (
    thumbnail_url is null
    or (char_length(thumbnail_url) <= 2048 and thumbnail_url ~ '^https://[^[:space:]]+$')
  ),
  constraint media_assets_caption_length check (caption is null or char_length(caption) <= 500),
  constraint media_assets_alt_text_length check (char_length(alt_text) between 2 and 300),
  constraint media_assets_sort_order check (sort_order between 0 and 100000),
  constraint media_assets_coordinate_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint media_assets_latitude_bounds check (latitude is null or latitude between -90 and 90),
  constraint media_assets_longitude_bounds check (longitude is null or longitude between -180 and 180),
  constraint media_assets_heading_bounds check (
    compass_heading_deg is null or (compass_heading_deg >= 0 and compass_heading_deg < 360)
  ),
  constraint media_assets_fov_bounds check (
    horizontal_fov_deg is null or (horizontal_fov_deg > 0 and horizontal_fov_deg <= 360)
  )
);

create or replace function public.set_media_review_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_verified then
      new.verified_at = now();
      new.verified_by_user_id = auth.uid();
    else
      new.verified_at = null;
      new.verified_by_user_id = null;
    end if;
  elsif new.is_verified and not old.is_verified then
    new.verified_at = now();
    new.verified_by_user_id = auth.uid();
  elsif not new.is_verified then
    new.verified_at = null;
    new.verified_by_user_id = null;
  else
    new.verified_at = old.verified_at;
    new.verified_by_user_id = old.verified_by_user_id;
  end if;

  return new;
end;
$$;

revoke all on function public.set_media_review_audit() from public;
grant execute on function public.set_media_review_audit() to authenticated;

create or replace function public.is_property_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.properties p
    where p.id = target_id
      and p.is_active
      and p.publish_status = 'published'
      and p.archived_at is null
  )
$$;

create or replace function public.is_room_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.room_types r
    join public.properties p on p.id = r.property_id
    where r.id = target_id
      and r.is_active
      and r.publish_status = 'published'
      and p.is_active
      and p.publish_status = 'published'
      and p.archived_at is null
  )
$$;

create or replace function public.is_amenity_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.amenities a
    where a.id = target_id and a.is_active
  )
$$;

revoke all on function public.is_property_public(uuid) from public;
revoke all on function public.is_room_public(uuid) from public;
revoke all on function public.is_amenity_public(uuid) from public;
grant execute on function public.is_property_public(uuid) to anon, authenticated;
grant execute on function public.is_room_public(uuid) to anon, authenticated;
grant execute on function public.is_amenity_public(uuid) to anon, authenticated;

create or replace function public.set_property_amenities(
  target_property_id uuid,
  selected_amenity_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Not authorized';
  end if;

  delete from public.property_amenities
  where property_id = target_property_id;

  insert into public.property_amenities (property_id, amenity_id, created_by)
  select target_property_id, amenity_id, auth.uid()
  from unnest(coalesce(selected_amenity_ids, array[]::uuid[])) as amenity_id
  on conflict do nothing;
end;
$$;

create or replace function public.set_room_amenities(
  target_room_type_id uuid,
  selected_amenity_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Not authorized';
  end if;

  delete from public.room_amenities
  where room_type_id = target_room_type_id;

  insert into public.room_amenities (room_type_id, amenity_id, created_by)
  select target_room_type_id, amenity_id, auth.uid()
  from unnest(coalesce(selected_amenity_ids, array[]::uuid[])) as amenity_id
  on conflict do nothing;
end;
$$;

revoke all on function public.set_property_amenities(uuid, uuid[]) from public;
revoke all on function public.set_room_amenities(uuid, uuid[]) from public;
grant execute on function public.set_property_amenities(uuid, uuid[]) to authenticated;
grant execute on function public.set_room_amenities(uuid, uuid[]) to authenticated;

create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();
create trigger properties_set_updated_by
before insert or update on public.properties
for each row execute function public.set_updated_by();

create trigger room_types_set_updated_at
before update on public.room_types
for each row execute function public.set_updated_at();
create trigger room_types_set_updated_by
before insert or update on public.room_types
for each row execute function public.set_updated_by();

create trigger amenities_set_updated_at
before update on public.amenities
for each row execute function public.set_updated_at();
create trigger amenities_set_updated_by
before insert or update on public.amenities
for each row execute function public.set_updated_by();

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();
create trigger media_assets_set_updated_by
before insert or update on public.media_assets
for each row execute function public.set_updated_by();
create trigger media_assets_set_review_audit
before insert or update of is_verified, verified_at, verified_by_user_id on public.media_assets
for each row execute function public.set_media_review_audit();

create index properties_public_index
  on public.properties (is_featured desc, name)
  where is_active and publish_status = 'published' and archived_at is null;
create index properties_area_index on public.properties (area_name);
create index room_types_property_index on public.room_types (property_id, name);
create index room_types_public_index
  on public.room_types (property_id, name)
  where is_active and publish_status = 'published';
create index amenities_catalog_index on public.amenities (category, sort_order, name);
create index property_amenities_amenity_index on public.property_amenities (amenity_id);
create index room_amenities_amenity_index on public.room_amenities (amenity_id);
create index media_assets_property_index
  on public.media_assets (property_id, sort_order)
  where property_id is not null;
create index media_assets_room_index
  on public.media_assets (room_type_id, sort_order)
  where room_type_id is not null;
create index media_assets_public_index
  on public.media_assets (is_verified, media_type, evidence_type, sort_order);

alter table public.properties enable row level security;
alter table public.room_types enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.room_amenities enable row level security;
alter table public.media_assets enable row level security;

revoke all on table public.properties from anon, authenticated;
revoke all on table public.room_types from anon, authenticated;
revoke all on table public.amenities from anon, authenticated;
revoke all on table public.property_amenities from anon, authenticated;
revoke all on table public.room_amenities from anon, authenticated;
revoke all on table public.media_assets from anon, authenticated;

grant select (
  id, slug, name, property_type, short_description, description, area_name, address,
  latitude, longitude, altitude_m, google_maps_url, public_phone, public_zalo_url,
  check_in_time, check_out_time, road_access_grade, car_access, motorbike_access,
  parking, restaurant, breakfast, bbq, wifi, is_featured, updated_at
) on table public.properties to anon;

grant select (
  id, property_id, slug, name, short_description, description, capacity_adults,
  capacity_children, max_guests, bed_type, bed_count, bathroom_type, quantity,
  size_m2, floor_label, has_private_balcony, view_type, updated_at
) on table public.room_types to anon;

grant select (
  id, slug, name, category, icon_key, description, sort_order
) on table public.amenities to anon;
grant select (property_id, amenity_id) on table public.property_amenities to anon;
grant select (room_type_id, amenity_id) on table public.room_amenities to anon;

grant select (
  id, property_id, room_type_id, media_type, evidence_type, url, thumbnail_url,
  caption, alt_text, sort_order, captured_at, latitude, longitude,
  compass_heading_deg, horizontal_fov_deg, is_verified, verified_at, updated_at
) on table public.media_assets to anon;

grant select, insert, update on table public.properties to authenticated;
grant select, insert, update on table public.room_types to authenticated;
grant select, insert, update on table public.amenities to authenticated;
grant select, insert, delete on table public.property_amenities to authenticated;
grant select, insert, delete on table public.room_amenities to authenticated;
grant select, insert, update on table public.media_assets to authenticated;

create policy "public reads published properties"
on public.properties for select to anon
using ((select public.is_property_public(id)));
create policy "staff manages properties"
on public.properties for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads published rooms"
on public.room_types for select to anon
using ((select public.is_room_public(id)));
create policy "staff manages rooms"
on public.room_types for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads active amenities"
on public.amenities for select to anon
using ((select public.is_amenity_public(id)));
create policy "staff manages amenities"
on public.amenities for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads published property amenities"
on public.property_amenities for select to anon
using (
  (select public.is_property_public(property_id))
  and (select public.is_amenity_public(amenity_id))
);
create policy "staff manages property amenities"
on public.property_amenities for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads published room amenities"
on public.room_amenities for select to anon
using (
  (select public.is_room_public(room_type_id))
  and (select public.is_amenity_public(amenity_id))
);
create policy "staff manages room amenities"
on public.room_amenities for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads approved media"
on public.media_assets for select to anon
using (
  is_verified
  and (
    (property_id is not null and (select public.is_property_public(property_id)))
    or (room_type_id is not null and (select public.is_room_public(room_type_id)))
  )
);
create policy "staff manages media"
on public.media_assets for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

comment on table public.properties is
  'Phase 2 lodging/business entities. Properties are not generic places.';
comment on table public.room_types is
  'Physical room-type facts and quantity; quantity is not date availability.';
comment on table public.media_assets is
  'Evidence-aware assets. is_verified means asset review/public approval in Phase 2, not the future Stay Verified Standard.';
