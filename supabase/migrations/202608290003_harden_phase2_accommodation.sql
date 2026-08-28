-- Tà Xùa Stay Phase 2 corrective migration.
-- Keep 202608290002 immutable: this migration adds explicit access certainty,
-- removes physical quantity from anonymous reads, and makes content + amenity
-- saves atomic through security-invoker RPCs.

alter table public.properties
  alter column car_access drop default,
  alter column motorbike_access drop default,
  alter column parking drop default;

-- Existing true values are known affirmative facts. Existing false values cannot
-- be distinguished safely, so preserve them as unknown for owner review rather
-- than fabricating an explicit negative.
alter table public.properties
  alter column car_access type text
    using (case when car_access then 'yes' else 'unknown' end);
alter table public.properties
  alter column motorbike_access type text
    using (case when motorbike_access then 'yes' else 'unknown' end);
alter table public.properties
  alter column parking type text
    using (case when parking then 'yes' else 'unknown' end);

alter table public.properties
  alter column car_access set default 'unknown',
  alter column motorbike_access set default 'unknown',
  alter column parking set default 'unknown',
  add constraint properties_car_access_certainty
    check (car_access in ('unknown', 'yes', 'no')),
  add constraint properties_motorbike_access_certainty
    check (motorbike_access in ('unknown', 'yes', 'no')),
  add constraint properties_parking_certainty
    check (parking in ('unknown', 'yes', 'no'));

comment on column public.properties.car_access is
  'Customer-facing certainty: unknown, yes, or no. This is not Road Verified.';
comment on column public.properties.motorbike_access is
  'Customer-facing certainty: unknown, yes, or no. This is an access fact, not a rental domain.';
comment on column public.properties.parking is
  'Customer-facing parking certainty: unknown, yes, or no.';

-- Physical room quantity remains available to staff/admin but is intentionally
-- withheld from anonymous Phase 2 reads until availability exists.
revoke select (quantity) on table public.room_types from anon;

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
      slug, name, property_type, short_description, description, area_name,
      address, latitude, longitude, altitude_m, google_maps_url, public_phone,
      public_zalo_url, check_in_time, check_out_time, road_access_grade,
      car_access, motorbike_access, parking, restaurant, breakfast, bbq, wifi,
      is_featured, is_active, publish_status, archived_at
    )
    select
      slug, name, property_type, short_description, description, area_name,
      address, latitude, longitude, altitude_m, google_maps_url, public_phone,
      public_zalo_url, check_in_time, check_out_time, road_access_grade,
      car_access, motorbike_access, parking, restaurant, breakfast, bbq, wifi,
      is_featured,
      case when publish_status = 'archived' then false else is_active end,
      publish_status,
      case when publish_status = 'archived' then now() else null end
    from input
    returning id, slug into saved_property_id, saved_property_slug;
  else
    with input as (
      select *
      from jsonb_to_record(property_values) as input_record(
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

  -- Any exception here rolls the property insert/update back with the assignment.
  perform public.set_property_amenities(saved_property_id, selected_amenity_ids);

  return query select saved_property_id, saved_property_slug;
end;
$$;

create or replace function public.save_room_type_with_amenities(
  target_room_type_id uuid,
  room_type_values jsonb,
  selected_amenity_ids uuid[]
)
returns table(room_type_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_room_type_id uuid;
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Not authorized';
  end if;

  if room_type_values is null or jsonb_typeof(room_type_values) <> 'object' then
    raise exception 'Room type values must be a JSON object';
  end if;

  if target_room_type_id is null then
    with input as (
      select *
      from jsonb_to_record(room_type_values) as input_record(
        property_id uuid,
        slug text,
        name text,
        short_description text,
        description text,
        capacity_adults integer,
        capacity_children integer,
        max_guests integer,
        bed_type text,
        bed_count integer,
        bathroom_type text,
        quantity integer,
        size_m2 numeric,
        floor_label text,
        has_private_balcony boolean,
        view_type text,
        is_active boolean,
        publish_status text
      )
    )
    insert into public.room_types (
      property_id, slug, name, short_description, description, capacity_adults,
      capacity_children, max_guests, bed_type, bed_count, bathroom_type,
      quantity, size_m2, floor_label, has_private_balcony, view_type,
      is_active, publish_status
    )
    select
      property_id, slug, name, short_description, description, capacity_adults,
      capacity_children, max_guests, bed_type, bed_count, bathroom_type,
      quantity, size_m2, floor_label, has_private_balcony, view_type,
      is_active, publish_status
    from input
    returning id into saved_room_type_id;
  else
    with input as (
      select *
      from jsonb_to_record(room_type_values) as input_record(
        property_id uuid,
        slug text,
        name text,
        short_description text,
        description text,
        capacity_adults integer,
        capacity_children integer,
        max_guests integer,
        bed_type text,
        bed_count integer,
        bathroom_type text,
        quantity integer,
        size_m2 numeric,
        floor_label text,
        has_private_balcony boolean,
        view_type text,
        is_active boolean,
        publish_status text
      )
    )
    update public.room_types as room_type
    set
      property_id = input.property_id,
      slug = input.slug,
      name = input.name,
      short_description = input.short_description,
      description = input.description,
      capacity_adults = input.capacity_adults,
      capacity_children = input.capacity_children,
      max_guests = input.max_guests,
      bed_type = input.bed_type,
      bed_count = input.bed_count,
      bathroom_type = input.bathroom_type,
      quantity = input.quantity,
      size_m2 = input.size_m2,
      floor_label = input.floor_label,
      has_private_balcony = input.has_private_balcony,
      view_type = input.view_type,
      is_active = input.is_active,
      publish_status = input.publish_status
    from input
    where room_type.id = target_room_type_id
    returning room_type.id into saved_room_type_id;

    if not found then
      raise exception 'Room type not found';
    end if;
  end if;

  -- Any exception here rolls the room insert/update back with the assignment.
  perform public.set_room_amenities(saved_room_type_id, selected_amenity_ids);

  return query select saved_room_type_id;
end;
$$;

revoke all on function public.save_property_with_amenities(uuid, jsonb, uuid[]) from public;
revoke all on function public.save_room_type_with_amenities(uuid, jsonb, uuid[]) from public;
grant execute on function public.save_property_with_amenities(uuid, jsonb, uuid[]) to authenticated;
grant execute on function public.save_room_type_with_amenities(uuid, jsonb, uuid[]) to authenticated;

comment on function public.save_property_with_amenities(uuid, jsonb, uuid[]) is
  'Atomically inserts/updates one property and replaces its amenity assignments.';
comment on function public.save_room_type_with_amenities(uuid, jsonb, uuid[]) is
  'Atomically inserts/updates one room type and replaces its amenity assignments.';
