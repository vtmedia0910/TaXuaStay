-- Corrective V2 Phase 11 trigger migration. Migrations 030–031 are remotely
-- applied and immutable. Resolve NEW fields only inside the matching branch.

create or replace function public.phase11_touch_booking_from_child()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare target_booking_id uuid;
begin
  if tg_table_name = 'booking_item_confirmations' then
    select booking_id into target_booking_id
    from public.booking_items
    where id = new.booking_item_id;
  else
    target_booking_id := new.booking_id;
  end if;
  update public.bookings
  set operations_revision = operations_revision + 1,
      last_operational_activity_at = now(),
      updated_at = greatest(updated_at, now())
  where id = target_booking_id;
  return new;
end;
$$;

revoke all on function public.phase11_touch_booking_from_child() from public,anon,authenticated;

comment on function public.phase11_touch_booking_from_child() is
  'Private Phase 11 revision trigger with table-specific NEW-field resolution.';
