-- Tà Xùa Trip V2 Phase 3: private supplier and partner foundation.
-- This migration adds identities and operational relationships only. It adds no
-- commercial economics, public supplier data, booking, payment, or Biker runtime integration.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text not null unique,
  supplier_type text not null,
  legal_name text,
  display_name text not null,
  status text not null default 'lead',
  tax_code text,
  website_url text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint suppliers_code_format check (supplier_code ~ '^SUP-[A-Z0-9]{2,8}-[0-9]{4,8}$'),
  constraint suppliers_type_valid check (
    supplier_type in ('accommodation', 'motorbike', 'bus', 'transport', 'activity', 'food', 'guide', 'other')
  ),
  constraint suppliers_status_valid check (
    status in ('lead', 'onboarding', 'active', 'paused', 'inactive', 'archived')
  ),
  constraint suppliers_display_name_length check (char_length(btrim(display_name)) between 2 and 160),
  constraint suppliers_legal_name_length check (legal_name is null or char_length(btrim(legal_name)) between 2 and 200),
  constraint suppliers_tax_code_length check (tax_code is null or char_length(btrim(tax_code)) between 2 and 50),
  constraint suppliers_website_https check (website_url is null or website_url ~ '^https://[^[:space:]]+$'),
  constraint suppliers_notes_length check (internal_notes is null or char_length(internal_notes) <= 10000)
);

create table public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  contact_name text not null,
  role_title text,
  phone text,
  email text,
  zalo text,
  contact_type text not null,
  is_primary boolean not null default false,
  notes_internal text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint supplier_contacts_name_length check (char_length(btrim(contact_name)) between 2 and 160),
  constraint supplier_contacts_role_length check (role_title is null or char_length(btrim(role_title)) <= 120),
  constraint supplier_contacts_phone_length check (phone is null or char_length(phone) between 3 and 30),
  constraint supplier_contacts_email_format check (
    email is null or (char_length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  ),
  constraint supplier_contacts_zalo_length check (zalo is null or char_length(btrim(zalo)) between 3 and 160),
  constraint supplier_contacts_method_required check (
    nullif(btrim(coalesce(phone, '')), '') is not null
    or nullif(btrim(coalesce(email, '')), '') is not null
    or nullif(btrim(coalesce(zalo, '')), '') is not null
  ),
  constraint supplier_contacts_type_valid check (
    contact_type in ('owner', 'manager', 'reservation', 'operations', 'accounting', 'emergency', 'other')
  ),
  constraint supplier_contacts_primary_active check (not is_primary or is_active),
  constraint supplier_contacts_notes_length check (notes_internal is null or char_length(notes_internal) <= 5000)
);

create table public.supplier_properties (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  relationship_type text not null,
  is_primary boolean not null default false,
  valid_from date,
  valid_until date,
  notes_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint supplier_properties_type_valid check (
    relationship_type in ('owner', 'operator', 'manager', 'reservation_partner', 'commercial_partner', 'other')
  ),
  constraint supplier_properties_dates_valid check (
    valid_from is null or valid_until is null or valid_until >= valid_from
  ),
  constraint supplier_properties_notes_length check (notes_internal is null or char_length(notes_internal) <= 5000)
);

create table public.partner_relationships (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  status text not null default 'prospect',
  tier text not null default 'standard',
  started_at date,
  reviewed_at date,
  valid_until date,
  ended_at date,
  relationship_notes_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint partner_relationships_status_valid check (status in ('prospect', 'onboarding', 'active', 'paused', 'ended')),
  constraint partner_relationships_tier_valid check (tier in ('standard', 'verified', 'preferred', 'cloud_partner', 'exclusive')),
  constraint partner_relationships_started_required check (
    status not in ('active', 'paused', 'ended') or started_at is not null
  ),
  constraint partner_relationships_end_state check (
    (status = 'ended' and ended_at is not null) or (status <> 'ended' and ended_at is null)
  ),
  constraint partner_relationships_dates_valid check (
    (started_at is null or valid_until is null or valid_until >= started_at)
    and (reviewed_at is null or reviewed_at <= current_date)
  ),
  constraint partner_relationships_notes_length check (
    relationship_notes_internal is null or char_length(relationship_notes_internal) <= 10000
  )
);

create table public.supplier_external_refs (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  system_key text not null,
  external_reference text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint supplier_external_refs_system_key_format check (system_key ~ '^[a-z0-9][a-z0-9_]{1,79}$'),
  constraint supplier_external_refs_reference_length check (char_length(btrim(external_reference)) between 1 and 200),
  constraint supplier_external_refs_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint supplier_external_refs_metadata_size check (pg_column_size(metadata) <= 8192),
  constraint supplier_external_refs_system_reference_unique unique (system_key, external_reference)
);

create index suppliers_admin_filter_index on public.suppliers (status, supplier_type, updated_at desc);
create index supplier_contacts_supplier_index on public.supplier_contacts (supplier_id, is_active desc, is_primary desc);
create index supplier_properties_property_index on public.supplier_properties (property_id, valid_until, relationship_type);
create index supplier_properties_supplier_index on public.supplier_properties (supplier_id, valid_until);
create index partner_relationships_supplier_index on public.partner_relationships (supplier_id, status, updated_at desc);
create index partner_relationships_status_index on public.partner_relationships (status, tier, valid_until);
create index supplier_external_refs_supplier_index on public.supplier_external_refs (supplier_id, is_active desc);

create unique index supplier_contacts_one_active_primary
on public.supplier_contacts (supplier_id)
where is_primary and is_active;

create unique index supplier_properties_one_open_exact_role
on public.supplier_properties (supplier_id, property_id, relationship_type)
where valid_until is null;

create unique index supplier_properties_one_open_primary_role
on public.supplier_properties (property_id, relationship_type)
where is_primary and valid_until is null;

create unique index partner_relationships_one_open_relationship
on public.partner_relationships (supplier_id)
where status <> 'ended';

create or replace function public.protect_supplier_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.supplier_code := upper(btrim(new.supplier_code));
  elsif new.supplier_code is distinct from old.supplier_code then
    raise exception 'Supplier code is immutable';
  end if;
  new.display_name := btrim(new.display_name);
  new.legal_name := nullif(btrim(new.legal_name), '');
  new.tax_code := nullif(btrim(new.tax_code), '');
  new.website_url := nullif(btrim(new.website_url), '');
  return new;
end;
$$;

create or replace function public.normalize_supplier_contact()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.contact_name := btrim(new.contact_name);
  new.role_title := nullif(btrim(new.role_title), '');
  new.phone := nullif(regexp_replace(btrim(new.phone), '[[:space:]().-]+', '', 'g'), '');
  new.email := nullif(lower(btrim(new.email)), '');
  new.zalo := nullif(btrim(new.zalo), '');
  if tg_op = 'UPDATE' and new.supplier_id is distinct from old.supplier_id then
    raise exception 'Supplier contact ownership is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.protect_supplier_property_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.supplier_id is distinct from old.supplier_id
    or new.property_id is distinct from old.property_id
  ) then
    raise exception 'Supplier property ownership is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.protect_supplier_external_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.system_key := lower(btrim(new.system_key));
  new.external_reference := btrim(new.external_reference);
  if tg_op = 'UPDATE' and (
    new.supplier_id is distinct from old.supplier_id
    or new.system_key is distinct from old.system_key
    or new.external_reference is distinct from old.external_reference
  ) then
    raise exception 'External supplier identity is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_overlapping_supplier_property_links()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.supplier_properties existing
    where existing.id is distinct from new.id
      and existing.supplier_id = new.supplier_id
      and existing.property_id = new.property_id
      and existing.relationship_type = new.relationship_type
      and daterange(
        coalesce(existing.valid_from, '-infinity'::date),
        coalesce(existing.valid_until, 'infinity'::date),
        '[]'
      ) && daterange(
        coalesce(new.valid_from, '-infinity'::date),
        coalesce(new.valid_until, 'infinity'::date),
        '[]'
      )
  ) then
    raise exception 'Overlapping duplicate supplier property relationship';
  end if;

  if new.is_primary and exists (
    select 1
    from public.supplier_properties existing
    where existing.id is distinct from new.id
      and existing.property_id = new.property_id
      and existing.relationship_type = new.relationship_type
      and existing.is_primary
      and daterange(
        coalesce(existing.valid_from, '-infinity'::date),
        coalesce(existing.valid_until, 'infinity'::date),
        '[]'
      ) && daterange(
        coalesce(new.valid_from, '-infinity'::date),
        coalesce(new.valid_until, 'infinity'::date),
        '[]'
      )
  ) then
    raise exception 'Overlapping primary supplier property relationship';
  end if;
  return new;
end;
$$;

create or replace function public.reject_active_child_for_archived_supplier()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  parent_status text;
  is_current boolean;
begin
  select status into parent_status from public.suppliers where id = new.supplier_id;
  if tg_table_name = 'supplier_contacts' then
    is_current := new.is_active;
  elsif tg_table_name = 'supplier_properties' then
    is_current := new.valid_until is null or new.valid_until >= current_date;
  elsif tg_table_name = 'partner_relationships' then
    is_current := new.status <> 'ended';
  else
    is_current := new.is_active;
  end if;
  if parent_status = 'archived' and is_current then
    raise exception 'Archived supplier must be reactivated before adding an active relationship';
  end if;
  return new;
end;
$$;

create or replace function public.close_archived_supplier_relationships()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'archived' and old.status <> 'archived' then
    update public.supplier_contacts
    set is_active = false, is_primary = false
    where supplier_id = new.id and is_active;

    update public.supplier_properties
    set
      is_primary = false,
      valid_until = greatest(coalesce(valid_from, current_date), current_date)
    where supplier_id = new.id and (valid_until is null or valid_until > current_date);

    update public.partner_relationships
    set
      status = 'ended',
      ended_at = current_date,
      valid_until = coalesce(valid_until, greatest(coalesce(started_at, current_date), current_date))
    where supplier_id = new.id and status <> 'ended';

    update public.supplier_external_refs
    set is_active = false
    where supplier_id = new.id and is_active;
  end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  for table_name in
    select unnest(array[
      'suppliers', 'supplier_contacts', 'supplier_properties',
      'partner_relationships', 'supplier_external_refs'
    ])
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('create trigger %I_set_updated_by before update on public.%I for each row execute function public.set_updated_by()', table_name, table_name);
  end loop;
end;
$$;

create trigger suppliers_protect_identity
before insert or update on public.suppliers
for each row execute function public.protect_supplier_identity();

create trigger supplier_contacts_normalize
before insert or update on public.supplier_contacts
for each row execute function public.normalize_supplier_contact();

create trigger supplier_properties_protect_identity
before update on public.supplier_properties
for each row execute function public.protect_supplier_property_identity();

create trigger supplier_properties_prevent_overlap
before insert or update on public.supplier_properties
for each row execute function public.prevent_overlapping_supplier_property_links();

create trigger supplier_external_refs_protect_identity
before insert or update on public.supplier_external_refs
for each row execute function public.protect_supplier_external_identity();

create trigger supplier_contacts_reject_archived
before insert or update on public.supplier_contacts
for each row execute function public.reject_active_child_for_archived_supplier();
create trigger supplier_properties_reject_archived
before insert or update on public.supplier_properties
for each row execute function public.reject_active_child_for_archived_supplier();
create trigger partner_relationships_reject_archived
before insert or update on public.partner_relationships
for each row execute function public.reject_active_child_for_archived_supplier();
create trigger supplier_external_refs_reject_archived
before insert or update on public.supplier_external_refs
for each row execute function public.reject_active_child_for_archived_supplier();

create trigger suppliers_close_archived_relationships
after update of status on public.suppliers
for each row execute function public.close_archived_supplier_relationships();

alter table public.suppliers enable row level security;
alter table public.supplier_contacts enable row level security;
alter table public.supplier_properties enable row level security;
alter table public.partner_relationships enable row level security;
alter table public.supplier_external_refs enable row level security;

revoke all on table public.suppliers from anon, authenticated;
revoke all on table public.supplier_contacts from anon, authenticated;
revoke all on table public.supplier_properties from anon, authenticated;
revoke all on table public.partner_relationships from anon, authenticated;
revoke all on table public.supplier_external_refs from anon, authenticated;

grant select on table public.suppliers to authenticated;
grant select on table public.supplier_contacts to authenticated;
grant select on table public.supplier_properties to authenticated;
grant select on table public.partner_relationships to authenticated;
grant select on table public.supplier_external_refs to authenticated;

grant insert (supplier_code, supplier_type, legal_name, display_name, status, tax_code, website_url, internal_notes)
on table public.suppliers to authenticated;
grant update (supplier_type, legal_name, display_name, status, tax_code, website_url, internal_notes)
on table public.suppliers to authenticated;

grant insert (supplier_id, contact_name, role_title, phone, email, zalo, contact_type, is_primary, notes_internal, is_active)
on table public.supplier_contacts to authenticated;
grant update (contact_name, role_title, phone, email, zalo, contact_type, is_primary, notes_internal, is_active)
on table public.supplier_contacts to authenticated;

grant insert (supplier_id, property_id, relationship_type, is_primary, valid_from, valid_until, notes_internal)
on table public.supplier_properties to authenticated;
grant update (relationship_type, is_primary, valid_from, valid_until, notes_internal)
on table public.supplier_properties to authenticated;

grant insert (supplier_id, status, tier, started_at, reviewed_at, valid_until, ended_at, relationship_notes_internal)
on table public.partner_relationships to authenticated;
grant update (status, tier, started_at, reviewed_at, valid_until, ended_at, relationship_notes_internal)
on table public.partner_relationships to authenticated;

grant insert (supplier_id, system_key, external_reference, metadata, is_active)
on table public.supplier_external_refs to authenticated;
grant update (metadata, is_active)
on table public.supplier_external_refs to authenticated;

create policy "staff reads suppliers"
on public.suppliers for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "admins create suppliers"
on public.suppliers for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update suppliers"
on public.suppliers for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "staff reads supplier contacts"
on public.supplier_contacts for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "staff creates supplier contacts"
on public.supplier_contacts for insert to authenticated
with check ((select public.is_staff_or_admin()));
create policy "staff updates supplier contacts"
on public.supplier_contacts for update to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "staff reads supplier properties"
on public.supplier_properties for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "staff creates supplier properties"
on public.supplier_properties for insert to authenticated
with check ((select public.is_staff_or_admin()));
create policy "staff updates supplier properties"
on public.supplier_properties for update to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "staff reads partner relationships"
on public.partner_relationships for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "admins create partner relationships"
on public.partner_relationships for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update partner relationships"
on public.partner_relationships for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "staff reads supplier external refs"
on public.supplier_external_refs for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "admins create supplier external refs"
on public.supplier_external_refs for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update supplier external refs"
on public.supplier_external_refs for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create or replace function public.save_supplier_profile(
  target_supplier_id uuid,
  target_supplier_code text,
  target_supplier_type text,
  target_display_name text,
  target_legal_name text,
  target_status text,
  target_tax_code text,
  target_website_url text,
  target_internal_notes text,
  primary_contact_name text,
  primary_contact_type text,
  primary_role_title text,
  primary_phone text,
  primary_email text,
  primary_zalo text,
  primary_notes_internal text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
  has_primary_contact boolean;
begin
  if not (select public.is_admin()) then
    raise exception 'Supplier profile changes require admin';
  end if;

  has_primary_contact := nullif(btrim(coalesce(primary_phone, '')), '') is not null
    or nullif(btrim(coalesce(primary_email, '')), '') is not null
    or nullif(btrim(coalesce(primary_zalo, '')), '') is not null;

  if has_primary_contact and (
    nullif(btrim(coalesce(primary_contact_name, '')), '') is null
    or primary_contact_type is null
  ) then
    raise exception 'Primary contact requires a name and contact type';
  end if;

  if target_supplier_id is null then
    insert into public.suppliers (
      supplier_code, supplier_type, display_name, legal_name, status,
      tax_code, website_url, internal_notes
    ) values (
      target_supplier_code, target_supplier_type, target_display_name,
      target_legal_name, target_status, target_tax_code, target_website_url,
      target_internal_notes
    ) returning id into saved_id;
  else
    perform 1 from public.suppliers
    where id = target_supplier_id
      and supplier_code = upper(btrim(target_supplier_code));
    if not found then raise exception 'Supplier code is immutable'; end if;
    update public.suppliers
    set
      supplier_type = target_supplier_type,
      display_name = target_display_name,
      legal_name = target_legal_name,
      status = target_status,
      tax_code = target_tax_code,
      website_url = target_website_url,
      internal_notes = target_internal_notes
    where id = target_supplier_id
    returning id into saved_id;
    if not found then raise exception 'Supplier not found'; end if;
  end if;

  if has_primary_contact then
    update public.supplier_contacts
    set is_primary = false
    where supplier_id = saved_id and is_primary;
    insert into public.supplier_contacts (
      supplier_id, contact_name, contact_type, role_title, phone, email,
      zalo, notes_internal, is_primary, is_active
    ) values (
      saved_id, primary_contact_name, primary_contact_type, primary_role_title,
      primary_phone, primary_email, primary_zalo, primary_notes_internal, true, true
    );
  end if;

  return saved_id;
end;
$$;

create or replace function public.save_supplier_contact(
  target_contact_id uuid,
  target_supplier_id uuid,
  target_contact_name text,
  target_contact_type text,
  target_role_title text,
  target_phone text,
  target_email text,
  target_zalo text,
  target_notes_internal text,
  target_is_primary boolean,
  target_is_active boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare saved_id uuid;
begin
  if not (select public.is_staff_or_admin()) then raise exception 'Supplier contact changes require staff or admin'; end if;
  perform 1 from public.supplier_contacts where supplier_id = target_supplier_id for update;
  if target_is_primary and target_is_active then
    update public.supplier_contacts set is_primary = false
    where supplier_id = target_supplier_id and is_primary and id is distinct from target_contact_id;
  end if;
  if target_contact_id is null then
    insert into public.supplier_contacts (
      supplier_id, contact_name, contact_type, role_title, phone, email, zalo,
      notes_internal, is_primary, is_active
    ) values (
      target_supplier_id, target_contact_name, target_contact_type, target_role_title,
      target_phone, target_email, target_zalo, target_notes_internal,
      target_is_primary, target_is_active
    ) returning id into saved_id;
  else
    update public.supplier_contacts
    set contact_name = target_contact_name, contact_type = target_contact_type,
      role_title = target_role_title, phone = target_phone, email = target_email,
      zalo = target_zalo, notes_internal = target_notes_internal,
      is_primary = target_is_primary, is_active = target_is_active
    where id = target_contact_id and supplier_id = target_supplier_id
    returning id into saved_id;
    if not found then raise exception 'Supplier contact not found'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.save_supplier_property_link(
  target_link_id uuid,
  target_supplier_id uuid,
  target_property_id uuid,
  target_relationship_type text,
  target_is_primary boolean,
  target_valid_from date,
  target_valid_until date,
  target_notes_internal text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare saved_id uuid;
begin
  if not (select public.is_staff_or_admin()) then raise exception 'Supplier property changes require staff or admin'; end if;
  perform 1 from public.supplier_properties where property_id = target_property_id for update;
  if target_is_primary and target_valid_until is null then
    update public.supplier_properties set is_primary = false
    where property_id = target_property_id
      and relationship_type = target_relationship_type
      and is_primary and valid_until is null
      and id is distinct from target_link_id;
  end if;
  if target_link_id is null then
    insert into public.supplier_properties (
      supplier_id, property_id, relationship_type, is_primary,
      valid_from, valid_until, notes_internal
    ) values (
      target_supplier_id, target_property_id, target_relationship_type,
      target_is_primary, target_valid_from, target_valid_until, target_notes_internal
    ) returning id into saved_id;
  else
    update public.supplier_properties
    set relationship_type = target_relationship_type, is_primary = target_is_primary,
      valid_from = target_valid_from, valid_until = target_valid_until,
      notes_internal = target_notes_internal
    where id = target_link_id and supplier_id = target_supplier_id
    returning id into saved_id;
    if not found then raise exception 'Supplier property link not found'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.save_partner_relationship(
  target_relationship_id uuid,
  target_supplier_id uuid,
  target_status text,
  target_tier text,
  target_started_at date,
  target_reviewed_at date,
  target_valid_until date,
  target_ended_at date,
  target_notes_internal text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
  effective_started_at date := target_started_at;
  effective_ended_at date := target_ended_at;
begin
  if not (select public.is_admin()) then raise exception 'Partner relationship changes require admin'; end if;
  perform 1 from public.partner_relationships where supplier_id = target_supplier_id for update;
  if target_status in ('active', 'paused', 'ended') and effective_started_at is null then
    effective_started_at := current_date;
  end if;
  if target_status = 'ended' then
    effective_ended_at := coalesce(effective_ended_at, current_date);
  else
    effective_ended_at := null;
  end if;
  if target_relationship_id is null then
    insert into public.partner_relationships (
      supplier_id, status, tier, started_at, reviewed_at, valid_until,
      ended_at, relationship_notes_internal
    ) values (
      target_supplier_id, target_status, target_tier, effective_started_at,
      target_reviewed_at, target_valid_until, effective_ended_at, target_notes_internal
    ) returning id into saved_id;
  else
    update public.partner_relationships
    set status = target_status, tier = target_tier, started_at = effective_started_at,
      reviewed_at = target_reviewed_at, valid_until = target_valid_until,
      ended_at = effective_ended_at, relationship_notes_internal = target_notes_internal
    where id = target_relationship_id and supplier_id = target_supplier_id
    returning id into saved_id;
    if not found then raise exception 'Partner relationship not found'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.save_supplier_external_ref(
  target_external_ref_id uuid,
  target_supplier_id uuid,
  target_system_key text,
  target_external_reference text,
  target_metadata jsonb,
  target_is_active boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare saved_id uuid;
begin
  if not (select public.is_admin()) then raise exception 'Supplier external references require admin'; end if;
  if target_external_ref_id is null then
    insert into public.supplier_external_refs (
      supplier_id, system_key, external_reference, metadata, is_active
    ) values (
      target_supplier_id, target_system_key, target_external_reference,
      coalesce(target_metadata, '{}'::jsonb), target_is_active
    ) returning id into saved_id;
  else
    perform 1 from public.supplier_external_refs
    where id = target_external_ref_id
      and supplier_id = target_supplier_id
      and system_key = lower(btrim(target_system_key))
      and external_reference = btrim(target_external_reference);
    if not found then raise exception 'External supplier identity is immutable'; end if;
    update public.supplier_external_refs
    set metadata = coalesce(target_metadata, '{}'::jsonb), is_active = target_is_active
    where id = target_external_ref_id and supplier_id = target_supplier_id
    returning id into saved_id;
    if not found then raise exception 'Supplier external reference not found'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.archive_supplier(target_supplier_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then raise exception 'Supplier archive requires admin'; end if;
  update public.suppliers set status = 'archived' where id = target_supplier_id;
  if not found then raise exception 'Supplier not found'; end if;
end;
$$;

revoke all on function public.protect_supplier_identity() from public;
revoke all on function public.normalize_supplier_contact() from public;
revoke all on function public.protect_supplier_property_identity() from public;
revoke all on function public.protect_supplier_external_identity() from public;
revoke all on function public.prevent_overlapping_supplier_property_links() from public;
revoke all on function public.reject_active_child_for_archived_supplier() from public;
revoke all on function public.close_archived_supplier_relationships() from public;
revoke all on function public.save_supplier_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.save_supplier_contact(uuid, uuid, text, text, text, text, text, text, text, boolean, boolean) from public;
revoke all on function public.save_supplier_property_link(uuid, uuid, uuid, text, boolean, date, date, text) from public;
revoke all on function public.save_partner_relationship(uuid, uuid, text, text, date, date, date, date, text) from public;
revoke all on function public.save_supplier_external_ref(uuid, uuid, text, text, jsonb, boolean) from public;
revoke all on function public.archive_supplier(uuid) from public;

grant execute on function public.save_supplier_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.save_supplier_contact(uuid, uuid, text, text, text, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.save_supplier_property_link(uuid, uuid, uuid, text, boolean, date, date, text) to authenticated;
grant execute on function public.save_partner_relationship(uuid, uuid, text, text, date, date, date, date, text) to authenticated;
grant execute on function public.save_supplier_external_ref(uuid, uuid, text, text, jsonb, boolean) to authenticated;
grant execute on function public.archive_supplier(uuid) to authenticated;

comment on table public.suppliers is 'Private supply-side identity. A supplier is not a public Property and does not imply a Trip partnership.';
comment on table public.supplier_contacts is 'Private operational contacts. No anonymous access or public DTO ownership.';
comment on table public.supplier_properties is 'Historical many-to-many operational relationship between a Supplier and a public Property.';
comment on table public.partner_relationships is 'Private Trip-to-supplier relationship status and tier; never a verification or ranking signal.';
comment on table public.supplier_external_refs is 'Opaque external system identity only; never credentials, tokens, or copied operational data.';
comment on column public.partner_relationships.tier is 'Private commercial relationship classification. It must not alter verification, pricing confidence, availability, or search ranking.';
comment on function public.save_supplier_profile(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text) is 'Admin-only atomic supplier profile and optional first primary-contact save.';
