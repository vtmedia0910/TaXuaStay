-- Tà Xùa Stay V2 Phase 2: Verified Room Profile.
--
-- Pre-audit correction: migration 009 introduced the exact-room overload below
-- and revoked its default PUBLIC privilege, but did not restore EXECUTE for the
-- authenticated staff role used by the wrapper RPCs. Migration 009 is already
-- applied remotely and remains immutable, so the correction is additive here.

grant execute on function public.save_verification_core(
  uuid, text, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) to authenticated;

alter table public.verification_records
  drop constraint verification_records_type,
  add constraint verification_records_type check (
    verification_type in (
      'property_identity', 'property_location', 'room', 'cloud_view',
      'road_access', 'media_360', 'room_quality'
    )
  ),
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
      verification_type in ('room', 'cloud_view', 'media_360', 'room_quality')
      and property_id is null
      and num_nonnulls(room_type_id, physical_room_id) = 1
    )
  );

create table public.room_quality_assessments (
  verification_record_id uuid primary key
    references public.verification_records(id) on delete cascade,
  room_type_id uuid references public.room_types(id) on delete restrict,
  physical_room_id uuid references public.physical_rooms(id) on delete restrict,
  cleanliness_score smallint,
  soundproof_score smallint,
  heating_score smallint,
  hot_water_score smallint,
  wifi_score smallint,
  bathroom_score smallint,
  room_accuracy_score smallint,
  comfort_score smallint,
  notes_public text,
  notes_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_quality_exact_target check (
    num_nonnulls(room_type_id, physical_room_id) = 1
  ),
  constraint room_quality_has_dimension check (
    num_nonnulls(
      cleanliness_score, soundproof_score, heating_score, hot_water_score,
      wifi_score, bathroom_score, room_accuracy_score, comfort_score
    ) >= 1
  ),
  constraint room_quality_cleanliness_range check (
    cleanliness_score is null or cleanliness_score between 0 and 100
  ),
  constraint room_quality_soundproof_range check (
    soundproof_score is null or soundproof_score between 0 and 100
  ),
  constraint room_quality_heating_range check (
    heating_score is null or heating_score between 0 and 100
  ),
  constraint room_quality_hot_water_range check (
    hot_water_score is null or hot_water_score between 0 and 100
  ),
  constraint room_quality_wifi_range check (
    wifi_score is null or wifi_score between 0 and 100
  ),
  constraint room_quality_bathroom_range check (
    bathroom_score is null or bathroom_score between 0 and 100
  ),
  constraint room_quality_accuracy_range check (
    room_accuracy_score is null or room_accuracy_score between 0 and 100
  ),
  constraint room_quality_comfort_range check (
    comfort_score is null or comfort_score between 0 and 100
  ),
  constraint room_quality_public_notes_length check (
    notes_public is null or char_length(notes_public) <= 3000
  ),
  constraint room_quality_internal_notes_length check (
    notes_internal is null or char_length(notes_internal) <= 5000
  )
);

create table public.room_profile_notes (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid references public.room_types(id) on delete restrict,
  physical_room_id uuid references public.physical_rooms(id) on delete restrict,
  note_type text not null,
  category text not null,
  text text not null,
  sort_order integer not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint room_profile_notes_exact_target check (
    num_nonnulls(room_type_id, physical_room_id) = 1
  ),
  constraint room_profile_notes_type check (note_type in ('pro', 'con')),
  constraint room_profile_notes_category check (
    category in (
      'view', 'noise', 'bathroom', 'access', 'wifi', 'space', 'privacy',
      'temperature', 'location', 'other'
    )
  ),
  constraint room_profile_notes_text_length check (
    char_length(btrim(text)) between 2 and 500
  ),
  constraint room_profile_notes_sort_order check (sort_order between 0 and 10000)
);

create index room_quality_room_type_index
  on public.room_quality_assessments (room_type_id, updated_at desc)
  where room_type_id is not null;

create index room_quality_physical_room_index
  on public.room_quality_assessments (physical_room_id, updated_at desc)
  where physical_room_id is not null;

create index room_profile_notes_room_type_public
  on public.room_profile_notes (room_type_id, note_type, sort_order, id)
  where room_type_id is not null and is_public;

create index room_profile_notes_physical_room_public
  on public.room_profile_notes (physical_room_id, note_type, sort_order, id)
  where physical_room_id is not null and is_public;

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
    when 'room_quality' then interval '12 months'
    else null
  end;
$$;

create or replace function public.room_quality_freshness_interval(target_dimension text)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case target_dimension
    when 'cleanliness' then interval '90 days'
    when 'heating' then interval '6 months'
    when 'hot_water' then interval '6 months'
    when 'wifi' then interval '6 months'
    when 'comfort' then interval '6 months'
    when 'soundproof' then interval '12 months'
    when 'bathroom' then interval '12 months'
    when 'room_accuracy' then interval '12 months'
    else null
  end;
$$;

create or replace function public.resolve_room_quality_dimension_state(
  target_score smallint,
  target_verified_at timestamptz,
  target_expires_at timestamptz,
  target_dimension text
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when target_score is null then 'unknown'
    when public.room_quality_freshness_interval(target_dimension) is null then 'unknown'
    when target_verified_at is null or target_verified_at > now() then 'stale'
    when target_expires_at is null or target_expires_at <= now() then 'stale'
    when target_verified_at + public.room_quality_freshness_interval(target_dimension) <= now()
      then 'stale'
    else 'current'
  end;
$$;

create or replace function public.set_room_profile_note_audit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.text := btrim(new.text);
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  return new;
end;
$$;

create or replace function public.validate_room_quality_target()
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
begin
  select verification_type, property_id, room_type_id, physical_room_id
    into record_type, record_property_id, record_room_type_id, record_physical_room_id
  from public.verification_records
  where id = new.verification_record_id;

  if not found or record_type <> 'room_quality' then
    raise exception 'Room quality assessment requires a room_quality lifecycle record';
  end if;

  if record_property_id is not null
    or new.room_type_id is distinct from record_room_type_id
    or new.physical_room_id is distinct from record_physical_room_id
  then
    raise exception 'Room quality target must match its lifecycle record';
  end if;

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

  if record_type in ('room', 'cloud_view', 'media_360', 'room_quality') then
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

  if record_type = 'room_quality'
    and asset_evidence_type not in (
      'room', 'bathroom', 'view_from_room', 'view_from_bed', 'balcony',
      'verification'
    )
  then
    raise exception 'Room quality evidence must document the assessed room';
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

  if record_type = 'room_quality' and not exists (
    select 1 from public.room_quality_assessments
    where verification_record_id = target_verification_id
  ) then
    raise exception 'Room quality assessment details are required';
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

create or replace function public.check_room_quality_complete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.validate_verification_complete(
    coalesce(new.verification_record_id, old.verification_record_id)
  );
  return coalesce(new, old);
end;
$$;

create trigger room_quality_set_updated_at
before update on public.room_quality_assessments
for each row execute function public.set_phase4_updated_at();

create trigger room_quality_validate_target
before insert or update on public.room_quality_assessments
for each row execute function public.validate_room_quality_target();

create constraint trigger room_quality_preserves_complete_record
after insert or update or delete on public.room_quality_assessments
deferrable initially deferred
for each row execute function public.check_room_quality_complete();

create trigger room_profile_notes_set_audit
before insert or update on public.room_profile_notes
for each row execute function public.set_room_profile_note_audit();

alter table public.room_quality_assessments enable row level security;
alter table public.room_profile_notes enable row level security;

revoke all on table public.room_quality_assessments from anon, authenticated;
revoke all on table public.room_profile_notes from anon, authenticated;

grant select (
  verification_record_id, room_type_id, physical_room_id,
  cleanliness_score, soundproof_score, heating_score, hot_water_score,
  wifi_score, bathroom_score, room_accuracy_score, comfort_score,
  notes_public
) on table public.room_quality_assessments to anon;

grant select (
  id, room_type_id, physical_room_id, note_type, category, text,
  sort_order, is_public, created_at, updated_at
) on table public.room_profile_notes to anon;

grant select, insert, update on table public.room_quality_assessments to authenticated;
grant select, insert, update, delete on table public.room_profile_notes to authenticated;

create policy "public reads current room quality"
on public.room_quality_assessments for select to anon
using ((select public.is_verification_public(verification_record_id)));

create policy "staff manages room quality"
on public.room_quality_assessments for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads public room profile notes"
on public.room_profile_notes for select to anon
using (
  is_public
  and (
    (room_type_id is not null and (select public.is_room_public(room_type_id)))
    or (
      physical_room_id is not null
      and (select public.is_physical_room_public(physical_room_id))
    )
  )
);

create policy "staff manages room profile notes"
on public.room_profile_notes for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create or replace view public.public_room_quality_assessments
with (security_invoker = true, security_barrier = true)
as
select
  quality.verification_record_id,
  record.room_type_id,
  record.physical_room_id,
  quality.cleanliness_score,
  quality.soundproof_score,
  quality.heating_score,
  quality.hot_water_score,
  quality.wifi_score,
  quality.bathroom_score,
  quality.room_accuracy_score,
  quality.comfort_score,
  quality.notes_public,
  record.verified_at,
  record.expires_at,
  'current'::text as verification_state,
  public.resolve_room_quality_dimension_state(
    quality.cleanliness_score, record.verified_at, record.expires_at, 'cleanliness'
  ) as cleanliness_state,
  public.resolve_room_quality_dimension_state(
    quality.soundproof_score, record.verified_at, record.expires_at, 'soundproof'
  ) as soundproof_state,
  public.resolve_room_quality_dimension_state(
    quality.heating_score, record.verified_at, record.expires_at, 'heating'
  ) as heating_state,
  public.resolve_room_quality_dimension_state(
    quality.hot_water_score, record.verified_at, record.expires_at, 'hot_water'
  ) as hot_water_state,
  public.resolve_room_quality_dimension_state(
    quality.wifi_score, record.verified_at, record.expires_at, 'wifi'
  ) as wifi_state,
  public.resolve_room_quality_dimension_state(
    quality.bathroom_score, record.verified_at, record.expires_at, 'bathroom'
  ) as bathroom_state,
  public.resolve_room_quality_dimension_state(
    quality.room_accuracy_score, record.verified_at, record.expires_at, 'room_accuracy'
  ) as room_accuracy_state,
  public.resolve_room_quality_dimension_state(
    quality.comfort_score, record.verified_at, record.expires_at, 'comfort'
  ) as comfort_state
from public.room_quality_assessments as quality
join public.verification_records as record
  on record.id = quality.verification_record_id
where record.verification_type = 'room_quality'
  and public.is_verification_public(record.id);

create or replace view public.public_room_profile_notes
with (security_invoker = true, security_barrier = true)
as
select
  id,
  room_type_id,
  physical_room_id,
  note_type,
  category,
  text,
  sort_order,
  created_at,
  updated_at
from public.room_profile_notes
where is_public
  and (
    (room_type_id is not null and public.is_room_public(room_type_id))
    or (
      physical_room_id is not null
      and public.is_physical_room_public(physical_room_id)
    )
  );

revoke all on table public.public_room_quality_assessments from public;
revoke all on table public.public_room_profile_notes from public;
grant select on table public.public_room_quality_assessments to anon, authenticated;
grant select on table public.public_room_profile_notes to anon, authenticated;

create or replace function public.resolve_exact_room_verification(
  target_physical_room_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  latest_status text;
  latest_verified_at timestamptz;
  latest_expires_at timestamptz;
begin
  if target_physical_room_id is null
    or not public.is_physical_room_public(target_physical_room_id)
  then
    return 'not_verified';
  end if;

  if exists (
    select 1
    from public.verification_records as record
    where record.verification_type = 'room'
      and record.physical_room_id = target_physical_room_id
      and public.is_verification_public(record.id)
  ) then
    return 'verified';
  end if;

  select status, verified_at, expires_at
    into latest_status, latest_verified_at, latest_expires_at
  from public.verification_records
  where verification_type = 'room'
    and physical_room_id = target_physical_room_id
  order by updated_at desc, created_at desc, id desc
  limit 1;

  if not found then
    return 'not_verified';
  end if;

  if latest_status = 'needs_review' then
    return 'needs_review';
  end if;

  if latest_status = 'expired'
    or (
      latest_status = 'verified'
      and latest_verified_at is not null
      and latest_verified_at <= now()
      and (latest_expires_at is null or latest_expires_at <= now())
    )
  then
    return 'expired';
  end if;

  return 'not_verified';
end;
$$;

create or replace function public.is_exact_room_verified(target_physical_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.resolve_exact_room_verification(target_physical_room_id) = 'verified';
$$;

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
  ) as cloud_view_verified,
  'verified'::text as exact_verification_state
from public.physical_rooms as physical_room
join lateral (
  select record.id, record.verified_at, record.expires_at
  from public.verification_records as record
  where record.physical_room_id = physical_room.id
    and record.verification_type = 'room'
    and public.is_verification_public(record.id)
  order by record.verified_at desc, record.id
  limit 1
) as room_record on true
where public.resolve_exact_room_verification(physical_room.id) = 'verified';

revoke all on table public.public_verified_physical_rooms from public;
grant select on table public.public_verified_physical_rooms to anon, authenticated;

revoke all on function public.room_quality_freshness_interval(text) from public;
revoke all on function public.resolve_room_quality_dimension_state(
  smallint, timestamptz, timestamptz, text
) from public;
revoke all on function public.set_room_profile_note_audit() from public;
revoke all on function public.validate_room_quality_target() from public;
revoke all on function public.validate_verification_evidence_target() from public;
revoke all on function public.validate_verification_complete(uuid) from public;
revoke all on function public.check_room_quality_complete() from public;
revoke all on function public.resolve_exact_room_verification(uuid) from public;
revoke all on function public.is_exact_room_verified(uuid) from public;

grant execute on function public.verification_freshness_interval(text) to authenticated;
grant execute on function public.room_quality_freshness_interval(text) to anon, authenticated;
grant execute on function public.resolve_room_quality_dimension_state(
  smallint, timestamptz, timestamptz, text
) to anon, authenticated;
grant execute on function public.resolve_exact_room_verification(uuid) to anon, authenticated;
grant execute on function public.is_exact_room_verified(uuid) to anon, authenticated;

create or replace function public.save_room_quality_verification(
  target_verification_id uuid,
  target_room_type_id uuid,
  target_physical_room_id uuid,
  target_status text,
  target_method text,
  target_notes text,
  target_verified_at timestamptz,
  target_expires_at timestamptz,
  selected_media_ids uuid[],
  target_cleanliness_score smallint,
  target_soundproof_score smallint,
  target_heating_score smallint,
  target_hot_water_score smallint,
  target_wifi_score smallint,
  target_bathroom_score smallint,
  target_room_accuracy_score smallint,
  target_comfort_score smallint,
  target_notes_public text,
  target_notes_internal text
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
    'room_quality',
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

  insert into public.room_quality_assessments (
    verification_record_id, room_type_id, physical_room_id,
    cleanliness_score, soundproof_score, heating_score, hot_water_score,
    wifi_score, bathroom_score, room_accuracy_score, comfort_score,
    notes_public, notes_internal
  ) values (
    saved_id, target_room_type_id, target_physical_room_id,
    target_cleanliness_score, target_soundproof_score, target_heating_score,
    target_hot_water_score, target_wifi_score, target_bathroom_score,
    target_room_accuracy_score, target_comfort_score,
    target_notes_public, target_notes_internal
  )
  on conflict (verification_record_id) do update set
    room_type_id = excluded.room_type_id,
    physical_room_id = excluded.physical_room_id,
    cleanliness_score = excluded.cleanliness_score,
    soundproof_score = excluded.soundproof_score,
    heating_score = excluded.heating_score,
    hot_water_score = excluded.hot_water_score,
    wifi_score = excluded.wifi_score,
    bathroom_score = excluded.bathroom_score,
    room_accuracy_score = excluded.room_accuracy_score,
    comfort_score = excluded.comfort_score,
    notes_public = excluded.notes_public,
    notes_internal = excluded.notes_internal;

  return saved_id;
end;
$$;

revoke all on function public.save_room_quality_verification(
  uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[],
  smallint, smallint, smallint, smallint, smallint, smallint, smallint,
  smallint, text, text
) from public;

grant execute on function public.save_room_quality_verification(
  uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[],
  smallint, smallint, smallint, smallint, smallint, smallint, smallint,
  smallint, text, text
) to authenticated;

comment on table public.room_quality_assessments is
  'Evidence-backed Room Quality dimensions. Integer 0-100 values remain separate; no overall score is stored.';
comment on column public.room_quality_assessments.room_accuracy_score is
  'Observed consistency with published room size, beds, bathroom, balcony, view, layout, furniture, and photos; not satisfaction, price, or Cloud View.';
comment on table public.room_profile_notes is
  'Ordered factual strengths and caveats for a room type or exact Room ID, independent of sponsorship or commercial tier.';
comment on function public.resolve_exact_room_verification(uuid) is
  'Central exact-room state resolver. Bookability is intentionally excluded from verification.';
