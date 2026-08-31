-- Tà Xùa Trip V2 Phase 3H: harden Supplier archive ordering and primary-contact edits.
-- This additive correction preserves migration 016 and all historical rows.

-- Archive is orchestrated in one RPC before the parent becomes archived. Remove
-- the AFTER cascade that attempted to mutate children after the parent changed.
drop trigger if exists suppliers_close_archived_relationships on public.suppliers;
drop function if exists public.close_archived_supplier_relationships();

create or replace function public.enforce_supplier_archive_path()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'archived'
    and old.status <> 'archived'
    and coalesce(current_setting('app.archive_supplier', true), '') <> 'on'
  then
    raise exception 'Use archive_supplier to archive suppliers';
  end if;
  return new;
end;
$$;

create trigger suppliers_require_archive_rpc
before update of status on public.suppliers
for each row execute function public.enforce_supplier_archive_path();

-- A new explicit RPC avoids an ambiguous overload and carries the current
-- primary-contact identity. Normal profile edits update that row in place.
create or replace function public.save_supplier_profile_v2(
  target_supplier_id uuid,
  target_supplier_code text,
  target_supplier_type text,
  target_display_name text,
  target_legal_name text,
  target_status text,
  target_tax_code text,
  target_website_url text,
  target_internal_notes text,
  primary_contact_id uuid,
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
  current_primary_id uuid;
  has_primary_contact boolean;
  has_primary_details boolean;
begin
  if not (select public.is_admin()) then
    raise exception 'Supplier profile changes require admin';
  end if;

  if target_status = 'archived' then
    raise exception 'Use archive_supplier to archive suppliers';
  end if;

  has_primary_contact := nullif(btrim(coalesce(primary_phone, '')), '') is not null
    or nullif(btrim(coalesce(primary_email, '')), '') is not null
    or nullif(btrim(coalesce(primary_zalo, '')), '') is not null;
  has_primary_details := primary_contact_id is not null
    or nullif(btrim(coalesce(primary_contact_name, '')), '') is not null
    or primary_contact_type is not null
    or nullif(btrim(coalesce(primary_role_title, '')), '') is not null
    or nullif(btrim(coalesce(primary_notes_internal, '')), '') is not null;

  if has_primary_contact and (
    nullif(btrim(coalesce(primary_contact_name, '')), '') is null
    or primary_contact_type is null
  ) then
    raise exception 'Primary contact requires a name and contact type';
  end if;

  if not has_primary_contact and has_primary_details then
    raise exception 'Primary contact requires a phone, email, or Zalo method';
  end if;

  if target_supplier_id is null then
    if primary_contact_id is not null then
      raise exception 'A new supplier cannot reference an existing primary contact';
    end if;
    insert into public.suppliers (
      supplier_code, supplier_type, display_name, legal_name, status,
      tax_code, website_url, internal_notes
    ) values (
      target_supplier_code, target_supplier_type, target_display_name,
      target_legal_name, target_status, target_tax_code, target_website_url,
      target_internal_notes
    ) returning id into saved_id;
  else
    perform 1
    from public.suppliers
    where id = target_supplier_id
      and supplier_code = upper(btrim(target_supplier_code))
    for update;
    if not found then
      raise exception 'Supplier code is immutable or Supplier was not found';
    end if;

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
  end if;

  if has_primary_contact then
    perform 1
    from public.supplier_contacts
    where supplier_id = saved_id
    for update;

    select id
    into current_primary_id
    from public.supplier_contacts
    where supplier_id = saved_id
      and is_primary
      and is_active
    limit 1;

    if primary_contact_id is not null
      and primary_contact_id is distinct from current_primary_id
    then
      raise exception 'Primary contact changed; reload the Supplier before saving';
    end if;

    if current_primary_id is not null then
      update public.supplier_contacts
      set
        contact_name = primary_contact_name,
        contact_type = primary_contact_type,
        role_title = primary_role_title,
        phone = primary_phone,
        email = primary_email,
        zalo = primary_zalo,
        notes_internal = primary_notes_internal,
        is_primary = true,
        is_active = true
      where id = current_primary_id
        and supplier_id = saved_id;
    else
      insert into public.supplier_contacts (
        supplier_id, contact_name, contact_type, role_title, phone, email,
        zalo, notes_internal, is_primary, is_active
      ) values (
        saved_id, primary_contact_name, primary_contact_type, primary_role_title,
        primary_phone, primary_email, primary_zalo, primary_notes_internal, true, true
      );
    end if;
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
declare
  current_status text;
begin
  if not (select public.is_admin()) then
    raise exception 'Supplier archive requires admin';
  end if;

  select status
  into current_status
  from public.suppliers
  where id = target_supplier_id
  for update;

  if not found then
    raise exception 'Supplier not found';
  end if;
  if current_status = 'archived' then
    return;
  end if;

  update public.supplier_contacts
  set is_active = false, is_primary = false
  where supplier_id = target_supplier_id
    and (is_active or is_primary);

  -- valid_until is inclusive. A link closed today remains historical through
  -- today; closure happens while the Supplier is still non-archived so the
  -- archived-child guard keeps its strict meaning.
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
  where supplier_id = target_supplier_id
    and is_active;

  perform set_config('app.archive_supplier', 'on', true);
  update public.suppliers
  set status = 'archived'
  where id = target_supplier_id;
end;
$$;

-- The migration-016 profile RPC inserted a new contact whenever its optional
-- payload was present. Keep the function for schema compatibility but remove
-- authenticated execution so all application writes use the ID-aware v2 RPC.
revoke execute on function public.save_supplier_profile(
  uuid, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text
) from authenticated;

revoke all on function public.enforce_supplier_archive_path() from public;
revoke all on function public.save_supplier_profile_v2(
  uuid, text, text, text, text, text, text, text, text, uuid,
  text, text, text, text, text, text, text
) from public;
grant execute on function public.save_supplier_profile_v2(
  uuid, text, text, text, text, text, text, text, text, uuid,
  text, text, text, text, text, text, text
) to authenticated;

comment on function public.enforce_supplier_archive_path() is
  'Blocks direct non-archived to archived updates; archive_supplier is the single lifecycle orchestrator.';
comment on function public.save_supplier_profile_v2(
  uuid, text, text, text, text, text, text, text, text, uuid,
  text, text, text, text, text, text, text
) is
  'Admin-only atomic Supplier profile save that updates the identified current primary contact in place.';
comment on function public.archive_supplier(uuid) is
  'Admin-only atomic archive: lock Supplier, close current children, then archive the parent. valid_until is inclusive.';
