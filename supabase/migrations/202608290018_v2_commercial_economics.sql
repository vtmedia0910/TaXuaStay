-- Tà Xùa Trip V2 Phase 4: private accommodation commercial economics.
-- Customer sell price remains owned by rate_plans/room_rate_rules. These tables
-- are private, contain no production seed data, and have no anonymous access.

create table public.commercial_rate_plans (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  code text not null,
  name text not null,
  currency text not null default 'VND',
  valid_from date,
  valid_until date,
  priority integer not null default 0,
  status text not null default 'draft',
  source text not null default 'admin',
  contract_reference text,
  notes_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint commercial_rate_plans_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint commercial_rate_plans_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint commercial_rate_plans_currency_vnd check (currency = 'VND'),
  constraint commercial_rate_plans_dates_order check (valid_from is null or valid_until is null or valid_from <= valid_until),
  constraint commercial_rate_plans_priority_range check (priority between -10000 and 10000),
  constraint commercial_rate_plans_status_valid check (status in ('draft', 'active', 'paused', 'expired', 'archived')),
  constraint commercial_rate_plans_source_valid check (source in ('partner', 'admin', 'contract', 'import', 'reference', 'other')),
  constraint commercial_rate_plans_contract_length check (contract_reference is null or char_length(btrim(contract_reference)) between 1 and 500),
  constraint commercial_rate_plans_notes_length check (notes_internal is null or char_length(notes_internal) <= 10000),
  unique (supplier_id, property_id, code)
);

create table public.room_commercial_rules (
  id uuid primary key default gen_random_uuid(),
  commercial_rate_plan_id uuid not null references public.commercial_rate_plans(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  room_type_id uuid not null references public.room_types(id) on delete restrict,
  rate_type text not null,
  net_cost_vnd integer,
  market_reference_vnd integer,
  effective_from date,
  effective_until date,
  iso_weekdays smallint[],
  priority integer not null default 0,
  source text not null default 'admin',
  verified_at timestamptz,
  valid_until date,
  is_active boolean not null default true,
  notes_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint room_commercial_rules_rate_type_valid check (rate_type in ('weekday', 'weekend', 'peak', 'holiday', 'override')),
  constraint room_commercial_rules_net_cost_nonnegative check (net_cost_vnd is null or net_cost_vnd >= 0),
  constraint room_commercial_rules_market_nonnegative check (market_reference_vnd is null or market_reference_vnd >= 0),
  constraint room_commercial_rules_value_required check (net_cost_vnd is not null or market_reference_vnd is not null),
  constraint room_commercial_rules_dates_order check (effective_from is null or effective_until is null or effective_from <= effective_until),
  constraint room_commercial_rules_bounded_special_dates check (
    rate_type in ('weekday', 'weekend') or (effective_from is not null and effective_until is not null)
  ),
  constraint room_commercial_rules_weekdays_valid check (
    iso_weekdays is null
    or (
      cardinality(iso_weekdays) between 1 and 7
      and iso_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
    )
  ),
  constraint room_commercial_rules_priority_range check (priority between -10000 and 10000),
  constraint room_commercial_rules_source_valid check (source in ('partner', 'admin', 'contract', 'import', 'reference', 'other')),
  constraint room_commercial_rules_notes_length check (notes_internal is null or char_length(notes_internal) <= 10000)
);

create index commercial_rate_plans_supplier_property_status_index
  on public.commercial_rate_plans (supplier_id, property_id, status, priority desc);
create index commercial_rate_plans_property_status_index
  on public.commercial_rate_plans (property_id, status, valid_from, valid_until);
create index room_commercial_rules_room_active_dates_index
  on public.room_commercial_rules (room_type_id, is_active, effective_from, effective_until);
create index room_commercial_rules_plan_precedence_index
  on public.room_commercial_rules (commercial_rate_plan_id, rate_type, priority desc);
create index room_commercial_rules_supplier_property_index
  on public.room_commercial_rules (supplier_id, property_id, room_type_id);

create or replace function public.has_current_supplier_property_relationship(
  target_supplier_id uuid,
  target_property_id uuid,
  target_date date default (timezone('Asia/Ho_Chi_Minh', now()))::date
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.supplier_properties as link
    join public.suppliers as supplier on supplier.id = link.supplier_id
    where link.supplier_id = target_supplier_id
      and link.property_id = target_property_id
      and supplier.status <> 'archived'
      and (link.valid_from is null or link.valid_from <= target_date)
      and (link.valid_until is null or link.valid_until >= target_date)
  );
$$;

create or replace function public.validate_commercial_rate_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  vietnam_today date := (timezone('Asia/Ho_Chi_Minh', now()))::date;
begin
  if tg_op = 'UPDATE' then
    if new.supplier_id is distinct from old.supplier_id
      or new.property_id is distinct from old.property_id
      or new.code is distinct from old.code then
      raise exception 'Commercial plan ownership and code are immutable';
    end if;
    if old.status = 'archived' and new.status <> 'archived' then
      raise exception 'Archived commercial plans cannot be reactivated';
    end if;
  end if;

  if new.status = 'active' then
    if new.valid_until is not null and new.valid_until < vietnam_today then
      raise exception 'An active commercial plan cannot already be expired';
    end if;
    if not (select public.has_current_supplier_property_relationship(new.supplier_id, new.property_id, vietnam_today)) then
      raise exception 'Active commercial plan requires a current Supplier and Property relationship';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_room_commercial_rule()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan_supplier_id uuid;
  plan_property_id uuid;
  plan_status text;
  plan_valid_from date;
  plan_valid_until date;
  room_property_id uuid;
  vietnam_today date := (timezone('Asia/Ho_Chi_Minh', now()))::date;
begin
  if tg_op = 'UPDATE' and (
    new.commercial_rate_plan_id is distinct from old.commercial_rate_plan_id
    or new.supplier_id is distinct from old.supplier_id
    or new.property_id is distinct from old.property_id
    or new.room_type_id is distinct from old.room_type_id
  ) then
    raise exception 'Commercial rule ownership is immutable';
  end if;

  select supplier_id, property_id, status, valid_from, valid_until
  into plan_supplier_id, plan_property_id, plan_status, plan_valid_from, plan_valid_until
  from public.commercial_rate_plans
  where id = new.commercial_rate_plan_id;

  select property_id into room_property_id
  from public.room_types
  where id = new.room_type_id;

  if plan_supplier_id is null or room_property_id is null
    or plan_supplier_id <> new.supplier_id
    or plan_property_id <> new.property_id
    or room_property_id <> new.property_id then
    raise exception 'Commercial plan, Supplier, Property, and Room Type ownership must match';
  end if;

  if new.verified_at is not null and new.verified_at > now() then
    raise exception 'Commercial verification timestamp cannot be in the future';
  end if;
  if new.verified_at is not null and new.valid_until is not null
    and new.valid_until < (new.verified_at at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception 'Commercial validity cannot end before its Vietnam verification date';
  end if;
  if new.is_active and plan_status in ('expired', 'archived') then
    raise exception 'An active commercial rule cannot belong to an expired or archived plan';
  end if;
  if new.is_active and not (
    select public.has_current_supplier_property_relationship(new.supplier_id, new.property_id, vietnam_today)
  ) then
    raise exception 'Active commercial rule requires a current Supplier and Property relationship';
  end if;
  if new.is_active and (
    (plan_valid_until is not null and new.effective_from is not null and new.effective_from > plan_valid_until)
    or (new.effective_until is not null and plan_valid_from is not null and new.effective_until < plan_valid_from)
  ) then
    raise exception 'Active commercial rule must overlap its commercial plan date range';
  end if;
  return new;
end;
$$;

create or replace function public.validate_commercial_plan_rule_ranges()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.room_commercial_rules as rule
    where rule.commercial_rate_plan_id = new.id
      and rule.is_active
      and (
        (new.valid_until is not null and rule.effective_from is not null and rule.effective_from > new.valid_until)
        or (rule.effective_until is not null and new.valid_from is not null and rule.effective_until < new.valid_from)
      )
  ) then
    raise exception 'Commercial plan date range must overlap every active commercial rule';
  end if;
  return new;
end;
$$;

create or replace function public.close_terminal_commercial_plan_rules()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status in ('expired', 'archived') and old.status is distinct from new.status then
    update public.room_commercial_rules
    set is_active = false
    where commercial_rate_plan_id = new.id and is_active;
  end if;
  return new;
end;
$$;

create or replace function public.protect_active_commercial_relationship()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  vietnam_today date := (timezone('Asia/Ho_Chi_Minh', now()))::date;
  replacement_is_current boolean := false;
begin
  if tg_op = 'UPDATE' then
    replacement_is_current := (new.valid_from is null or new.valid_from <= vietnam_today)
      and (new.valid_until is null or new.valid_until >= vietnam_today);
    if replacement_is_current then
      return new;
    end if;
  end if;

  if exists (
    select 1 from public.commercial_rate_plans as plan
    where plan.supplier_id = old.supplier_id
      and plan.property_id = old.property_id
      and plan.status = 'active'
  ) and not exists (
    select 1 from public.supplier_properties as link
    where link.id <> old.id
      and link.supplier_id = old.supplier_id
      and link.property_id = old.property_id
      and (link.valid_from is null or link.valid_from <= vietnam_today)
      and (link.valid_until is null or link.valid_until >= vietnam_today)
  ) then
    raise exception 'Expire or pause active commercial plans before ending the Supplier and Property relationship';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.has_current_supplier_property_relationship(uuid, uuid, date) from public;
revoke all on function public.validate_commercial_rate_plan() from public;
revoke all on function public.validate_room_commercial_rule() from public;
revoke all on function public.validate_commercial_plan_rule_ranges() from public;
revoke all on function public.close_terminal_commercial_plan_rules() from public;
revoke all on function public.protect_active_commercial_relationship() from public;
grant execute on function public.has_current_supplier_property_relationship(uuid, uuid, date) to authenticated;

create trigger commercial_rate_plans_set_updated_at
before update on public.commercial_rate_plans
for each row execute function public.set_updated_at();
create trigger commercial_rate_plans_set_updated_by
before update on public.commercial_rate_plans
for each row execute function public.set_updated_by();
create trigger commercial_rate_plans_validate
before insert or update on public.commercial_rate_plans
for each row execute function public.validate_commercial_rate_plan();
create trigger commercial_rate_plans_validate_rule_ranges
before update of valid_from, valid_until on public.commercial_rate_plans
for each row execute function public.validate_commercial_plan_rule_ranges();
create trigger commercial_rate_plans_close_terminal_rules
after update of status on public.commercial_rate_plans
for each row execute function public.close_terminal_commercial_plan_rules();

create trigger room_commercial_rules_set_updated_at
before update on public.room_commercial_rules
for each row execute function public.set_updated_at();
create trigger room_commercial_rules_set_updated_by
before update on public.room_commercial_rules
for each row execute function public.set_updated_by();
create trigger room_commercial_rules_validate
before insert or update on public.room_commercial_rules
for each row execute function public.validate_room_commercial_rule();

create trigger supplier_properties_protect_active_commercial
before update of valid_from, valid_until or delete on public.supplier_properties
for each row execute function public.protect_active_commercial_relationship();

alter table public.commercial_rate_plans enable row level security;
alter table public.room_commercial_rules enable row level security;

revoke all on table public.commercial_rate_plans from public, anon, authenticated;
revoke all on table public.room_commercial_rules from public, anon, authenticated;
grant select on table public.commercial_rate_plans to authenticated;
grant insert (
  supplier_id, property_id, code, name, currency, valid_from, valid_until,
  priority, status, source, contract_reference, notes_internal
) on table public.commercial_rate_plans to authenticated;
grant update (
  name, valid_from, valid_until, priority, status, source,
  contract_reference, notes_internal
) on table public.commercial_rate_plans to authenticated;
grant select on table public.room_commercial_rules to authenticated;
grant insert (
  commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
  net_cost_vnd, market_reference_vnd, effective_from, effective_until,
  iso_weekdays, priority, source, verified_at, valid_until, is_active, notes_internal
) on table public.room_commercial_rules to authenticated;
grant update (
  rate_type, net_cost_vnd, market_reference_vnd, effective_from,
  effective_until, iso_weekdays, priority, source, verified_at, valid_until,
  is_active, notes_internal
) on table public.room_commercial_rules to authenticated;

create policy "staff reads commercial plans"
on public.commercial_rate_plans for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "admins create commercial plans"
on public.commercial_rate_plans for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update commercial plans"
on public.commercial_rate_plans for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "staff creates draft commercial plans"
on public.commercial_rate_plans for insert to authenticated
with check (
  (select public.current_app_role()) = 'staff'
  and status = 'draft'
  and contract_reference is null
);
create policy "staff updates draft commercial plans"
on public.commercial_rate_plans for update to authenticated
using ((select public.current_app_role()) = 'staff' and status = 'draft')
with check (
  (select public.current_app_role()) = 'staff'
  and status = 'draft'
  and contract_reference is null
);

create policy "staff reads commercial rules"
on public.room_commercial_rules for select to authenticated
using ((select public.is_staff_or_admin()));
create policy "admins create commercial rules"
on public.room_commercial_rules for insert to authenticated
with check ((select public.is_admin()));
create policy "admins update commercial rules"
on public.room_commercial_rules for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "staff creates draft-plan commercial rules"
on public.room_commercial_rules for insert to authenticated
with check (
  (select public.current_app_role()) = 'staff'
  and exists (
    select 1 from public.commercial_rate_plans as plan
    where plan.id = commercial_rate_plan_id and plan.status = 'draft'
  )
);
create policy "staff updates draft-plan commercial rules"
on public.room_commercial_rules for update to authenticated
using (
  (select public.current_app_role()) = 'staff'
  and exists (
    select 1 from public.commercial_rate_plans as plan
    where plan.id = commercial_rate_plan_id and plan.status = 'draft'
  )
)
with check (
  (select public.current_app_role()) = 'staff'
  and exists (
    select 1 from public.commercial_rate_plans as plan
    where plan.id = commercial_rate_plan_id and plan.status = 'draft'
  )
);

-- Extend Phase 3H archive atomically: close private economics first, then the
-- existing operational children, and finally archive the Supplier. Reactivation
-- never reopens these historical plans or rules.
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

  if not found then
    raise exception 'Supplier not found';
  end if;
  if current_status = 'archived' then
    return;
  end if;

  update public.room_commercial_rules
  set is_active = false
  where supplier_id = target_supplier_id and is_active;

  update public.commercial_rate_plans
  set status = 'expired'
  where supplier_id = target_supplier_id
    and status in ('draft', 'active', 'paused');

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

revoke all on function public.archive_supplier(uuid) from public;
grant execute on function public.archive_supplier(uuid) to authenticated;

comment on table public.commercial_rate_plans is
  'Private V2 Phase 4 Supplier and Property commercial terms. Never exposed to anonymous users.';
comment on table public.room_commercial_rules is
  'Private nightly net-cost and market-reference facts. Customer sell price remains in room_rate_rules.';
comment on function public.has_current_supplier_property_relationship(uuid, uuid, date) is
  'Checks an inclusive, non-archived Supplier and Property relationship on a Vietnam business date.';
comment on function public.archive_supplier(uuid) is
  'Admin-only atomic archive that expires private economics, closes operational children, then archives the Supplier.';
