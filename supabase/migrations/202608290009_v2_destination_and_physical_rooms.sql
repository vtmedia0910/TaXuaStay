-- Tà Xùa Stay Master Plan V2 Phase 1: destination and exact physical-room identity.
-- This migration is additive. It seeds only the Tà Xùa destination identity and
-- intentionally creates no physical rooms, media, verification, pricing, or inventory data.

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  province text,
  country_code text not null default 'VN',
  timezone text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  altitude_reference_m integer,
  description text,
  is_active boolean not null default false,
  publish_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint destinations_slug_format check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint destinations_name_length check (char_length(name) between 2 and 160),
  constraint destinations_short_name_length check (
    short_name is null or char_length(short_name) between 1 and 80
  ),
  constraint destinations_province_length check (
    province is null or char_length(province) between 2 and 120
  ),
  constraint destinations_country_code check (
    country_code ~ '^[A-Z]{2}$'
  ),
  constraint destinations_timezone_required check (
    char_length(btrim(timezone)) between 1 and 100
  ),
  constraint destinations_coordinate_pair check (
    (latitude is null and longitude is null)
    or (latitude is not null and longitude is not null)
  ),
  constraint destinations_latitude_bounds check (latitude is null or latitude between -90 and 90),
  constraint destinations_longitude_bounds check (longitude is null or longitude between -180 and 180),
  constraint destinations_altitude_bounds check (
    altitude_reference_m is null or altitude_reference_m between 0 and 9000
  ),
  constraint destinations_description_length check (
    description is null or char_length(description) <= 10000
  ),
  constraint destinations_publish_status check (
    publish_status in ('draft', 'published', 'archived')
  ),
  constraint destinations_published_active check (
    publish_status <> 'published' or is_active
  ),
  constraint destinations_archived_inactive check (
    publish_status <> 'archived' or not is_active
  )
);

insert into public.destinations (
  slug, name, country_code, timezone, is_active, publish_status
) values (
  'ta-xua', 'Tà Xùa', 'VN', 'Asia/Ho_Chi_Minh', true, 'published'
);

alter table public.properties
  add column destination_id uuid references public.destinations(id) on delete restrict;

-- Production was inspected before this migration was authored and contained no
-- property rows. The update also safely assigns any pre-existing local/preview
-- Stay properties to the only established destination without fabricating facts.
update public.properties
set destination_id = (
  select id from public.destinations where slug = 'ta-xua'
)
where destination_id is null;

alter table public.properties
  alter column destination_id set not null;

alter table public.room_types
  add constraint room_types_id_property_unique unique (id, property_id);

create table public.physical_rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  room_type_id uuid not null,
  room_code text not null,
  display_name text,
  floor_label text,
  unit_label text,
  position_notes text,
  exact_room_bookable boolean not null default false,
  is_active boolean not null default true,
  publish_status text not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint physical_rooms_room_type_property_fk
    foreign key (room_type_id, property_id)
    references public.room_types(id, property_id)
    on delete restrict,
  constraint physical_rooms_property_code_unique unique (property_id, room_code),
  constraint physical_rooms_code_format check (
    char_length(room_code) between 2 and 80
    and room_code = upper(room_code)
    and room_code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
  ),
  constraint physical_rooms_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 160
  ),
  constraint physical_rooms_floor_label_length check (
    floor_label is null or char_length(floor_label) <= 80
  ),
  constraint physical_rooms_unit_label_length check (
    unit_label is null or char_length(unit_label) <= 80
  ),
  constraint physical_rooms_position_notes_length check (
    position_notes is null or char_length(position_notes) <= 3000
  ),
  constraint physical_rooms_publish_status check (
    publish_status in ('draft', 'published', 'archived')
  ),
  constraint physical_rooms_published_active check (
    publish_status <> 'published' or (is_active and archived_at is null)
  ),
  constraint physical_rooms_archived_state check (
    publish_status <> 'archived' or (not is_active and archived_at is not null)
  )
);

create or replace function public.set_physical_room_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.property_id is distinct from old.property_id
    or new.room_code is distinct from old.room_code
  ) then
    raise exception 'Physical room property and room code are immutable';
  end if;

  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function public.set_physical_room_audit() from public;

create trigger destinations_set_updated_at
before update on public.destinations
for each row execute function public.set_updated_at();
create trigger destinations_set_updated_by
before insert or update on public.destinations
for each row execute function public.set_updated_by();

create trigger physical_rooms_set_audit
before insert or update on public.physical_rooms
for each row execute function public.set_physical_room_audit();

create index properties_destination_index on public.properties (destination_id);
create index physical_rooms_property_index on public.physical_rooms (property_id, room_code);
create index physical_rooms_room_type_index on public.physical_rooms (room_type_id, room_code);
create index physical_rooms_public_index
  on public.physical_rooms (room_type_id, room_code)
  where is_active and publish_status = 'published' and archived_at is null;

create or replace function public.is_destination_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.destinations as destination
    where destination.id = target_id
      and destination.is_active
      and destination.publish_status = 'published'
  );
$$;

create or replace function public.is_property_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties as property
    where property.id = target_id
      and property.is_active
      and property.publish_status = 'published'
      and property.archived_at is null
      and public.is_destination_public(property.destination_id)
  );
$$;

create or replace function public.is_physical_room_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.physical_rooms as physical_room
    where physical_room.id = target_id
      and physical_room.is_active
      and physical_room.publish_status = 'published'
      and physical_room.archived_at is null
      and public.is_property_public(physical_room.property_id)
      and public.is_room_public(physical_room.room_type_id)
  );
$$;

revoke all on function public.is_destination_public(uuid) from public;
revoke all on function public.is_property_public(uuid) from public;
revoke all on function public.is_physical_room_public(uuid) from public;
grant execute on function public.is_destination_public(uuid) to anon, authenticated;
grant execute on function public.is_property_public(uuid) to anon, authenticated;
grant execute on function public.is_physical_room_public(uuid) to anon, authenticated;

alter table public.destinations enable row level security;
alter table public.physical_rooms enable row level security;

revoke all on table public.destinations from anon, authenticated;
revoke all on table public.physical_rooms from anon, authenticated;

grant select (
  id, slug, name, short_name, province, country_code, timezone, latitude,
  longitude, altitude_reference_m, description, updated_at
) on table public.destinations to anon;

grant select (
  id, property_id, room_type_id, room_code, display_name, floor_label,
  unit_label, exact_room_bookable, updated_at
) on table public.physical_rooms to anon;

grant select, insert, update on table public.destinations to authenticated;
grant select, insert, update on table public.physical_rooms to authenticated;

create policy "public reads published destinations"
on public.destinations for select to anon
using ((select public.is_destination_public(id)));
create policy "staff manages destinations"
on public.destinations for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads published physical rooms"
on public.physical_rooms for select to anon
using ((select public.is_physical_room_public(id)));
create policy "staff manages physical rooms"
on public.physical_rooms for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

grant select (destination_id) on table public.properties to anon;

-- Keep the Phase 2 property + amenity save atomic while persisting destination ownership.
create or replace function public.save_property_with_amenities(
  target_property_id uuid,
  property_values jsonb,
  selected_amenity_ids uuid[]
)
returns table(property_id uuid, property_slug text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_property_id uuid;
  saved_property_slug text;
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Not authorized';
  end if;

  if property_values is null or jsonb_typeof(property_values) <> 'object' then
    raise exception 'Property values must be a JSON object';
  end if;

  if target_property_id is null then
    with input as (
      select *
      from jsonb_to_record(property_values) as input_record(
        destination_id uuid,
        slug text,
        name text,
        property_type text,
        short_description text,
        description text,
        area_name text,
        address text,
        latitude numeric,
        longitude numeric,
        altitude_m integer,
        google_maps_url text,
        public_phone text,
        public_zalo_url text,
        check_in_time time,
        check_out_time time,
        road_access_grade text,
        car_access text,
        motorbike_access text,
        parking text,
        restaurant boolean,
        breakfast boolean,
        bbq boolean,
        wifi boolean,
        is_featured boolean,
        is_active boolean,
        publish_status text
      )
    )
    insert into public.properties (
      destination_id, slug, name, property_type, short_description, description,
      area_name, address, latitude, longitude, altitude_m, google_maps_url,
      public_phone, public_zalo_url, check_in_time, check_out_time,
      road_access_grade, car_access, motorbike_access, parking, restaurant,
      breakfast, bbq, wifi, is_featured, is_active, publish_status, archived_at
    )
    select
      destination_id, slug, name, property_type, short_description, description,
      area_name, address, latitude, longitude, altitude_m, google_maps_url,
      public_phone, public_zalo_url, check_in_time, check_out_time,
      road_access_grade, car_access, motorbike_access, parking, restaurant,
      breakfast, bbq, wifi, is_featured,
      case when publish_status = 'archived' then false else is_active end,
      publish_status,
      case when publish_status = 'archived' then now() else null end
    from input
    returning id, slug into saved_property_id, saved_property_slug;
  else
    with input as (
      select *
      from jsonb_to_record(property_values) as input_record(
        destination_id uuid,
        slug text,
        name text,
        property_type text,
        short_description text,
        description text,
        area_name text,
        address text,
        latitude numeric,
        longitude numeric,
        altitude_m integer,
        google_maps_url text,
        public_phone text,
        public_zalo_url text,
        check_in_time time,
        check_out_time time,
        road_access_grade text,
        car_access text,
        motorbike_access text,
        parking text,
        restaurant boolean,
        breakfast boolean,
        bbq boolean,
        wifi boolean,
        is_featured boolean,
        is_active boolean,
        publish_status text
      )
    )
    update public.properties as property
    set
      destination_id = input.destination_id,
      slug = input.slug,
      name = input.name,
      property_type = input.property_type,
      short_description = input.short_description,
      description = input.description,
      area_name = input.area_name,
      address = input.address,
      latitude = input.latitude,
      longitude = input.longitude,
      altitude_m = input.altitude_m,
      google_maps_url = input.google_maps_url,
      public_phone = input.public_phone,
      public_zalo_url = input.public_zalo_url,
      check_in_time = input.check_in_time,
      check_out_time = input.check_out_time,
      road_access_grade = input.road_access_grade,
      car_access = input.car_access,
      motorbike_access = input.motorbike_access,
      parking = input.parking,
      restaurant = input.restaurant,
      breakfast = input.breakfast,
      bbq = input.bbq,
      wifi = input.wifi,
      is_featured = input.is_featured,
      is_active = case when input.publish_status = 'archived' then false else input.is_active end,
      publish_status = input.publish_status,
      archived_at = case
        when input.publish_status = 'archived' then coalesce(property.archived_at, now())
        else null
      end
    from input
    where property.id = target_property_id
    returning property.id, property.slug into saved_property_id, saved_property_slug;

    if not found then
      raise exception 'Property not found';
    end if;
  end if;

  perform public.set_property_amenities(saved_property_id, selected_amenity_ids);
  return query select saved_property_id, saved_property_slug;
end;
$$;

revoke all on function public.save_property_with_amenities(uuid, jsonb, uuid[]) from public;
grant execute on function public.save_property_with_amenities(uuid, jsonb, uuid[]) to authenticated;

alter table public.media_assets
  add column physical_room_id uuid references public.physical_rooms(id) on delete cascade;

alter table public.media_assets
  drop constraint media_assets_one_owner,
  add constraint media_assets_one_owner check (
    num_nonnulls(property_id, room_type_id, physical_room_id) = 1
  );

create index media_assets_physical_room_index
  on public.media_assets (physical_room_id, sort_order)
  where physical_room_id is not null;

grant select (physical_room_id) on table public.media_assets to anon;

drop policy "public reads approved media" on public.media_assets;
create policy "public reads approved media"
on public.media_assets for select to anon
using (
  is_verified
  and (
    (property_id is not null and (select public.is_property_public(property_id)))
    or (room_type_id is not null and (select public.is_room_public(room_type_id)))
    or (
      physical_room_id is not null
      and (select public.is_physical_room_public(physical_room_id))
    )
  )
);

alter table public.verification_records
  add column physical_room_id uuid references public.physical_rooms(id) on delete restrict;

alter table public.verification_records
  drop constraint verification_records_target,
  add constraint verification_records_target check (
    (
      verification_type in ('property_identity', 'property_location', 'road_access')
      and property_id is not null
      and room_type_id is null
      and physical_room_id is null
    )
    or
    (
      verification_type in ('room', 'cloud_view', 'media_360')
      and property_id is null
      and num_nonnulls(room_type_id, physical_room_id) = 1
    )
  );

create unique index verification_records_current_physical_room_type
  on public.verification_records (verification_type, physical_room_id)
  where status = 'verified' and physical_room_id is not null;

create index verification_records_physical_room_history
  on public.verification_records (physical_room_id, verification_type, created_at desc)
  where physical_room_id is not null;

grant select (physical_room_id) on table public.verification_records to anon;

create or replace function public.set_verification_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  lifecycle_now timestamptz := now();
  old_was_current boolean := false;
  starts_fresh_cycle boolean := false;
  stale_cycle_resubmitted boolean := false;
begin
  if tg_op = 'UPDATE' and (
    new.verification_type is distinct from old.verification_type
    or new.property_id is distinct from old.property_id
    or new.room_type_id is distinct from old.room_type_id
    or new.physical_room_id is distinct from old.physical_room_id
  ) then
    raise exception 'Verification type and target are immutable';
  end if;

  new.updated_at := lifecycle_now;
  new.updated_by_user_id := auth.uid();

  if tg_op = 'INSERT' then
    new.created_by_user_id := coalesce(new.created_by_user_id, auth.uid());
  end if;

  if new.status = 'verified' then
    if tg_op = 'UPDATE' then
      old_was_current := old.status = 'verified'
        and old.verified_at is not null
        and old.verified_at <= lifecycle_now
        and old.expires_at > lifecycle_now;
      stale_cycle_resubmitted := new.verified_at is not distinct from old.verified_at
        and new.expires_at is not distinct from old.expires_at;
    end if;

    starts_fresh_cycle := tg_op = 'INSERT' or not old_was_current;

    if tg_op = 'UPDATE'
      and starts_fresh_cycle
      and (
        (new.verified_at is null and new.expires_at is null)
        or stale_cycle_resubmitted
      )
    then
      new.verified_at := lifecycle_now;
      new.expires_at := lifecycle_now
        + public.verification_freshness_interval(new.verification_type);
    elsif tg_op = 'UPDATE' and old_was_current then
      new.verified_at := coalesce(new.verified_at, old.verified_at, lifecycle_now);
      new.expires_at := coalesce(
        new.expires_at,
        old.expires_at,
        new.verified_at + public.verification_freshness_interval(new.verification_type)
      );
    else
      new.verified_at := coalesce(new.verified_at, lifecycle_now);
      new.expires_at := coalesce(
        new.expires_at,
        new.verified_at + public.verification_freshness_interval(new.verification_type)
      );
    end if;

    if new.verified_at is null or new.verified_at > lifecycle_now then
      raise exception 'Verified timestamp cannot be in the future';
    end if;

    if new.expires_at is null or new.expires_at <= lifecycle_now then
      raise exception 'Verified records require a future expiry';
    end if;

    if tg_op = 'INSERT' then
      new.verified_by_user_id := auth.uid();
    elsif starts_fresh_cycle or new.verified_at is distinct from old.verified_at then
      new.verified_by_user_id := auth.uid();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.set_verification_audit() from public;

create or replace function public.validate_verification_evidence_target()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  record_type text;
  record_property_id uuid;
  record_room_type_id uuid;
  record_physical_room_id uuid;
  asset_property_id uuid;
  asset_room_type_id uuid;
  asset_physical_room_id uuid;
  asset_media_type text;
  asset_evidence_type text;
  asset_is_verified boolean;
begin
  select verification_type, property_id, room_type_id, physical_room_id
    into record_type, record_property_id, record_room_type_id, record_physical_room_id
  from public.verification_records
  where id = new.verification_id;

  if not found then
    raise exception 'Verification record not found';
  end if;

  select property_id, room_type_id, physical_room_id, media_type, evidence_type, is_verified
    into asset_property_id, asset_room_type_id, asset_physical_room_id,
      asset_media_type, asset_evidence_type, asset_is_verified
  from public.media_assets
  where id = new.media_asset_id;

  if not found then
    raise exception 'Media asset not found';
  end if;

  if new.public_visible and not asset_is_verified then
    raise exception 'Public verification evidence must be approved media';
  end if;

  if record_type in ('room', 'cloud_view', 'media_360') then
    if record_physical_room_id is not null then
      if asset_physical_room_id is distinct from record_physical_room_id
        or asset_property_id is not null
        or asset_room_type_id is not null
      then
        raise exception 'Physical-room verification evidence must belong to the exact physical room';
      end if;
    elsif asset_room_type_id is distinct from record_room_type_id
      or asset_property_id is not null
      or asset_physical_room_id is not null
    then
      raise exception 'Room verification evidence must belong to the exact room type';
    end if;
  elsif asset_property_id is distinct from record_property_id
    or asset_room_type_id is not null
    or asset_physical_room_id is not null
  then
    raise exception 'Property verification evidence must belong to the exact property';
  end if;

  if record_type = 'cloud_view'
    and asset_evidence_type not in (
      'view_from_room', 'view_from_bed', 'balcony', 'sunrise', 'verification'
    )
  then
    raise exception 'Cloud View evidence must show the exact room view position';
  end if;

  if record_type = 'road_access'
    and asset_evidence_type not in ('road_access', 'parking', 'verification')
  then
    raise exception 'Road verification evidence must show road or parking access';
  end if;

  if record_type = 'media_360' and asset_media_type <> 'panorama_360' then
    raise exception '360 verification requires panorama_360 media';
  end if;

  if new.evidence_role in ('room_interior_360', 'view_position_360')
    and asset_media_type <> 'panorama_360'
  then
    raise exception '360 evidence roles require panorama_360 media';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_verification_evidence_target() from public;

create or replace function public.is_verification_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.verification_records as record
    where record.id = target_id
      and record.status = 'verified'
      and record.verified_at is not null
      and record.verified_at <= now()
      and record.expires_at > now()
      and (
        (record.property_id is not null and public.is_property_public(record.property_id))
        or (record.room_type_id is not null and public.is_room_public(record.room_type_id))
        or (
          record.physical_room_id is not null
          and public.is_physical_room_public(record.physical_room_id)
        )
      )
      and exists (
        select 1
        from public.verification_evidence as evidence
        join public.media_assets as media on media.id = evidence.media_asset_id
        where evidence.verification_id = record.id
          and evidence.public_visible
          and media.is_verified
          and (
            (
              record.property_id is not null
              and media.property_id = record.property_id
              and media.room_type_id is null
              and media.physical_room_id is null
            )
            or (
              record.room_type_id is not null
              and media.property_id is null
              and media.room_type_id = record.room_type_id
              and media.physical_room_id is null
            )
            or (
              record.physical_room_id is not null
              and media.property_id is null
              and media.room_type_id is null
              and media.physical_room_id = record.physical_room_id
            )
          )
      )
  );
$$;

create or replace function public.is_exact_room_verified(target_physical_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.verification_records as record
    where record.verification_type = 'room'
      and record.physical_room_id = target_physical_room_id
      and public.is_verification_public(record.id)
  );
$$;

revoke all on function public.is_verification_public(uuid) from public;
revoke all on function public.is_exact_room_verified(uuid) from public;
grant execute on function public.is_verification_public(uuid) to anon, authenticated;
grant execute on function public.is_exact_room_verified(uuid) to anon, authenticated;

create or replace view public.public_verification_badges
with (security_invoker = true, security_barrier = true)
as
select
  id as verification_id,
  verification_type,
  property_id,
  room_type_id,
  verified_at,
  expires_at,
  physical_room_id
from public.verification_records
where public.is_verification_public(id);

create or replace view public.public_cloud_view_verifications
with (security_invoker = true, security_barrier = true)
as
select
  record.id as verification_id,
  record.room_type_id,
  cloud.total_points,
  cloud.score_10,
  cloud.view_from_bed,
  cloud.viewing_position,
  cloud.view_direction,
  cloud.horizontal_view_angle_deg,
  cloud.sunrise_orientation,
  cloud.obstruction_notes,
  cloud.cloud_view_notes,
  record.verified_at,
  record.expires_at,
  record.physical_room_id
from public.verification_records as record
join public.cloud_view_verifications as cloud
  on cloud.verification_id = record.id
where record.verification_type = 'cloud_view'
  and public.is_verification_public(record.id);

create or replace view public.public_verification_evidence
with (security_invoker = true, security_barrier = true)
as
select
  evidence.verification_id,
  evidence.evidence_role,
  media.id as media_asset_id,
  media.property_id,
  media.room_type_id,
  media.media_type,
  media.evidence_type,
  media.url,
  media.thumbnail_url,
  media.caption,
  media.alt_text,
  media.captured_at,
  media.compass_heading_deg,
  media.horizontal_fov_deg,
  media.physical_room_id
from public.verification_evidence as evidence
join public.media_assets as media on media.id = evidence.media_asset_id
where evidence.public_visible
  and media.is_verified
  and public.is_verification_public(evidence.verification_id);

create or replace view public.public_verified_physical_rooms
with (security_invoker = true, security_barrier = true)
as
select
  physical_room.id as physical_room_id,
  physical_room.property_id,
  physical_room.room_type_id,
  physical_room.room_code,
  physical_room.display_name,
  physical_room.floor_label,
  physical_room.unit_label,
  physical_room.exact_room_bookable,
  room_record.id as room_verification_id,
  room_record.verified_at,
  room_record.expires_at,
  exists (
    select 1
    from public.verification_records as cloud_record
    where cloud_record.verification_type = 'cloud_view'
      and cloud_record.physical_room_id = physical_room.id
      and public.is_verification_public(cloud_record.id)
  ) as cloud_view_verified
from public.physical_rooms as physical_room
join public.verification_records as room_record
  on room_record.physical_room_id = physical_room.id
  and room_record.verification_type = 'room'
where public.is_physical_room_public(physical_room.id)
  and public.is_verification_public(room_record.id);

revoke all on table public.public_verified_physical_rooms from public;
grant select on table public.public_verified_physical_rooms to anon, authenticated;

-- New overload: exact-room support without removing the legacy room-type RPC.
create or replace function public.save_verification_core(
  target_verification_id uuid,
  target_verification_type text,
  target_property_id uuid,
  target_room_type_id uuid,
  target_physical_room_id uuid,
  target_status text,
  target_method text,
  target_notes text,
  target_verified_at timestamptz,
  target_expires_at timestamptz,
  selected_media_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Not authorized';
  end if;

  if target_status = 'verified' then
    update public.verification_records
    set status = 'expired'
    where status = 'verified'
      and verification_type = target_verification_type
      and property_id is not distinct from target_property_id
      and room_type_id is not distinct from target_room_type_id
      and physical_room_id is not distinct from target_physical_room_id
      and id is distinct from target_verification_id;
  end if;

  if target_verification_id is null then
    insert into public.verification_records (
      verification_type, status, property_id, room_type_id, physical_room_id,
      method, notes, verified_at, expires_at
    ) values (
      target_verification_type, target_status, target_property_id,
      target_room_type_id, target_physical_room_id, target_method, target_notes,
      target_verified_at, target_expires_at
    )
    returning id into saved_id;
  else
    update public.verification_records
    set
      verification_type = target_verification_type,
      status = target_status,
      property_id = target_property_id,
      room_type_id = target_room_type_id,
      physical_room_id = target_physical_room_id,
      method = target_method,
      notes = target_notes,
      verified_at = target_verified_at,
      expires_at = target_expires_at
    where id = target_verification_id
    returning id into saved_id;

    if not found then
      raise exception 'Verification record not found';
    end if;
  end if;

  perform public.set_verification_evidence(saved_id, selected_media_ids);
  return saved_id;
end;
$$;

create or replace function public.save_basic_verification(
  target_verification_id uuid,
  target_verification_type text,
  target_property_id uuid,
  target_room_type_id uuid,
  target_physical_room_id uuid,
  target_status text,
  target_method text,
  target_notes text,
  target_verified_at timestamptz,
  target_expires_at timestamptz,
  selected_media_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if target_verification_type not in (
    'property_identity', 'property_location', 'room', 'media_360'
  ) then
    raise exception 'Unsupported basic verification type';
  end if;

  saved_id := public.save_verification_core(
    target_verification_id,
    target_verification_type,
    target_property_id,
    target_room_type_id,
    target_physical_room_id,
    target_status,
    target_method,
    target_notes,
    target_verified_at,
    target_expires_at,
    selected_media_ids
  );

  return saved_id;
end;
$$;

create or replace function public.save_cloud_view_verification(
  target_verification_id uuid,
  target_room_type_id uuid,
  target_physical_room_id uuid,
  target_status text,
  target_method text,
  target_notes text,
  target_verified_at timestamptz,
  target_expires_at timestamptz,
  selected_media_ids uuid[],
  target_direct_valley_points smallint,
  target_view_width_points smallint,
  target_obstruction_points smallint,
  target_view_from_bed_points smallint,
  target_private_position_points smallint,
  target_orientation_points smallint,
  target_evidence_points smallint,
  target_view_from_bed text,
  target_viewing_position text,
  target_view_direction text,
  target_horizontal_view_angle_deg numeric,
  target_sunrise_orientation text,
  target_obstruction_notes text,
  target_cloud_view_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  saved_id := public.save_verification_core(
    target_verification_id,
    'cloud_view',
    null,
    target_room_type_id,
    target_physical_room_id,
    target_status,
    target_method,
    target_notes,
    target_verified_at,
    target_expires_at,
    selected_media_ids
  );

  insert into public.cloud_view_verifications (
    verification_id, direct_valley_points, view_width_points,
    obstruction_points, view_from_bed_points, private_position_points,
    orientation_points, evidence_points, view_from_bed, viewing_position,
    view_direction, horizontal_view_angle_deg, sunrise_orientation,
    obstruction_notes, cloud_view_notes
  ) values (
    saved_id, target_direct_valley_points, target_view_width_points,
    target_obstruction_points, target_view_from_bed_points,
    target_private_position_points, target_orientation_points,
    target_evidence_points, target_view_from_bed, target_viewing_position,
    target_view_direction, target_horizontal_view_angle_deg,
    target_sunrise_orientation, target_obstruction_notes,
    target_cloud_view_notes
  )
  on conflict (verification_id) do update set
    direct_valley_points = excluded.direct_valley_points,
    view_width_points = excluded.view_width_points,
    obstruction_points = excluded.obstruction_points,
    view_from_bed_points = excluded.view_from_bed_points,
    private_position_points = excluded.private_position_points,
    orientation_points = excluded.orientation_points,
    evidence_points = excluded.evidence_points,
    view_from_bed = excluded.view_from_bed,
    viewing_position = excluded.viewing_position,
    view_direction = excluded.view_direction,
    horizontal_view_angle_deg = excluded.horizontal_view_angle_deg,
    sunrise_orientation = excluded.sunrise_orientation,
    obstruction_notes = excluded.obstruction_notes,
    cloud_view_notes = excluded.cloud_view_notes;

  return saved_id;
end;
$$;

revoke all on function public.save_verification_core(
  uuid, text, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) from public;
revoke all on function public.save_basic_verification(
  uuid, text, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) from public;
revoke all on function public.save_cloud_view_verification(
  uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[],
  smallint, smallint, smallint, smallint, smallint, smallint, smallint,
  text, text, text, numeric, text, text, text
) from public;

grant execute on function public.save_basic_verification(
  uuid, text, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) to authenticated;
grant execute on function public.save_cloud_view_verification(
  uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[],
  smallint, smallint, smallint, smallint, smallint, smallint, smallint,
  text, text, text, numeric, text, text, text
) to authenticated;

comment on table public.destinations is
  'V2 destination identity and publication lifecycle. The initial Tà Xùa row contains no fabricated geo facts.';
comment on column public.properties.destination_id is
  'Required V2 destination ownership. area_name remains the sub-area within this destination.';
comment on table public.physical_rooms is
  'Stable real-world room/unit identity. Rows are created only from known room identities, never from pooled quantity.';
comment on column public.physical_rooms.room_code is
  'Immutable uppercase business identifier, unique within one property.';
comment on column public.physical_rooms.position_notes is
  'Internal-only position notes; excluded from anonymous grants and public DTOs.';
comment on column public.physical_rooms.exact_room_bookable is
  'Indicates the business may accept an exact-room request; it is not availability, assignment, guarantee, or verification.';
comment on column public.media_assets.physical_room_id is
  'Optional exact physical-room owner. Exactly one of property_id, room_type_id, or physical_room_id must be set.';
comment on column public.verification_records.physical_room_id is
  'Optional exact physical-room target for room, cloud_view, and media_360 verification types.';
comment on function public.is_exact_room_verified(uuid) is
  'True only for a public physical room with a current exact-target room verification and approved exact-room evidence.';
