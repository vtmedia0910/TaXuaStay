-- Harden Phase 5 verification dates and plan/rule range consistency.
-- Migration 006 is already remote and remains immutable. This migration changes no RLS or grants.

do $$
begin
  if exists (
    select 1
    from public.room_rate_rules
    where price_verified_at is not null
      and price_valid_until is not null
      and price_valid_until < (price_verified_at at time zone 'Asia/Ho_Chi_Minh')::date
  ) then
    raise exception 'Existing price validity ends before its Vietnam verification date';
  end if;

  if exists (
    select 1
    from public.room_rate_rules as rule
    join public.rate_plans as plan on plan.id = rule.rate_plan_id
    where rule.is_active
      and (
        (plan.valid_until is not null and rule.valid_from is not null and rule.valid_from > plan.valid_until)
        or (rule.valid_until is not null and plan.valid_from is not null and rule.valid_until < plan.valid_from)
      )
  ) then
    raise exception 'Existing active room rate rule has no effective date overlap with its plan';
  end if;
end;
$$;

create or replace function public.validate_room_rate_rule_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  plan_property_id uuid;
  plan_valid_from date;
  plan_valid_until date;
  room_property_id uuid;
begin
  select property_id, valid_from, valid_until
  into plan_property_id, plan_valid_from, plan_valid_until
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

  if new.price_verified_at is not null
    and new.price_valid_until is not null
    and new.price_valid_until < (new.price_verified_at at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception 'Price validity cannot end before its Vietnam verification date';
  end if;

  if new.is_active and (
    (plan_valid_until is not null and new.valid_from is not null and new.valid_from > plan_valid_until)
    or (new.valid_until is not null and plan_valid_from is not null and new.valid_until < plan_valid_from)
  ) then
    raise exception 'Active room rate rule must overlap its rate plan date range';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_room_rate_rule_ownership() from public;

create or replace function public.validate_rate_plan_rule_ranges()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.room_rate_rules as rule
    where rule.rate_plan_id = new.id
      and rule.is_active
      and (
        (new.valid_until is not null and rule.valid_from is not null and rule.valid_from > new.valid_until)
        or (rule.valid_until is not null and new.valid_from is not null and rule.valid_until < new.valid_from)
      )
  ) then
    raise exception 'Rate plan date range must overlap every active room rate rule';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_rate_plan_rule_ranges() from public;

drop trigger if exists room_rate_rules_validate_ownership on public.room_rate_rules;
create trigger room_rate_rules_validate_ownership
before insert or update on public.room_rate_rules
for each row execute function public.validate_room_rate_rule_ownership();

create trigger rate_plans_validate_rule_ranges
before update of valid_from, valid_until on public.rate_plans
for each row execute function public.validate_rate_plan_rule_ranges();

comment on function public.validate_room_rate_rule_ownership() is
  'Validates rate ownership, non-future verification, Vietnam-calendar price validity, and active plan/rule date overlap.';
comment on function public.validate_rate_plan_rule_ranges() is
  'Prevents rate-plan date edits from making an existing active room-rate rule non-effective.';
