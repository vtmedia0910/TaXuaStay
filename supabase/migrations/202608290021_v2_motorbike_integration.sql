-- Tà Xùa Trip V2 Phase 5: motorbike integration foundation.
-- Tà Xùa Biker remains the operational source of truth. This migration adds
-- only an intentionally published Trip-side catalog projection. It adds no
-- fleet, plate, maintenance, handover, customer, booking, payment, or sync data.

create table public.motorbike_offerings (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  source_external_ref_id uuid not null references public.supplier_external_refs(id) on delete restrict,
  slug text not null unique,
  display_name text not null,
  vehicle_category text not null,
  transmission_type text not null,
  engine_class_cc integer,
  suitable_for text,
  helmet_status text not null default 'unknown',
  pickup_summary text,
  return_summary text,
  public_description text,
  image_media_id uuid references public.cms_media_assets(id) on delete restrict,
  public_price_vnd integer,
  price_source text,
  price_checked_at timestamptz,
  price_valid_until date,
  availability_state text not null default 'needs_confirmation',
  confirmation_mode text not null default 'manual',
  public_request_url text,
  source_checked_at timestamptz,
  publication_status text not null default 'draft',
  sort_order integer not null default 0,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint motorbike_offerings_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 120),
  constraint motorbike_offerings_name_length check (char_length(btrim(display_name)) between 2 and 160),
  constraint motorbike_offerings_category_allowed check (vehicle_category in ('motorbike', 'scooter', 'service')),
  constraint motorbike_offerings_transmission_allowed check (transmission_type in ('manual_clutch', 'semi_automatic', 'automatic', 'other')),
  constraint motorbike_offerings_engine_range check (engine_class_cc is null or engine_class_cc between 40 and 1000),
  constraint motorbike_offerings_suitable_length check (suitable_for is null or char_length(suitable_for) <= 240),
  constraint motorbike_offerings_helmet_allowed check (helmet_status in ('unknown', 'yes', 'no')),
  constraint motorbike_offerings_pickup_length check (pickup_summary is null or char_length(pickup_summary) <= 300),
  constraint motorbike_offerings_return_length check (return_summary is null or char_length(return_summary) <= 300),
  constraint motorbike_offerings_description_length check (public_description is null or char_length(public_description) <= 3000),
  constraint motorbike_offerings_price_positive check (public_price_vnd is null or public_price_vnd between 1 and 100000000),
  constraint motorbike_offerings_price_source_allowed check (price_source is null or price_source in ('supplier_confirmation', 'provider_public_reference', 'owner_confirmation')),
  constraint motorbike_offerings_price_snapshot_complete check (
    (public_price_vnd is null and price_source is null and price_checked_at is null and price_valid_until is null)
    or (public_price_vnd is not null and price_source is not null and price_checked_at is not null and price_valid_until is not null)
  ),
  constraint motorbike_offerings_price_dates_ordered check (
    price_checked_at is null or price_valid_until is null
    or price_valid_until >= (price_checked_at at time zone 'Asia/Ho_Chi_Minh')::date
  ),
  constraint motorbike_offerings_availability_allowed check (availability_state in ('needs_confirmation', 'unknown', 'unavailable')),
  constraint motorbike_offerings_confirmation_allowed check (confirmation_mode in ('manual')),
  constraint motorbike_offerings_request_https check (public_request_url is null or public_request_url ~ '^https://[^[:space:]]+$'),
  constraint motorbike_offerings_publication_allowed check (publication_status in ('draft', 'published', 'paused', 'archived')),
  constraint motorbike_offerings_sort_range check (sort_order between 0 and 10000),
  constraint motorbike_offerings_notes_length check (internal_notes is null or char_length(internal_notes) <= 10000)
);

create index motorbike_offerings_public_index
on public.motorbike_offerings (publication_status, sort_order, updated_at desc);
create index motorbike_offerings_supplier_index
on public.motorbike_offerings (supplier_id, source_external_ref_id, publication_status);
create index motorbike_offerings_media_index
on public.motorbike_offerings (image_media_id)
where image_media_id is not null;

create or replace function public.is_current_motorbike_source(
  target_supplier_id uuid,
  target_external_ref_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.suppliers supplier
    join public.supplier_external_refs external_ref
      on external_ref.supplier_id = supplier.id
    where supplier.id = target_supplier_id
      and supplier.supplier_type = 'motorbike'
      and supplier.status = 'active'
      and external_ref.id = target_external_ref_id
      and external_ref.system_key = 'taxua_biker'
      and external_ref.is_active is true
  );
$$;

create or replace function public.guard_motorbike_offering()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_matches boolean;
begin
  new.slug := lower(btrim(new.slug));
  new.display_name := btrim(new.display_name);
  new.suitable_for := nullif(btrim(new.suitable_for), '');
  new.pickup_summary := nullif(btrim(new.pickup_summary), '');
  new.return_summary := nullif(btrim(new.return_summary), '');
  new.public_description := nullif(btrim(new.public_description), '');
  new.public_request_url := nullif(btrim(new.public_request_url), '');

  if tg_op = 'UPDATE' and (
    new.supplier_id is distinct from old.supplier_id
    or new.source_external_ref_id is distinct from old.source_external_ref_id
    or new.slug is distinct from old.slug
  ) then
    raise exception 'Motorbike source identity and slug are immutable';
  end if;

  if tg_op = 'UPDATE' and old.publication_status = 'archived' then
    raise exception 'Archived motorbike offerings are immutable';
  end if;

  if new.price_checked_at is not null and new.price_checked_at > now() then
    raise exception 'Motorbike price check cannot be in the future';
  end if;
  if new.source_checked_at is not null and new.source_checked_at > now() then
    raise exception 'Motorbike source check cannot be in the future';
  end if;

  select exists (
    select 1
    from public.suppliers supplier
    join public.supplier_external_refs external_ref
      on external_ref.supplier_id = supplier.id
    where supplier.id = new.supplier_id
      and supplier.supplier_type = 'motorbike'
      and external_ref.id = new.source_external_ref_id
      and external_ref.system_key = 'taxua_biker'
  ) into source_matches;
  if not source_matches then
    raise exception 'Motorbike offering requires a matching taxua_biker reference owned by a motorbike Supplier';
  end if;

  if new.publication_status = 'published' then
    if not public.is_current_motorbike_source(new.supplier_id, new.source_external_ref_id) then
      raise exception 'Published motorbike offering requires an active motorbike Supplier and active taxua_biker reference';
    end if;
    if new.public_request_url is null then
      raise exception 'Published motorbike offering requires a public manual-confirmation URL';
    end if;
    if new.source_checked_at is null then
      raise exception 'Published motorbike offering requires source freshness';
    end if;
  end if;

  return new;
end;
$$;

create trigger motorbike_offerings_guard
before insert or update on public.motorbike_offerings
for each row execute function public.guard_motorbike_offering();

create trigger motorbike_offerings_set_updated_at
before update on public.motorbike_offerings
for each row execute function public.set_updated_at();
create trigger motorbike_offerings_set_updated_by
before update on public.motorbike_offerings
for each row execute function public.set_updated_by();

alter table public.motorbike_offerings enable row level security;

revoke all on table public.motorbike_offerings from public, anon, authenticated;

grant select on table public.motorbike_offerings to authenticated;
grant insert (
  supplier_id, source_external_ref_id, slug, display_name, vehicle_category,
  transmission_type, engine_class_cc, suitable_for, helmet_status,
  pickup_summary, return_summary, public_description, image_media_id,
  public_price_vnd, price_source, price_checked_at, price_valid_until,
  availability_state, confirmation_mode, public_request_url,
  source_checked_at, publication_status, sort_order, internal_notes
) on table public.motorbike_offerings to authenticated;
grant update (
  display_name, vehicle_category, transmission_type, engine_class_cc,
  suitable_for, helmet_status, pickup_summary, return_summary,
  public_description, image_media_id, public_price_vnd, price_source,
  price_checked_at, price_valid_until, availability_state, confirmation_mode,
  public_request_url, source_checked_at, publication_status, sort_order,
  internal_notes
) on table public.motorbike_offerings to authenticated;

-- Anonymous users can read only columns required by the security-invoker
-- projection. Supplier IDs, external-reference IDs, internal notes, and audit
-- fields have no anonymous column grant.
grant select (
  slug, display_name, vehicle_category, transmission_type, engine_class_cc,
  suitable_for, helmet_status, pickup_summary, return_summary,
  public_description, image_media_id, public_price_vnd, price_source,
  price_checked_at, price_valid_until, availability_state, confirmation_mode,
  public_request_url, source_checked_at, publication_status, sort_order, updated_at
) on table public.motorbike_offerings to anon;

create policy "staff reads motorbike offerings"
on public.motorbike_offerings for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "admins create motorbike offerings"
on public.motorbike_offerings for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update motorbike offerings"
on public.motorbike_offerings for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "public reads published motorbike offerings"
on public.motorbike_offerings for select to anon
using (
  publication_status = 'published'
  and public.is_current_motorbike_source(supplier_id, source_external_ref_id)
);

create policy "public reads motorbike offering media"
on public.cms_media_assets for select to anon
using (
  is_active is true and exists (
    select 1
    from public.motorbike_offerings offering
    where offering.image_media_id = cms_media_assets.id
      and offering.publication_status = 'published'
  )
);

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
  media.focal_y as image_focal_y
from public.motorbike_offerings offering
left join public.cms_media_assets media on media.id = offering.image_media_id
where offering.publication_status = 'published';

grant select on table public.public_motorbike_offerings to anon, authenticated;

create or replace function public.save_motorbike_offering(
  target_offering_id uuid,
  target_supplier_id uuid,
  target_external_ref_id uuid,
  target_slug text,
  target_display_name text,
  target_vehicle_category text,
  target_transmission_type text,
  target_engine_class_cc integer,
  target_suitable_for text,
  target_helmet_status text,
  target_pickup_summary text,
  target_return_summary text,
  target_public_description text,
  target_image_media_id uuid,
  target_public_price_vnd integer,
  target_price_source text,
  target_price_checked_at timestamptz,
  target_price_valid_until date,
  target_availability_state text,
  target_public_request_url text,
  target_source_checked_at timestamptz,
  target_publication_status text,
  target_sort_order integer,
  target_internal_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare saved_id uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Motorbike offering changes require admin';
  end if;

  if target_offering_id is null then
    insert into public.motorbike_offerings (
      supplier_id, source_external_ref_id, slug, display_name,
      vehicle_category, transmission_type, engine_class_cc, suitable_for,
      helmet_status, pickup_summary, return_summary, public_description,
      image_media_id, public_price_vnd, price_source, price_checked_at,
      price_valid_until, availability_state, confirmation_mode,
      public_request_url, source_checked_at, publication_status, sort_order,
      internal_notes
    ) values (
      target_supplier_id, target_external_ref_id, target_slug,
      target_display_name, target_vehicle_category, target_transmission_type,
      target_engine_class_cc, target_suitable_for, target_helmet_status,
      target_pickup_summary, target_return_summary, target_public_description,
      target_image_media_id, target_public_price_vnd, target_price_source,
      target_price_checked_at, target_price_valid_until,
      target_availability_state, 'manual', target_public_request_url,
      target_source_checked_at, target_publication_status, target_sort_order,
      target_internal_notes
    ) returning id into saved_id;
  else
    perform 1
    from public.motorbike_offerings
    where id = target_offering_id
      and supplier_id = target_supplier_id
      and source_external_ref_id = target_external_ref_id
      and slug = lower(btrim(target_slug))
    for update;
    if not found then
      raise exception 'Motorbike source identity and slug are immutable or offering was not found';
    end if;

    update public.motorbike_offerings
    set
      display_name = target_display_name,
      vehicle_category = target_vehicle_category,
      transmission_type = target_transmission_type,
      engine_class_cc = target_engine_class_cc,
      suitable_for = target_suitable_for,
      helmet_status = target_helmet_status,
      pickup_summary = target_pickup_summary,
      return_summary = target_return_summary,
      public_description = target_public_description,
      image_media_id = target_image_media_id,
      public_price_vnd = target_public_price_vnd,
      price_source = target_price_source,
      price_checked_at = target_price_checked_at,
      price_valid_until = target_price_valid_until,
      availability_state = target_availability_state,
      confirmation_mode = 'manual',
      public_request_url = target_public_request_url,
      source_checked_at = target_source_checked_at,
      publication_status = target_publication_status,
      sort_order = target_sort_order,
      internal_notes = target_internal_notes
    where id = target_offering_id
    returning id into saved_id;
  end if;

  return saved_id;
end;
$$;

create or replace function public.guard_motorbike_media_archive()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_active is true and new.is_active is false and exists (
    select 1
    from public.motorbike_offerings offering
    where offering.image_media_id = old.id
      and offering.publication_status <> 'archived'
  ) then
    raise exception 'CMS media is still referenced by a motorbike offering';
  end if;
  return new;
end;
$$;

create trigger cms_media_motorbike_archive_guard
before update of is_active on public.cms_media_assets
for each row execute function public.guard_motorbike_media_archive();

-- Extend the current Phase 4 archive orchestrator. Offerings are closed before
-- their taxua_biker external reference and Supplier are archived.
create or replace function public.archive_supplier(target_supplier_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_status text;
begin
  if not (select public.is_admin()) then
    raise exception 'Supplier archive requires admin';
  end if;

  select status into current_status
  from public.suppliers
  where id = target_supplier_id
  for update;

  if not found then raise exception 'Supplier not found'; end if;
  if current_status = 'archived' then return; end if;

  update public.room_commercial_rules
  set is_active = false
  where supplier_id = target_supplier_id and is_active;

  update public.commercial_rate_plans
  set status = 'expired'
  where supplier_id = target_supplier_id
    and status in ('draft', 'active', 'paused');

  update public.motorbike_offerings
  set publication_status = 'archived'
  where supplier_id = target_supplier_id
    and publication_status <> 'archived';

  update public.supplier_contacts
  set is_active = false, is_primary = false
  where supplier_id = target_supplier_id
    and (is_active or is_primary);

  update public.supplier_properties
  set
    is_primary = false,
    valid_until = case
      when valid_until is null or valid_until > current_date
        then greatest(coalesce(valid_from, current_date), current_date)
      else valid_until
    end
  where supplier_id = target_supplier_id
    and (is_primary or valid_until is null or valid_until >= current_date);

  update public.partner_relationships
  set
    status = 'ended',
    started_at = coalesce(started_at, current_date),
    ended_at = current_date,
    valid_until = case
      when valid_until is null or valid_until > current_date
        then greatest(coalesce(started_at, current_date), current_date)
      else valid_until
    end
  where supplier_id = target_supplier_id
    and status <> 'ended';

  update public.supplier_external_refs
  set is_active = false
  where supplier_id = target_supplier_id and is_active;

  perform set_config('app.archive_supplier', 'on', true);
  update public.suppliers set status = 'archived' where id = target_supplier_id;
end;
$$;

revoke all on function public.is_current_motorbike_source(uuid, uuid) from public;
revoke all on function public.guard_motorbike_offering() from public;
revoke all on function public.save_motorbike_offering(
  uuid, uuid, uuid, text, text, text, text, integer, text, text, text,
  text, text, uuid, integer, text, timestamptz, date, text, text,
  timestamptz, text, integer, text
) from public;
revoke all on function public.guard_motorbike_media_archive() from public;
revoke all on function public.archive_supplier(uuid) from public;

grant execute on function public.is_current_motorbike_source(uuid, uuid) to anon, authenticated;
grant execute on function public.save_motorbike_offering(
  uuid, uuid, uuid, text, text, text, text, integer, text, text, text,
  text, text, uuid, integer, text, timestamptz, date, text, text,
  timestamptz, text, integer, text
) to authenticated;
grant execute on function public.archive_supplier(uuid) to authenticated;

comment on table public.motorbike_offerings is
  'Trip-side public motorbike catalog projection. Fleet, operations, availability truth, customers, and bookings remain owned by Tà Xùa Biker.';
comment on column public.motorbike_offerings.public_price_vnd is
  'Optional whole-VND public sell-price snapshot. Null means the public UI must say price requires confirmation.';
comment on column public.motorbike_offerings.availability_state is
  'Manual/reference state only. listed or priced never means live availability.';
comment on function public.is_current_motorbike_source(uuid, uuid) is
  'Boolean-only public eligibility check; it never exposes Supplier or taxua_biker external-reference data.';
comment on function public.archive_supplier(uuid) is
  'Admin-only atomic archive that expires private economics, archives Trip-side motorbike projections, closes operational children, then archives the Supplier.';
