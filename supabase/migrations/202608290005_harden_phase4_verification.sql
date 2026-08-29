-- Tà Xùa Stay Phase 4 corrective hardening.
-- Keep the applied 004 migration immutable and tighten lifecycle visibility/grants additively.

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
      -- A normal re-verification never inherits its old review/expired cycle.
      -- Staff can intentionally backdate by submitting changed, valid custom dates.
      new.verified_at := lifecycle_now;
      new.expires_at := lifecycle_now
        + public.verification_freshness_interval(new.verification_type);
    elsif tg_op = 'UPDATE' and old_was_current then
      -- Missing dates on an ordinary edit preserve the still-current cycle.
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
    elsif starts_fresh_cycle
      or new.verified_at is distinct from old.verified_at
    then
      new.verified_by_user_id := auth.uid();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.set_verification_audit() from public;

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

revoke all on function public.is_verification_public(uuid) from public;
grant execute on function public.is_verification_public(uuid) to anon, authenticated;

-- Remove table-wide anonymous reads so later internal columns do not become public.
revoke select on table public.cloud_view_verifications from anon;
revoke select on table public.road_verifications from anon;

grant select (
  verification_id, total_points, score_10, view_from_bed, viewing_position,
  view_direction, horizontal_view_angle_deg, sunrise_orientation,
  obstruction_notes, cloud_view_notes
) on table public.cloud_view_verifications to anon;

grant select (
  verification_id, grade, car_access, motorbike_access, sedan_access,
  parking, road_surface, steepness_notes, narrow_section_notes,
  rain_risk_notes, parking_location, walk_from_parking_m, notes
) on table public.road_verifications to anon;

comment on function public.set_verification_audit() is
  'Maintains Phase 4 audit fields, rejects future/expired verified cycles, and starts a fresh default cycle when a non-current record is re-verified without changed custom dates.';
comment on function public.is_verification_public(uuid) is
  'Least-privilege RLS helper: true only after verification starts and before expiry, with approved evidence on a public target.';
