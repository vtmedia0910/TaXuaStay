-- Tà Xùa Stay Phase 6: date-specific room inventory and public-safe availability facts.
-- This migration intentionally creates no customers, bookings, holds, or booking events.

create table public.room_inventory (
  id uuid primary key default gen_random_uuid(),
  room_type_id uuid not null references public.room_types(id) on delete restrict,
  date date not null,
  available_quantity integer not null,
  price_override_vnd integer,
  source text not null default 'admin',
  verified_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint room_inventory_available_quantity_nonnegative check (available_quantity >= 0),
  constraint room_inventory_price_override_nonnegative check (
    price_override_vnd is null or price_override_vnd >= 0
  ),
  constraint room_inventory_source check (
    source in ('partner', 'admin', 'booking_engine', 'import')
  ),
  unique (room_type_id, date)
);

create or replace function public.validate_room_inventory()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  physical_quantity integer;
begin
  select quantity into physical_quantity
  from public.room_types
  where id = new.room_type_id
  for share;

  if physical_quantity is null then
    raise exception 'Room type does not exist';
  end if;

  if new.available_quantity > physical_quantity then
    raise exception 'Available quantity cannot exceed physical room quantity';
  end if;

  if new.verified_at > now() then
    raise exception 'Availability verification timestamp cannot be in the future';
  end if;

  return new;
end;
$$;

create or replace function public.validate_room_type_inventory_capacity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.quantity < old.quantity and exists (
    select 1
    from public.room_inventory
    where room_type_id = new.id
      and available_quantity > new.quantity
  ) then
    raise exception 'Physical room quantity cannot be lower than recorded inventory';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_room_inventory() from public;
revoke all on function public.validate_room_type_inventory_capacity() from public;

create trigger room_inventory_set_updated_at
before update on public.room_inventory
for each row execute function public.set_updated_at();
create trigger room_inventory_set_updated_by
before insert or update on public.room_inventory
for each row execute function public.set_updated_by();
create trigger room_inventory_validate
before insert or update on public.room_inventory
for each row execute function public.validate_room_inventory();
create trigger room_types_validate_inventory_capacity
before update of quantity on public.room_types
for each row execute function public.validate_room_type_inventory_capacity();

create index room_inventory_date_room_index on public.room_inventory (date, room_type_id);
create index room_inventory_verified_at_index on public.room_inventory (verified_at);

alter table public.room_inventory enable row level security;

revoke all on table public.room_inventory from anon, authenticated;

grant select (
  room_type_id, date, available_quantity, source, verified_at
) on table public.room_inventory to anon;
grant select, insert, update on table public.room_inventory to authenticated;

create policy "public reads inventory for public rooms"
on public.room_inventory for select to anon
using ((select public.is_room_public(room_type_id)));
create policy "staff manages room inventory"
on public.room_inventory for all to authenticated
using ((select public.is_staff_or_admin()))
with check ((select public.is_staff_or_admin()));

create view public.public_room_inventory
with (security_invoker = true)
as
select room_type_id, date, available_quantity, source, verified_at
from public.room_inventory;

revoke all on table public.public_room_inventory from public, anon, authenticated;
grant select on table public.public_room_inventory to anon, authenticated;

create or replace function public.set_room_inventory_range(
  target_room_type_id uuid,
  date_from date,
  date_to date,
  target_available_quantity integer,
  target_source text,
  target_price_override_vnd integer default null,
  target_verified_at timestamptz default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  physical_quantity integer;
  effective_verified_at timestamptz := coalesce(target_verified_at, now());
  affected_rows integer;
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Not authorized';
  end if;

  if date_from is null or date_to is null or date_to < date_from then
    raise exception 'Inventory range is invalid';
  end if;

  if (date_to - date_from + 1) > 365 then
    raise exception 'Inventory range cannot exceed 365 inclusive dates';
  end if;

  if target_available_quantity is null or target_available_quantity < 0 then
    raise exception 'Available quantity cannot be negative';
  end if;

  if target_price_override_vnd is not null and target_price_override_vnd < 0 then
    raise exception 'Price override cannot be negative';
  end if;

  if target_source not in ('partner', 'admin', 'booking_engine', 'import') then
    raise exception 'Inventory source is invalid';
  end if;

  if effective_verified_at > now() then
    raise exception 'Availability verification timestamp cannot be in the future';
  end if;

  select quantity into physical_quantity
  from public.room_types
  where id = target_room_type_id
  for share;

  if physical_quantity is null then
    raise exception 'Room type does not exist';
  end if;

  if target_available_quantity > physical_quantity then
    raise exception 'Available quantity cannot exceed physical room quantity';
  end if;

  insert into public.room_inventory (
    room_type_id, date, available_quantity, price_override_vnd,
    source, verified_at, updated_by
  )
  select
    target_room_type_id,
    generated_date::date,
    target_available_quantity,
    target_price_override_vnd,
    target_source,
    effective_verified_at,
    auth.uid()
  from generate_series(date_from, date_to, interval '1 day') as generated_date
  on conflict (room_type_id, date) do update set
    available_quantity = excluded.available_quantity,
    price_override_vnd = excluded.price_override_vnd,
    source = excluded.source,
    verified_at = excluded.verified_at,
    updated_by = auth.uid();

  get diagnostics affected_rows = row_count;
  return affected_rows;
end;
$$;

revoke all on function public.set_room_inventory_range(
  uuid, date, date, integer, text, integer, timestamptz
) from public;
grant execute on function public.set_room_inventory_range(
  uuid, date, date, integer, text, integer, timestamptz
) to authenticated;

comment on table public.room_inventory is
  'Latest sellable room quantity per room type and lodging-night date. It is not a booking hold or physical room count.';
comment on column public.room_inventory.price_override_vnd is
  'Optional operational VND override stored for future audited pricing integration; Phase 6 public pricing does not consume it.';
comment on view public.public_room_inventory is
  'Allow-listed availability facts for public rooms; staff identifiers and operational price overrides are excluded.';
comment on function public.set_room_inventory_range(uuid, date, date, integer, text, integer, timestamptz) is
  'Atomically upserts one inventory row per inclusive Admin editor date, capped at 365 dates.';
