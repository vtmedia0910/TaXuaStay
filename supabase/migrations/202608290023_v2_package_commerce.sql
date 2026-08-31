-- Tà Xùa Trip V2 Phase 6: Package Commerce.
-- Packages compose existing public ROOM and MOTORBIKE sources plus truthful
-- CUSTOM components. This migration adds no booking, hold, customer, payment,
-- deposit, refund, settlement, bus inventory, or Biker runtime integration.

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete restrict,
  code text not null unique,
  slug text not null unique,
  name text not null,
  proposition text not null,
  description text,
  lifecycle_status text not null default 'draft',
  valid_from date,
  valid_until date,
  confirmation_mode text not null default 'manual',
  public_request_url text,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  hero_media_id uuid references public.cms_media_assets(id) on delete restrict,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint packages_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(code) between 2 and 80),
  constraint packages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) between 2 and 120),
  constraint packages_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint packages_proposition_length check (char_length(btrim(proposition)) between 2 and 240),
  constraint packages_description_length check (description is null or char_length(description) <= 5000),
  constraint packages_lifecycle_allowed check (lifecycle_status in ('draft', 'published', 'paused', 'archived')),
  constraint packages_dates_ordered check (valid_from is null or valid_until is null or valid_from <= valid_until),
  constraint packages_confirmation_allowed check (confirmation_mode in ('instant', 'manual', 'external_request', 'unknown')),
  constraint packages_request_https check (public_request_url is null or public_request_url ~ '^https://[^[:space:]]+$'),
  constraint packages_sort_range check (sort_order between 0 and 10000),
  constraint packages_notes_length check (internal_notes is null or char_length(internal_notes) <= 10000)
);

create table public.package_components (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  component_key text not null,
  component_type text not null,
  room_type_id uuid references public.room_types(id) on delete restrict,
  motorbike_offering_id uuid references public.motorbike_offerings(id) on delete restrict,
  custom_code text,
  custom_name text,
  custom_description text,
  is_required boolean not null default true,
  quantity integer not null default 1,
  sort_order integer not null default 0,
  confirmation_mode text not null default 'manual',
  public_copy_override text,
  unit_cost_vnd integer,
  cost_source text,
  cost_verified_at timestamptz,
  cost_valid_until date,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint package_components_key_format check (component_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(component_key) between 2 and 80),
  constraint package_components_type_allowed check (component_type in ('ROOM', 'MOTORBIKE', 'BUS', 'TRANSFER', 'ACTIVITY', 'MEAL', 'GUIDE', 'SERVICE', 'CUSTOM')),
  constraint package_components_custom_code_format check (custom_code is null or (custom_code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(custom_code) between 2 and 80)),
  constraint package_components_custom_name_length check (custom_name is null or char_length(btrim(custom_name)) between 2 and 160),
  constraint package_components_custom_description_length check (custom_description is null or char_length(custom_description) <= 3000),
  constraint package_components_quantity_range check (quantity between 1 and 100),
  constraint package_components_sort_range check (sort_order between 0 and 10000),
  constraint package_components_confirmation_allowed check (confirmation_mode in ('instant', 'manual', 'external_request', 'unknown')),
  constraint package_components_copy_length check (public_copy_override is null or char_length(public_copy_override) <= 500),
  constraint package_components_cost_positive check (unit_cost_vnd is null or unit_cost_vnd between 0 and 1000000000),
  constraint package_components_cost_source_allowed check (cost_source is null or cost_source in ('supplier_confirmation', 'owner_confirmation', 'contract', 'admin')),
  constraint package_components_cost_snapshot_complete check (
    (unit_cost_vnd is null and cost_source is null and cost_verified_at is null and cost_valid_until is null)
    or (unit_cost_vnd is not null and cost_source is not null and cost_verified_at is not null and cost_valid_until is not null)
  ),
  constraint package_components_cost_dates_ordered check (
    cost_verified_at is null or cost_valid_until is null
    or cost_valid_until >= (cost_verified_at at time zone 'Asia/Ho_Chi_Minh')::date
  ),
  constraint package_components_notes_length check (internal_notes is null or char_length(internal_notes) <= 10000),
  unique (package_id, component_key)
);

create table public.package_price_rules (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  rule_key text not null,
  price_vnd integer not null,
  effective_from date,
  effective_until date,
  adults_min integer,
  adults_max integer,
  children_min integer,
  children_max integer,
  rooms_min integer,
  rooms_max integer,
  selected_optional_component_keys text[] not null default '{}'::text[],
  priority integer not null default 0,
  price_source text not null,
  verified_at timestamptz not null,
  price_valid_until date not null,
  is_active boolean not null default true,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint package_price_rules_key_format check (rule_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(rule_key) between 2 and 80),
  constraint package_price_rules_price_positive check (price_vnd between 1 and 2000000000),
  constraint package_price_rules_dates_ordered check (effective_from is null or effective_until is null or effective_from <= effective_until),
  constraint package_price_rules_adults_range check (adults_min is null or adults_min between 1 and 100),
  constraint package_price_rules_adults_max_range check (adults_max is null or adults_max between 1 and 100),
  constraint package_price_rules_adults_order check (adults_min is null or adults_max is null or adults_min <= adults_max),
  constraint package_price_rules_children_range check (children_min is null or children_min between 0 and 100),
  constraint package_price_rules_children_max_range check (children_max is null or children_max between 0 and 100),
  constraint package_price_rules_children_order check (children_min is null or children_max is null or children_min <= children_max),
  constraint package_price_rules_rooms_range check (rooms_min is null or rooms_min between 1 and 100),
  constraint package_price_rules_rooms_max_range check (rooms_max is null or rooms_max between 1 and 100),
  constraint package_price_rules_rooms_order check (rooms_min is null or rooms_max is null or rooms_min <= rooms_max),
  constraint package_price_rules_priority_range check (priority between -10000 and 10000),
  constraint package_price_rules_source_allowed check (price_source in ('supplier_confirmation', 'owner_confirmation', 'contract', 'admin')),
  constraint package_price_rules_verified_not_after_validity check (price_valid_until >= (verified_at at time zone 'Asia/Ho_Chi_Minh')::date),
  constraint package_price_rules_notes_length check (internal_notes is null or char_length(internal_notes) <= 10000),
  unique (package_id, rule_key)
);

create index packages_public_index on public.packages (lifecycle_status, is_featured desc, sort_order, updated_at desc);
create index packages_destination_index on public.packages (destination_id, lifecycle_status, sort_order);
create index package_components_package_index on public.package_components (package_id, sort_order, component_key);
create index package_components_room_index on public.package_components (room_type_id) where room_type_id is not null;
create index package_components_motorbike_index on public.package_components (motorbike_offering_id) where motorbike_offering_id is not null;
create index package_price_rules_resolution_index on public.package_price_rules (package_id, is_active, effective_from, effective_until, priority desc);

create or replace function public.guard_package()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.code := lower(btrim(new.code));
  new.slug := lower(btrim(new.slug));
  new.name := btrim(new.name);
  new.proposition := btrim(new.proposition);
  new.description := nullif(btrim(new.description), '');
  new.public_request_url := nullif(btrim(new.public_request_url), '');
  new.internal_notes := nullif(btrim(new.internal_notes), '');

  if tg_op = 'UPDATE' and (
    new.destination_id is distinct from old.destination_id
    or new.code is distinct from old.code
    or new.slug is distinct from old.slug
  ) then
    raise exception 'Package destination, code, and slug are immutable';
  end if;
  if tg_op = 'UPDATE' and old.lifecycle_status = 'archived' then
    raise exception 'Archived packages are immutable';
  end if;
  if new.lifecycle_status = 'published' and new.confirmation_mode = 'instant' then
    raise exception 'Phase 6 packages cannot promise instant confirmation';
  end if;
  return new;
end;
$$;

create or replace function public.guard_package_component()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  package_destination_id uuid;
  room_destination_id uuid;
begin
  new.component_key := lower(btrim(new.component_key));
  new.custom_code := nullif(lower(btrim(new.custom_code)), '');
  new.custom_name := nullif(btrim(new.custom_name), '');
  new.custom_description := nullif(btrim(new.custom_description), '');
  new.public_copy_override := nullif(btrim(new.public_copy_override), '');
  new.internal_notes := nullif(btrim(new.internal_notes), '');

  if new.cost_verified_at is not null and new.cost_verified_at > now() then
    raise exception 'Package component cost verification cannot be in the future';
  end if;
  if new.confirmation_mode = 'instant' then
    raise exception 'Phase 6 components cannot promise instant confirmation';
  end if;

  if new.component_type = 'ROOM' then
    if new.room_type_id is null or new.motorbike_offering_id is not null or new.custom_code is not null or new.custom_name is not null then
      raise exception 'ROOM component requires only a Room Type source';
    end if;
    if new.unit_cost_vnd is not null then
      raise exception 'ROOM cost must come from Commercial Economics, not the package component';
    end if;
    select package.destination_id, property.destination_id
    into package_destination_id, room_destination_id
    from public.packages package
    join public.room_types room on room.id = new.room_type_id
    join public.properties property on property.id = room.property_id
    where package.id = new.package_id;
    if package_destination_id is null or room_destination_id is null or package_destination_id <> room_destination_id then
      raise exception 'ROOM component must belong to the package destination';
    end if;
  elsif new.component_type = 'MOTORBIKE' then
    if new.motorbike_offering_id is null or new.room_type_id is not null or new.custom_code is not null or new.custom_name is not null then
      raise exception 'MOTORBIKE component requires only a motorbike offering source';
    end if;
    if new.confirmation_mode <> 'manual' then
      raise exception 'MOTORBIKE components require manual confirmation';
    end if;
  elsif new.component_type = 'CUSTOM' then
    if new.custom_code is null or new.custom_name is null or new.room_type_id is not null or new.motorbike_offering_id is not null then
      raise exception 'CUSTOM component requires a controlled code and name without a source UUID';
    end if;
  else
    raise exception 'This component type has no truthful Phase 6 source adapter';
  end if;
  return new;
end;
$$;

create or replace function public.guard_package_price_rule()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  supplied_count integer;
  matching_count integer;
begin
  new.rule_key := lower(btrim(new.rule_key));
  new.internal_notes := nullif(btrim(new.internal_notes), '');
  new.selected_optional_component_keys := coalesce((
    select array_agg(distinct lower(btrim(value)) order by lower(btrim(value)))
    from unnest(new.selected_optional_component_keys) as value
    where btrim(value) <> ''
  ), '{}'::text[]);

  if new.verified_at > now() then
    raise exception 'Package price verification cannot be in the future';
  end if;
  supplied_count := cardinality(new.selected_optional_component_keys);
  select count(*) into matching_count
  from public.package_components component
  where component.package_id = new.package_id
    and component.component_key = any(new.selected_optional_component_keys)
    and component.is_required is false;
  if supplied_count <> matching_count then
    raise exception 'Package price optional component keys must belong to optional components in the same package';
  end if;
  return new;
end;
$$;

create or replace function public.assert_package_publishable(target_package_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text;
  target_confirmation text;
begin
  select lifecycle_status, confirmation_mode
  into target_status, target_confirmation
  from public.packages where id = target_package_id;
  if not found then raise exception 'Package not found'; end if;
  if target_status <> 'published' then return; end if;
  if target_confirmation = 'instant' then
    raise exception 'Phase 6 packages cannot promise instant confirmation';
  end if;
  if not exists (select 1 from public.package_components where package_id = target_package_id) then
    raise exception 'Published package requires at least one meaningful component';
  end if;
  if exists (
    select 1 from public.package_components component
    where component.package_id = target_package_id and component.is_required
      and (
        (component.component_type = 'ROOM' and not public.is_room_public(component.room_type_id))
        or (component.component_type = 'MOTORBIKE' and not exists (
          select 1 from public.motorbike_offerings offering
          where offering.id = component.motorbike_offering_id
            and offering.publication_status = 'published'
            and public.is_current_motorbike_source(offering.supplier_id, offering.source_external_ref_id)
        ))
        or component.component_type not in ('ROOM', 'MOTORBIKE', 'CUSTOM')
      )
  ) then
    raise exception 'Published package has an inactive or unsupported required component';
  end if;
end;
$$;

create or replace function public.is_package_public(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.packages package
    where package.id = target_id
      and package.lifecycle_status = 'published'
      and (package.valid_from is null or package.valid_from <= current_date)
      and (package.valid_until is null or package.valid_until >= current_date)
      and public.is_destination_public(package.destination_id)
      and exists (select 1 from public.package_components component where component.package_id = package.id)
      and not exists (
        select 1 from public.package_components component
        where component.package_id = package.id and component.is_required
          and (
            (component.component_type = 'ROOM' and not public.is_room_public(component.room_type_id))
            or (component.component_type = 'MOTORBIKE' and not exists (
              select 1 from public.motorbike_offerings offering
              where offering.id = component.motorbike_offering_id
                and offering.publication_status = 'published'
                and public.is_current_motorbike_source(offering.supplier_id, offering.source_external_ref_id)
            ))
            or component.component_type not in ('ROOM', 'MOTORBIKE', 'CUSTOM')
          )
      )
  );
$$;

create trigger packages_guard before insert or update on public.packages
for each row execute function public.guard_package();
create trigger packages_set_updated_at before update on public.packages
for each row execute function public.set_updated_at();
create trigger packages_set_updated_by before update on public.packages
for each row execute function public.set_updated_by();
create trigger package_components_guard before insert or update on public.package_components
for each row execute function public.guard_package_component();
create trigger package_components_set_updated_at before update on public.package_components
for each row execute function public.set_updated_at();
create trigger package_components_set_updated_by before update on public.package_components
for each row execute function public.set_updated_by();
create trigger package_price_rules_guard before insert or update on public.package_price_rules
for each row execute function public.guard_package_price_rule();
create trigger package_price_rules_set_updated_at before update on public.package_price_rules
for each row execute function public.set_updated_at();
create trigger package_price_rules_set_updated_by before update on public.package_price_rules
for each row execute function public.set_updated_by();

alter table public.packages enable row level security;
alter table public.package_components enable row level security;
alter table public.package_price_rules enable row level security;

revoke all on table public.packages, public.package_components, public.package_price_rules from public, anon, authenticated;

grant select on table public.packages, public.package_components, public.package_price_rules to authenticated;
grant select (
  id, destination_id, slug, name, proposition, description, valid_from,
  valid_until, confirmation_mode, public_request_url, is_featured,
  sort_order, hero_media_id, updated_at, lifecycle_status
) on table public.packages to anon;

create policy "staff reads packages" on public.packages for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "staff reads package components" on public.package_components for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "staff reads package price rules" on public.package_price_rules for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "public reads published packages" on public.packages for select to anon
using ((select public.is_package_public(id)));

create policy "public reads package media" on public.cms_media_assets for select to anon
using (
  is_active is true and exists (
    select 1 from public.packages package
    where package.hero_media_id = cms_media_assets.id
      and public.is_package_public(package.id)
  )
);

create or replace view public.public_packages
with (security_invoker = true, security_barrier = true)
as
select
  package.id,
  package.destination_id,
  destination.slug as destination_slug,
  destination.name as destination_name,
  package.slug,
  package.name,
  package.proposition,
  package.description,
  package.valid_from,
  package.valid_until,
  package.confirmation_mode,
  package.public_request_url,
  package.is_featured,
  package.sort_order,
  package.updated_at,
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
from public.packages package
join public.destinations destination on destination.id = package.destination_id
left join public.cms_media_assets media on media.id = package.hero_media_id
where package.lifecycle_status = 'published';

revoke all on table public.public_packages from public, anon, authenticated;
grant select on table public.public_packages to anon, authenticated;

create or replace function public.get_public_package_components(target_package_ids uuid[])
returns table (
  package_id uuid,
  component_key text,
  component_type text,
  is_required boolean,
  quantity integer,
  sort_order integer,
  confirmation_mode text,
  public_copy_override text,
  room_type_id uuid,
  motorbike_offering_slug text,
  source_name text,
  source_parent_name text,
  source_path text,
  custom_code text,
  custom_name text,
  custom_description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    component.package_id,
    component.component_key,
    component.component_type,
    component.is_required,
    component.quantity,
    component.sort_order,
    component.confirmation_mode,
    component.public_copy_override,
    case when component.component_type = 'ROOM' then component.room_type_id else null end,
    case when component.component_type = 'MOTORBIKE' then motorbike.slug else null end,
    case
      when component.component_type = 'ROOM' then room.name
      when component.component_type = 'MOTORBIKE' then motorbike.display_name
      when component.component_type = 'CUSTOM' then component.custom_name
      else null
    end,
    case when component.component_type = 'ROOM' then property.name else null end,
    case
      when component.component_type = 'ROOM' then '/stay/' || property.slug || '/' || room.slug
      when component.component_type = 'MOTORBIKE' then '/motorbike/' || motorbike.slug
      else null
    end,
    case when component.component_type = 'CUSTOM' then component.custom_code else null end,
    case when component.component_type = 'CUSTOM' then component.custom_name else null end,
    case when component.component_type = 'CUSTOM' then component.custom_description else null end
  from public.package_components component
  left join public.room_types room on room.id = component.room_type_id
  left join public.properties property on property.id = room.property_id
  left join public.motorbike_offerings motorbike on motorbike.id = component.motorbike_offering_id
  where component.package_id = any(coalesce(target_package_ids, '{}'::uuid[]))
    and public.is_package_public(component.package_id)
    and (
      (component.component_type = 'ROOM' and public.is_room_public(component.room_type_id))
      or (component.component_type = 'MOTORBIKE'
        and motorbike.publication_status = 'published'
        and public.is_current_motorbike_source(motorbike.supplier_id, motorbike.source_external_ref_id))
      or component.component_type = 'CUSTOM'
    )
  order by component.package_id, component.sort_order, component.component_key;
$$;

create or replace function public.get_public_package_price_rules(target_package_ids uuid[])
returns table (
  package_id uuid,
  price_vnd integer,
  effective_from date,
  effective_until date,
  adults_min integer,
  adults_max integer,
  children_min integer,
  children_max integer,
  rooms_min integer,
  rooms_max integer,
  selected_optional_component_keys text[],
  priority integer,
  price_source text,
  verified_at timestamptz,
  price_valid_until date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    rule.package_id, rule.price_vnd, rule.effective_from, rule.effective_until,
    rule.adults_min, rule.adults_max, rule.children_min, rule.children_max,
    rule.rooms_min, rule.rooms_max, rule.selected_optional_component_keys,
    rule.priority, rule.price_source, rule.verified_at, rule.price_valid_until
  from public.package_price_rules rule
  where rule.package_id = any(coalesce(target_package_ids, '{}'::uuid[]))
    and rule.is_active
    and public.is_package_public(rule.package_id);
$$;

create or replace function public.save_package_commerce(
  target_package_id uuid,
  target_destination_id uuid,
  target_code text,
  target_slug text,
  target_name text,
  target_proposition text,
  target_description text,
  target_lifecycle_status text,
  target_valid_from date,
  target_valid_until date,
  target_confirmation_mode text,
  target_public_request_url text,
  target_is_featured boolean,
  target_sort_order integer,
  target_hero_media_id uuid,
  target_internal_notes text,
  target_components jsonb,
  target_price_rules jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  item jsonb;
  rule jsonb;
  optional_keys text[];
begin
  if not (select public.is_admin()) then
    raise exception 'Package changes require admin';
  end if;
  if jsonb_typeof(coalesce(target_components, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(target_price_rules, '[]'::jsonb)) <> 'array' then
    raise exception 'Package components and price rules must be arrays';
  end if;

  if target_package_id is null then
    insert into public.packages (
      destination_id, code, slug, name, proposition, description,
      lifecycle_status, valid_from, valid_until, confirmation_mode,
      public_request_url, is_featured, sort_order, hero_media_id,
      internal_notes, created_by, updated_by
    ) values (
      target_destination_id, target_code, target_slug, target_name,
      target_proposition, target_description, target_lifecycle_status,
      target_valid_from, target_valid_until, target_confirmation_mode,
      target_public_request_url, target_is_featured, target_sort_order,
      target_hero_media_id, target_internal_notes, auth.uid(), auth.uid()
    ) returning id into saved_id;
  else
    select id into saved_id from public.packages where id = target_package_id for update;
    if not found then raise exception 'Package not found'; end if;
    update public.packages set
      destination_id = target_destination_id,
      code = target_code,
      slug = target_slug,
      name = target_name,
      proposition = target_proposition,
      description = target_description,
      lifecycle_status = target_lifecycle_status,
      valid_from = target_valid_from,
      valid_until = target_valid_until,
      confirmation_mode = target_confirmation_mode,
      public_request_url = target_public_request_url,
      is_featured = target_is_featured,
      sort_order = target_sort_order,
      hero_media_id = target_hero_media_id,
      internal_notes = target_internal_notes,
      updated_by = auth.uid()
    where id = saved_id;
  end if;

  delete from public.package_price_rules where package_id = saved_id;
  delete from public.package_components component
  where component.package_id = saved_id
    and not exists (
      select 1 from jsonb_array_elements(coalesce(target_components, '[]'::jsonb)) incoming
      where lower(btrim(incoming->>'component_key')) = component.component_key
    );

  for item in select value from jsonb_array_elements(coalesce(target_components, '[]'::jsonb))
  loop
    insert into public.package_components (
      package_id, component_key, component_type, room_type_id,
      motorbike_offering_id, custom_code, custom_name, custom_description,
      is_required, quantity, sort_order, confirmation_mode,
      public_copy_override, unit_cost_vnd, cost_source, cost_verified_at,
      cost_valid_until, internal_notes, created_by, updated_by
    ) values (
      saved_id,
      item->>'component_key',
      item->>'component_type',
      nullif(item->>'room_type_id', '')::uuid,
      nullif(item->>'motorbike_offering_id', '')::uuid,
      item->>'custom_code',
      item->>'custom_name',
      item->>'custom_description',
      coalesce((item->>'is_required')::boolean, true),
      coalesce((item->>'quantity')::integer, 1),
      coalesce((item->>'sort_order')::integer, 0),
      coalesce(item->>'confirmation_mode', 'manual'),
      item->>'public_copy_override',
      nullif(item->>'unit_cost_vnd', '')::integer,
      item->>'cost_source',
      nullif(item->>'cost_verified_at', '')::timestamptz,
      nullif(item->>'cost_valid_until', '')::date,
      item->>'internal_notes',
      auth.uid(), auth.uid()
    )
    on conflict (package_id, component_key) do update set
      component_type = excluded.component_type,
      room_type_id = excluded.room_type_id,
      motorbike_offering_id = excluded.motorbike_offering_id,
      custom_code = excluded.custom_code,
      custom_name = excluded.custom_name,
      custom_description = excluded.custom_description,
      is_required = excluded.is_required,
      quantity = excluded.quantity,
      sort_order = excluded.sort_order,
      confirmation_mode = excluded.confirmation_mode,
      public_copy_override = excluded.public_copy_override,
      unit_cost_vnd = excluded.unit_cost_vnd,
      cost_source = excluded.cost_source,
      cost_verified_at = excluded.cost_verified_at,
      cost_valid_until = excluded.cost_valid_until,
      internal_notes = excluded.internal_notes,
      updated_by = auth.uid();
  end loop;

  for rule in select value from jsonb_array_elements(coalesce(target_price_rules, '[]'::jsonb))
  loop
    optional_keys := coalesce((
      select array_agg(selected.value order by selected.value)
      from jsonb_array_elements_text(coalesce(rule->'selected_optional_component_keys', '[]'::jsonb)) as selected(value)
    ), '{}'::text[]);
    insert into public.package_price_rules (
      package_id, rule_key, price_vnd, effective_from, effective_until,
      adults_min, adults_max, children_min, children_max, rooms_min,
      rooms_max, selected_optional_component_keys, priority, price_source,
      verified_at, price_valid_until, is_active, internal_notes,
      created_by, updated_by
    ) values (
      saved_id, rule->>'rule_key', (rule->>'price_vnd')::integer,
      nullif(rule->>'effective_from', '')::date,
      nullif(rule->>'effective_until', '')::date,
      nullif(rule->>'adults_min', '')::integer,
      nullif(rule->>'adults_max', '')::integer,
      nullif(rule->>'children_min', '')::integer,
      nullif(rule->>'children_max', '')::integer,
      nullif(rule->>'rooms_min', '')::integer,
      nullif(rule->>'rooms_max', '')::integer,
      optional_keys,
      coalesce((rule->>'priority')::integer, 0),
      rule->>'price_source',
      (rule->>'verified_at')::timestamptz,
      (rule->>'price_valid_until')::date,
      coalesce((rule->>'is_active')::boolean, true),
      rule->>'internal_notes', auth.uid(), auth.uid()
    );
  end loop;

  perform public.assert_package_publishable(saved_id);
  return saved_id;
end;
$$;

create or replace function public.guard_package_media_archive()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.is_active is true and new.is_active is false and exists (
    select 1 from public.packages package
    where package.hero_media_id = old.id and package.lifecycle_status <> 'archived'
  ) then
    raise exception 'CMS media is still referenced by a package';
  end if;
  return new;
end;
$$;

create trigger cms_media_package_archive_guard
before update of is_active on public.cms_media_assets
for each row execute function public.guard_package_media_archive();

revoke all on function public.guard_package() from public;
revoke all on function public.guard_package_component() from public;
revoke all on function public.guard_package_price_rule() from public;
revoke all on function public.assert_package_publishable(uuid) from public;
revoke all on function public.is_package_public(uuid) from public;
revoke all on function public.get_public_package_components(uuid[]) from public;
revoke all on function public.get_public_package_price_rules(uuid[]) from public;
revoke all on function public.save_package_commerce(uuid, uuid, text, text, text, text, text, text, date, date, text, text, boolean, integer, uuid, text, jsonb, jsonb) from public;
revoke all on function public.guard_package_media_archive() from public;

grant execute on function public.is_package_public(uuid) to anon, authenticated;
grant execute on function public.get_public_package_components(uuid[]) to anon, authenticated;
grant execute on function public.get_public_package_price_rules(uuid[]) to anon, authenticated;
grant execute on function public.save_package_commerce(uuid, uuid, text, text, text, text, text, text, date, date, text, text, boolean, integer, uuid, text, jsonb, jsonb) to authenticated;

comment on table public.packages is
  'V2 Phase 6 package identity and publication lifecycle. It is not a booking or reservation.';
comment on table public.package_components is
  'Generic package composition with real ROOM/MOTORBIKE sources and controlled CUSTOM facts. Private cost snapshots are never anonymous.';
comment on table public.package_price_rules is
  'Explicit deterministic total package sell-price rules. Component standalone prices never imply a package price.';
comment on view public.public_packages is
  'Published package identity and CMS media only; no private economics, notes, audit users, or source mappings.';
comment on function public.get_public_package_components(uuid[]) is
  'Sanitized published package components; hides internal source UUIDs, costs, notes, Supplier details, and Biker mappings.';
comment on function public.get_public_package_price_rules(uuid[]) is
  'Sanitized active package price facts without internal rule identities or notes.';
comment on function public.save_package_commerce(uuid, uuid, text, text, text, text, text, text, date, date, text, text, boolean, integer, uuid, text, jsonb, jsonb) is
  'Admin-only atomic package, component, and price-rule save. Creates no customer intent or booking.';
