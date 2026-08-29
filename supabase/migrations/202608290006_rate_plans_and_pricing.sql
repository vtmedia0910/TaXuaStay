-- Tà Xùa Stay Phase 5: rate plans, deterministic nightly rules, and safe public pricing reads.
-- Prices are integer VND. This migration intentionally adds no inventory, availability, or bookings.

create table public.rate_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  currency text not null default 'VND',
  valid_from date,
  valid_until date,
  priority integer not null default 0,
  is_active boolean not null default true,
  publish_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint rate_plans_code_format check (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint rate_plans_name_length check (char_length(name) between 2 and 120),
  constraint rate_plans_description_length check (description is null or char_length(description) <= 3000),
  constraint rate_plans_currency_vnd check (currency = 'VND'),
  constraint rate_plans_dates_order check (valid_from is null or valid_until is null or valid_from <= valid_until),
  constraint rate_plans_priority_range check (priority between -10000 and 10000),
  constraint rate_plans_publish_status check (publish_status in ('draft', 'published', 'archived')),
  constraint rate_plans_published_active check (publish_status <> 'published' or is_active),
  constraint rate_plans_archived_inactive check (publish_status <> 'archived' or not is_active),
  unique (property_id, code)
);

create table public.room_rate_rules (
  id uuid primary key default gen_random_uuid(),
  rate_plan_id uuid not null references public.rate_plans(id) on delete restrict,
  room_type_id uuid not null references public.room_types(id) on delete restrict,
  rate_type text not null,
  price_vnd integer not null,
  extra_adult_vnd integer,
  extra_child_vnd integer,
  valid_from date,
  valid_until date,
  days_of_week smallint[],
  priority integer not null default 0,
  source text not null default 'admin',
  price_verified_at timestamptz,
  price_valid_until date,
  is_active boolean not null default true,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  constraint room_rate_rules_rate_type check (
    rate_type in ('weekday', 'weekend', 'peak', 'holiday', 'override')
  ),
  constraint room_rate_rules_price_nonnegative check (price_vnd >= 0),
  constraint room_rate_rules_extra_adult_nonnegative check (extra_adult_vnd is null or extra_adult_vnd >= 0),
  constraint room_rate_rules_extra_child_nonnegative check (extra_child_vnd is null or extra_child_vnd >= 0),
  constraint room_rate_rules_dates_order check (valid_from is null or valid_until is null or valid_from <= valid_until),
  constraint room_rate_rules_bounded_special_dates check (
    rate_type in ('weekday', 'weekend') or (valid_from is not null and valid_until is not null)
  ),
  constraint room_rate_rules_days_valid check (
    days_of_week is null
    or (
      cardinality(days_of_week) between 1 and 7
      and days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]
    )
  ),
  constraint room_rate_rules_priority_range check (priority between -10000 and 10000),
  constraint room_rate_rules_source check (
    source in ('partner', 'admin', 'contract', 'import', 'reference', 'other')
  ),
  constraint room_rate_rules_notes_length check (internal_notes is null or char_length(internal_notes) <= 3000)
);

create or replace function public.validate_room_rate_rule_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan_property_id uuid;
  room_property_id uuid;
begin
  select property_id into plan_property_id
  from public.rate_plans
  where id = new.rate_plan_id;

  select property_id into room_property_id
  from public.room_types
  where id = new.room_type_id;

  if plan_property_id is null or room_property_id is null or plan_property_id <> room_property_id then
    raise exception 'Rate plan and room type must belong to the same property';
  end if;

  if new.price_verified_at is not null and new.price_verified_at > now() then
    raise exception 'Price verification timestamp cannot be in the future';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_room_rate_rule_ownership() from public;

create or replace function public.protect_rate_rule_owner_links()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.property_id is distinct from old.property_id then
    if tg_table_name = 'rate_plans' and exists (
      select 1 from public.room_rate_rules where rate_plan_id = old.id
    ) then
      raise exception 'Cannot move a rate plan after room rules have been attached';
    end if;
    if tg_table_name = 'room_types' and exists (
      select 1 from public.room_rate_rules where room_type_id = old.id
    ) then
      raise exception 'Cannot move a room type after rate rules have been attached';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_rate_rule_owner_links() from public;

create trigger rate_plans_set_updated_at
before update on public.rate_plans
for each row execute function public.set_updated_at();
create trigger rate_plans_set_updated_by
before update on public.rate_plans
for each row execute function public.set_updated_by();
create trigger room_rate_rules_set_updated_at
before update on public.room_rate_rules
for each row execute function public.set_updated_at();
create trigger room_rate_rules_set_updated_by
before update on public.room_rate_rules
for each row execute function public.set_updated_by();
create trigger room_rate_rules_validate_ownership
before insert or update of rate_plan_id, room_type_id, price_verified_at on public.room_rate_rules
for each row execute function public.validate_room_rate_rule_ownership();
create trigger rate_plans_protect_owner_links
before update of property_id on public.rate_plans
for each row execute function public.protect_rate_rule_owner_links();
create trigger room_types_protect_rate_owner_links
before update of property_id on public.room_types
for each row execute function public.protect_rate_rule_owner_links();

create index rate_plans_property_status_index
  on public.rate_plans (property_id, publish_status, is_active, priority desc);
create index room_rate_rules_room_active_dates_index
  on public.room_rate_rules (room_type_id, is_active, valid_from, valid_until);
create index room_rate_rules_plan_priority_index
  on public.room_rate_rules (rate_plan_id, rate_type, priority desc);

alter table public.rate_plans enable row level security;
alter table public.room_rate_rules enable row level security;

revoke all on table public.rate_plans from anon, authenticated;
revoke all on table public.room_rate_rules from anon, authenticated;

-- Explicit anonymous column grants keep future internal fields private by default.
grant select (
  id, property_id, currency, valid_from, valid_until, priority, is_active, publish_status
) on table public.rate_plans to anon;
grant select (
  id, rate_plan_id, room_type_id, rate_type, price_vnd, extra_adult_vnd,
  extra_child_vnd, valid_from, valid_until, days_of_week, priority, source,
  price_verified_at, price_valid_until, is_active
) on table public.room_rate_rules to anon;

grant select, insert, update on table public.rate_plans to authenticated;
grant select, insert, update on table public.room_rate_rules to authenticated;

create policy "public reads published rate plans"
on public.rate_plans for select to anon
using (
  is_active
  and publish_status = 'published'
  and (select public.is_property_public(property_id))
);
create policy "staff manages rate plans"
on public.rate_plans for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create policy "public reads active room rate rules"
on public.room_rate_rules for select to anon
using (
  is_active
  and (select public.is_room_public(room_type_id))
  and exists (
    select 1
    from public.rate_plans as plan
    where plan.id = rate_plan_id
      and plan.is_active
      and plan.publish_status = 'published'
      and (select public.is_property_public(plan.property_id))
  )
);
create policy "staff manages room rate rules"
on public.room_rate_rules for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create view public.public_room_rate_rules
with (security_invoker = true)
as
select
  rule.id as rule_id,
  rule.rate_plan_id,
  plan.property_id,
  rule.room_type_id,
  rule.rate_type,
  rule.price_vnd,
  rule.extra_adult_vnd,
  rule.extra_child_vnd,
  rule.valid_from as rule_valid_from,
  rule.valid_until as rule_valid_until,
  rule.days_of_week,
  rule.priority as rule_priority,
  plan.priority as plan_priority,
  rule.source,
  rule.price_verified_at,
  rule.price_valid_until,
  plan.valid_from as plan_valid_from,
  plan.valid_until as plan_valid_until
from public.room_rate_rules as rule
join public.rate_plans as plan on plan.id = rule.rate_plan_id
where rule.is_active
  and plan.is_active
  and plan.publish_status = 'published';

revoke all on table public.public_room_rate_rules from public, anon, authenticated;
grant select on table public.public_room_rate_rules to anon, authenticated;

comment on table public.rate_plans is
  'Phase 5 property-level VND pricing plans. Published means publicly eligible, not room availability.';
comment on table public.room_rate_rules is
  'Phase 5 nightly room price facts. Weekday is Monday-Thursday and weekend is Friday-Sunday unless days_of_week is explicit.';
comment on view public.public_room_rate_rules is
  'Least-privilege flattened pricing facts for the application resolver; contains no internal notes, names, or staff identifiers.';
