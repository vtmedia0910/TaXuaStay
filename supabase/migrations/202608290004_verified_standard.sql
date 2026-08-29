-- Tà Xùa Stay Phase 4: Verified Standard, Cloud View, Road Verified, and evidence links.
-- This migration is additive and intentionally seeds no verification data.

create table public.verification_records (
  id uuid primary key default gen_random_uuid(),
  verification_type text not null,
  status text not null default 'pending',
  property_id uuid references public.properties(id) on delete restrict,
  room_type_id uuid references public.room_types(id) on delete restrict,
  verified_at timestamptz,
  expires_at timestamptz,
  verified_by_user_id uuid references auth.users(id) on delete set null,
  method text not null,
  notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verification_records_type check (
    verification_type in (
      'property_identity', 'property_location', 'room', 'cloud_view',
      'road_access', 'media_360'
    )
  ),
  constraint verification_records_status check (
    status in ('pending', 'verified', 'expired', 'rejected', 'needs_review')
  ),
  constraint verification_records_target check (
    (
      verification_type in ('property_identity', 'property_location', 'road_access')
      and property_id is not null
      and room_type_id is null
    )
    or
    (
      verification_type in ('room', 'cloud_view', 'media_360')
      and property_id is null
      and room_type_id is not null
    )
  ),
  constraint verification_records_method_length check (char_length(method) between 2 and 200),
  constraint verification_records_notes_length check (notes is null or char_length(notes) <= 5000),
  constraint verification_records_verified_dates check (
    (status <> 'verified')
    or (verified_at is not null and expires_at is not null and expires_at > verified_at)
  ),
  constraint verification_records_expiry_order check (
    expires_at is null or (verified_at is not null and expires_at > verified_at)
  )
);

create table public.cloud_view_verifications (
  verification_id uuid primary key references public.verification_records(id) on delete cascade,
  direct_valley_points smallint not null,
  view_width_points smallint not null,
  obstruction_points smallint not null,
  view_from_bed_points smallint not null,
  private_position_points smallint not null,
  orientation_points smallint not null,
  evidence_points smallint not null,
  total_points smallint generated always as (
    direct_valley_points
    + view_width_points
    + obstruction_points
    + view_from_bed_points
    + private_position_points
    + orientation_points
    + evidence_points
  ) stored,
  score_10 numeric(3,1) generated always as ((
    direct_valley_points
    + view_width_points
    + obstruction_points
    + view_from_bed_points
    + private_position_points
    + orientation_points
    + evidence_points
  )::numeric / 10.0) stored,
  view_from_bed text not null,
  viewing_position text not null,
  view_direction text not null default 'unknown',
  horizontal_view_angle_deg numeric(6,2),
  sunrise_orientation text not null default 'unknown',
  obstruction_notes text,
  cloud_view_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cloud_view_direct_valley_range check (direct_valley_points between 0 and 30),
  constraint cloud_view_width_range check (view_width_points between 0 and 20),
  constraint cloud_view_obstruction_range check (obstruction_points between 0 and 15),
  constraint cloud_view_from_bed_range check (view_from_bed_points between 0 and 15),
  constraint cloud_view_private_position_range check (private_position_points between 0 and 10),
  constraint cloud_view_orientation_range check (orientation_points between 0 and 5),
  constraint cloud_view_evidence_range check (evidence_points between 0 and 5),
  constraint cloud_view_from_bed_fact check (view_from_bed in ('yes', 'partial', 'no')),
  constraint cloud_view_position check (
    viewing_position in (
      'private_balcony', 'private_terrace', 'private_window',
      'semi_private', 'shared', 'none'
    )
  ),
  constraint cloud_view_direction check (
    view_direction in ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'unknown')
  ),
  constraint cloud_view_angle check (
    horizontal_view_angle_deg is null
    or horizontal_view_angle_deg between 0 and 360
  ),
  constraint cloud_view_sunrise_orientation check (
    sunrise_orientation in ('good', 'partial', 'no', 'unknown')
  ),
  constraint cloud_view_obstruction_notes_length check (
    obstruction_notes is null or char_length(obstruction_notes) <= 2000
  ),
  constraint cloud_view_notes_length check (
    cloud_view_notes is null or char_length(cloud_view_notes) <= 3000
  ),
  constraint cloud_view_from_bed_consistency check (
    (view_from_bed = 'no' and view_from_bed_points = 0)
    or (view_from_bed = 'partial' and view_from_bed_points between 1 and 10)
    or (view_from_bed = 'yes' and view_from_bed_points between 10 and 15)
  ),
  constraint cloud_view_private_fact_consistency check (
    view_from_bed = 'no'
    or viewing_position not in ('shared', 'none')
  )
);

create table public.road_verifications (
  verification_id uuid primary key references public.verification_records(id) on delete cascade,
  grade text not null,
  car_access text not null,
  motorbike_access text not null,
  sedan_access text not null,
  parking text not null,
  road_surface text not null,
  steepness_notes text,
  narrow_section_notes text,
  rain_risk_notes text,
  parking_location text,
  walk_from_parking_m integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint road_verifications_grade check (grade in ('a', 'b', 'c', 'd')),
  constraint road_verifications_car_access check (car_access in ('unknown', 'yes', 'no')),
  constraint road_verifications_motorbike_access check (motorbike_access in ('unknown', 'yes', 'no')),
  constraint road_verifications_sedan_access check (sedan_access in ('unknown', 'yes', 'no')),
  constraint road_verifications_parking check (parking in ('unknown', 'yes', 'no')),
  constraint road_verifications_surface check (
    road_surface in ('asphalt', 'concrete', 'gravel', 'dirt', 'mixed', 'unknown')
  ),
  constraint road_verifications_walk_distance check (
    walk_from_parking_m is null or walk_from_parking_m >= 0
  ),
  constraint road_verifications_grade_d_consistency check (
    grade <> 'd' or (car_access = 'no' and sedan_access = 'no')
  ),
  constraint road_verifications_steepness_length check (
    steepness_notes is null or char_length(steepness_notes) <= 2000
  ),
  constraint road_verifications_narrow_length check (
    narrow_section_notes is null or char_length(narrow_section_notes) <= 2000
  ),
  constraint road_verifications_rain_length check (
    rain_risk_notes is null or char_length(rain_risk_notes) <= 2000
  ),
  constraint road_verifications_parking_location_length check (
    parking_location is null or char_length(parking_location) <= 1000
  ),
  constraint road_verifications_notes_length check (notes is null or char_length(notes) <= 3000)
);

create table public.verification_evidence (
  verification_id uuid not null references public.verification_records(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  evidence_role text not null default 'supporting',
  public_visible boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (verification_id, media_asset_id),
  constraint verification_evidence_role check (
    evidence_role in (
      'primary', 'supporting', 'room_interior_360', 'view_position_360',
      'hardest_road_section', 'parking', 'gps_orientation'
    )
  )
);

create unique index verification_records_current_property_type
  on public.verification_records (verification_type, property_id)
  where status = 'verified' and property_id is not null;

create unique index verification_records_current_room_type
  on public.verification_records (verification_type, room_type_id)
  where status = 'verified' and room_type_id is not null;

create index verification_records_property_history
  on public.verification_records (property_id, verification_type, created_at desc)
  where property_id is not null;

create index verification_records_room_history
  on public.verification_records (room_type_id, verification_type, created_at desc)
  where room_type_id is not null;

create index verification_records_admin_status
  on public.verification_records (status, expires_at, updated_at desc);

create index verification_evidence_media_index
  on public.verification_evidence (media_asset_id, verification_id);

create or replace function public.verification_freshness_interval(target_type text)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case target_type
    when 'road_access' then interval '6 months'
    when 'property_identity' then interval '12 months'
    when 'property_location' then interval '12 months'
    when 'room' then interval '12 months'
    when 'cloud_view' then interval '12 months'
    when 'media_360' then interval '12 months'
    else null
  end;
$$;

create or replace function public.set_verification_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.verification_type is distinct from old.verification_type
    or new.property_id is distinct from old.property_id
    or new.room_type_id is distinct from old.room_type_id
  ) then
    raise exception 'Verification type and target are immutable';
  end if;

  new.updated_at := now();
  new.updated_by_user_id := auth.uid();

  if tg_op = 'INSERT' then
    new.created_by_user_id := coalesce(new.created_by_user_id, auth.uid());
  end if;

  if new.status = 'verified' then
    if tg_op = 'INSERT' or old.status is distinct from 'verified' then
      new.verified_at := coalesce(new.verified_at, now());
      new.verified_by_user_id := auth.uid();
    elsif new.verified_at is distinct from old.verified_at then
      new.verified_by_user_id := auth.uid();
    end if;

    new.expires_at := coalesce(
      new.expires_at,
      new.verified_at + public.verification_freshness_interval(new.verification_type)
    );
  end if;

  return new;
end;
$$;

create or replace function public.set_phase4_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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
  asset_property_id uuid;
  asset_room_type_id uuid;
  asset_media_type text;
  asset_evidence_type text;
  asset_is_verified boolean;
begin
  select verification_type, property_id, room_type_id
    into record_type, record_property_id, record_room_type_id
  from public.verification_records
  where id = new.verification_id;

  if not found then
    raise exception 'Verification record not found';
  end if;

  select property_id, room_type_id, media_type, evidence_type, is_verified
    into asset_property_id, asset_room_type_id, asset_media_type,
      asset_evidence_type, asset_is_verified
  from public.media_assets
  where id = new.media_asset_id;

  if not found then
    raise exception 'Media asset not found';
  end if;

  if new.public_visible and not asset_is_verified then
    raise exception 'Public verification evidence must be approved media';
  end if;

  if record_type in ('room', 'cloud_view', 'media_360') then
    if asset_room_type_id is distinct from record_room_type_id or asset_property_id is not null then
      raise exception 'Room verification evidence must belong to the exact room type';
    end if;
  else
    if asset_property_id is distinct from record_property_id or asset_room_type_id is not null then
      raise exception 'Property verification evidence must belong to the exact property';
    end if;
  end if;

  if record_type = 'cloud_view'
    and asset_evidence_type not in (
      'view_from_room', 'view_from_bed', 'balcony', 'sunrise', 'verification'
    ) then
    raise exception 'Cloud View evidence must show the exact room view position';
  end if;

  if record_type = 'road_access'
    and asset_evidence_type not in ('road_access', 'parking', 'verification') then
    raise exception 'Road verification evidence must show road or parking access';
  end if;

  if record_type = 'media_360' and asset_media_type <> 'panorama_360' then
    raise exception '360 verification requires panorama_360 media';
  end if;

  if new.evidence_role in ('room_interior_360', 'view_position_360')
    and asset_media_type <> 'panorama_360' then
    raise exception '360 evidence roles require panorama_360 media';
  end if;

  return new;
end;
$$;

create or replace function public.validate_verification_child_type()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_type text := case tg_table_name
    when 'cloud_view_verifications' then 'cloud_view'
    when 'road_verifications' then 'road_access'
    else null
  end;
begin
  if expected_type is null or not exists (
    select 1
    from public.verification_records
    where id = new.verification_id
      and verification_type = expected_type
  ) then
    raise exception 'Verification detail does not match its lifecycle record type';
  end if;

  return new;
end;
$$;

create or replace function public.validate_verification_complete(target_verification_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  record_type text;
  record_status text;
begin
  select verification_type, status
    into record_type, record_status
  from public.verification_records
  where id = target_verification_id;

  if not found or record_status <> 'verified' then
    return;
  end if;

  if not exists (
    select 1
    from public.verification_evidence as evidence
    join public.media_assets as media on media.id = evidence.media_asset_id
    where evidence.verification_id = target_verification_id
      and evidence.public_visible
      and media.is_verified
  ) then
    raise exception 'Verified records require approved public evidence';
  end if;

  if record_type = 'cloud_view' and not exists (
    select 1 from public.cloud_view_verifications
    where verification_id = target_verification_id
  ) then
    raise exception 'Cloud View verification details are required';
  end if;

  if record_type = 'road_access' and not exists (
    select 1 from public.road_verifications
    where verification_id = target_verification_id
  ) then
    raise exception 'Road verification details are required';
  end if;

  if record_type = 'media_360' and not exists (
    select 1
    from public.verification_evidence as evidence
    join public.media_assets as media on media.id = evidence.media_asset_id
    where evidence.verification_id = target_verification_id
      and media.media_type = 'panorama_360'
      and evidence.public_visible
      and media.is_verified
  ) then
    raise exception '360 verification requires approved panorama evidence';
  end if;
end;
$$;

create or replace function public.check_verification_record_complete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.validate_verification_complete(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function public.check_verification_child_complete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.validate_verification_complete(
    coalesce(new.verification_id, old.verification_id)
  );
  return coalesce(new, old);
end;
$$;

create trigger verification_records_set_audit
before insert or update on public.verification_records
for each row execute function public.set_verification_audit();

create trigger cloud_view_verifications_set_updated_at
before update on public.cloud_view_verifications
for each row execute function public.set_phase4_updated_at();

create trigger road_verifications_set_updated_at
before update on public.road_verifications
for each row execute function public.set_phase4_updated_at();

create trigger verification_evidence_validate_target
before insert or update on public.verification_evidence
for each row execute function public.validate_verification_evidence_target();

create trigger cloud_view_verifications_validate_type
before insert or update on public.cloud_view_verifications
for each row execute function public.validate_verification_child_type();

create trigger road_verifications_validate_type
before insert or update on public.road_verifications
for each row execute function public.validate_verification_child_type();

create constraint trigger verification_records_require_complete_evidence
after insert or update on public.verification_records
deferrable initially deferred
for each row execute function public.check_verification_record_complete();

create constraint trigger verification_evidence_preserves_complete_record
after insert or update or delete on public.verification_evidence
deferrable initially deferred
for each row execute function public.check_verification_child_complete();

create constraint trigger cloud_view_preserves_complete_record
after insert or update or delete on public.cloud_view_verifications
deferrable initially deferred
for each row execute function public.check_verification_child_complete();

create constraint trigger road_preserves_complete_record
after insert or update or delete on public.road_verifications
deferrable initially deferred
for each row execute function public.check_verification_child_complete();

alter table public.verification_records enable row level security;
alter table public.cloud_view_verifications enable row level security;
alter table public.road_verifications enable row level security;
alter table public.verification_evidence enable row level security;

revoke all on table public.verification_records from anon, authenticated;
revoke all on table public.cloud_view_verifications from anon, authenticated;
revoke all on table public.road_verifications from anon, authenticated;
revoke all on table public.verification_evidence from anon, authenticated;

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
      and record.expires_at > now()
      and (
        (record.property_id is not null and public.is_property_public(record.property_id))
        or (record.room_type_id is not null and public.is_room_public(record.room_type_id))
      )
      and exists (
        select 1
        from public.verification_evidence as evidence
        join public.media_assets as media on media.id = evidence.media_asset_id
        where evidence.verification_id = record.id
          and evidence.public_visible
          and media.is_verified
      )
  );
$$;

revoke all on function public.verification_freshness_interval(text) from public;
revoke all on function public.set_verification_audit() from public;
revoke all on function public.set_phase4_updated_at() from public;
revoke all on function public.validate_verification_evidence_target() from public;
revoke all on function public.validate_verification_child_type() from public;
revoke all on function public.validate_verification_complete(uuid) from public;
revoke all on function public.check_verification_record_complete() from public;
revoke all on function public.check_verification_child_complete() from public;
revoke all on function public.is_verification_public(uuid) from public;
grant execute on function public.verification_freshness_interval(text) to authenticated;
grant execute on function public.is_verification_public(uuid) to anon, authenticated;

grant select (
  id, verification_type, status, property_id, room_type_id, verified_at,
  expires_at, created_at, updated_at
) on table public.verification_records to anon;

grant select on table public.cloud_view_verifications to anon;
grant select on table public.road_verifications to anon;
grant select (
  verification_id, media_asset_id, evidence_role, public_visible, created_at
) on table public.verification_evidence to anon;

grant select, insert, update on table public.verification_records to authenticated;
grant select, insert, update on table public.cloud_view_verifications to authenticated;
grant select, insert, update on table public.road_verifications to authenticated;
grant select, insert, update, delete on table public.verification_evidence to authenticated;

create policy "public reads current verification records"
on public.verification_records for select to anon
using ((select public.is_verification_public(id)));

create policy "staff manages verification records"
on public.verification_records for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads current cloud view details"
on public.cloud_view_verifications for select to anon
using ((select public.is_verification_public(verification_id)));

create policy "staff manages cloud view details"
on public.cloud_view_verifications for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads current road details"
on public.road_verifications for select to anon
using ((select public.is_verification_public(verification_id)));

create policy "staff manages road details"
on public.road_verifications for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads current public verification evidence"
on public.verification_evidence for select to anon
using (
  public_visible
  and (select public.is_verification_public(verification_id))
);

create policy "staff manages verification evidence"
on public.verification_evidence for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create or replace view public.public_verification_badges
with (security_invoker = true, security_barrier = true)
as
select
  id as verification_id,
  verification_type,
  property_id,
  room_type_id,
  verified_at,
  expires_at
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
  record.expires_at
from public.verification_records as record
join public.cloud_view_verifications as cloud
  on cloud.verification_id = record.id
where record.verification_type = 'cloud_view'
  and public.is_verification_public(record.id);

create or replace view public.public_road_verifications
with (security_invoker = true, security_barrier = true)
as
select
  record.id as verification_id,
  record.property_id,
  road.grade,
  road.car_access,
  road.motorbike_access,
  road.sedan_access,
  road.parking,
  road.road_surface,
  road.steepness_notes,
  road.narrow_section_notes,
  road.rain_risk_notes,
  road.parking_location,
  road.walk_from_parking_m,
  road.notes,
  record.verified_at,
  record.expires_at
from public.verification_records as record
join public.road_verifications as road
  on road.verification_id = record.id
where record.verification_type = 'road_access'
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
  media.horizontal_fov_deg
from public.verification_evidence as evidence
join public.media_assets as media on media.id = evidence.media_asset_id
where evidence.public_visible
  and media.is_verified
  and public.is_verification_public(evidence.verification_id);

revoke all on table public.public_verification_badges from public;
revoke all on table public.public_cloud_view_verifications from public;
revoke all on table public.public_road_verifications from public;
revoke all on table public.public_verification_evidence from public;
grant select on table public.public_verification_badges to anon, authenticated;
grant select on table public.public_cloud_view_verifications to anon, authenticated;
grant select on table public.public_road_verifications to anon, authenticated;
grant select on table public.public_verification_evidence to anon, authenticated;

create or replace function public.set_verification_evidence(
  target_verification_id uuid,
  selected_media_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_count integer;
  inserted_count integer;
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Not authorized';
  end if;

  delete from public.verification_evidence
  where verification_id = target_verification_id;

  select count(distinct media_id)
    into expected_count
  from unnest(coalesce(selected_media_ids, array[]::uuid[])) as media_id;

  insert into public.verification_evidence (
    verification_id,
    media_asset_id,
    evidence_role,
    public_visible,
    created_by_user_id
  )
  select
    target_verification_id,
    media.id,
    case
      when media.media_type = 'panorama_360'
        and media.evidence_type in ('view_from_room', 'view_from_bed', 'balcony', 'sunrise')
        then 'view_position_360'
      when media.media_type = 'panorama_360' then 'room_interior_360'
      when media.evidence_type = 'road_access' then 'hardest_road_section'
      when media.evidence_type = 'parking' then 'parking'
      when media.compass_heading_deg is not null then 'gps_orientation'
      else 'supporting'
    end,
    media.is_verified,
    auth.uid()
  from public.media_assets as media
  where media.id = any(coalesce(selected_media_ids, array[]::uuid[]));

  get diagnostics inserted_count = row_count;
  if inserted_count <> expected_count then
    raise exception 'One or more evidence assets do not exist or are not accessible';
  end if;
end;
$$;

create or replace function public.save_verification_core(
  target_verification_id uuid,
  target_verification_type text,
  target_property_id uuid,
  target_room_type_id uuid,
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
      and id is distinct from target_verification_id;
  end if;

  if target_verification_id is null then
    insert into public.verification_records (
      verification_type, status, property_id, room_type_id, method, notes,
      verified_at, expires_at
    ) values (
      target_verification_type, target_status, target_property_id,
      target_room_type_id, target_method, target_notes, target_verified_at,
      target_expires_at
    )
    returning id into saved_id;
  else
    update public.verification_records
    set
      verification_type = target_verification_type,
      status = target_status,
      property_id = target_property_id,
      room_type_id = target_room_type_id,
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

create or replace function public.save_road_verification(
  target_verification_id uuid,
  target_property_id uuid,
  target_status text,
  target_method text,
  target_notes text,
  target_verified_at timestamptz,
  target_expires_at timestamptz,
  selected_media_ids uuid[],
  target_grade text,
  target_car_access text,
  target_motorbike_access text,
  target_sedan_access text,
  target_parking text,
  target_road_surface text,
  target_steepness_notes text,
  target_narrow_section_notes text,
  target_rain_risk_notes text,
  target_parking_location text,
  target_walk_from_parking_m integer,
  target_road_notes text
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
    'road_access',
    target_property_id,
    null,
    target_status,
    target_method,
    target_notes,
    target_verified_at,
    target_expires_at,
    selected_media_ids
  );

  insert into public.road_verifications (
    verification_id, grade, car_access, motorbike_access, sedan_access,
    parking, road_surface, steepness_notes, narrow_section_notes,
    rain_risk_notes, parking_location, walk_from_parking_m, notes
  ) values (
    saved_id, target_grade, target_car_access, target_motorbike_access,
    target_sedan_access, target_parking, target_road_surface,
    target_steepness_notes, target_narrow_section_notes,
    target_rain_risk_notes, target_parking_location,
    target_walk_from_parking_m, target_road_notes
  )
  on conflict (verification_id) do update set
    grade = excluded.grade,
    car_access = excluded.car_access,
    motorbike_access = excluded.motorbike_access,
    sedan_access = excluded.sedan_access,
    parking = excluded.parking,
    road_surface = excluded.road_surface,
    steepness_notes = excluded.steepness_notes,
    narrow_section_notes = excluded.narrow_section_notes,
    rain_risk_notes = excluded.rain_risk_notes,
    parking_location = excluded.parking_location,
    walk_from_parking_m = excluded.walk_from_parking_m,
    notes = excluded.notes;

  return saved_id;
end;
$$;

revoke all on function public.set_verification_evidence(uuid, uuid[]) from public;
revoke all on function public.save_verification_core(
  uuid, text, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) from public;
revoke all on function public.save_basic_verification(
  uuid, text, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) from public;
revoke all on function public.save_cloud_view_verification(
  uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[], smallint,
  smallint, smallint, smallint, smallint, smallint, smallint, text, text,
  text, numeric, text, text, text
) from public;
revoke all on function public.save_road_verification(
  uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[], text, text,
  text, text, text, text, text, text, text, text, integer, text
) from public;

grant execute on function public.set_verification_evidence(uuid, uuid[]) to authenticated;
grant execute on function public.save_verification_core(
  uuid, text, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) to authenticated;
grant execute on function public.save_basic_verification(
  uuid, text, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) to authenticated;
grant execute on function public.save_cloud_view_verification(
  uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[], smallint,
  smallint, smallint, smallint, smallint, smallint, smallint, text, text,
  text, numeric, text, text, text
) to authenticated;
grant execute on function public.save_road_verification(
  uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[], text, text,
  text, text, text, text, text, text, text, text, integer, text
) to authenticated;

comment on table public.verification_records is
  'Phase 4 lifecycle and internal audit records. Public access requires current status, expiry, evidence, and a public target.';
comment on table public.cloud_view_verifications is
  'Room-level physical view facts and generated Cloud View score. This is never weather probability.';
comment on table public.road_verifications is
  'Property-level structured Road Verified assessment. Public reads a current record in preference to, without overwriting, preliminary access facts.';
comment on table public.verification_evidence is
  'Explicit links from Verified Standard records to exact-target Phase 2 media. Approved media alone never creates a badge.';
comment on function public.is_verification_public(uuid) is
  'Least-privilege RLS helper: true only for current, non-expired, evidence-backed verification on public content.';
comment on function public.save_road_verification(
  uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[], text, text,
  text, text, text, text, text, text, text, text, integer, text
) is
  'Atomically saves Road Verified lifecycle, facts, and evidence. Preliminary Phase 2 access facts remain unchanged as the fallback after expiry.';
