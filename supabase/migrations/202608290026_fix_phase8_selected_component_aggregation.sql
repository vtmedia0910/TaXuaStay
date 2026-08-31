-- A Package component that is optional in catalog configuration becomes part of
-- the operational request when the traveler selects it. Aggregate every
-- persisted service item with a confirmation workflow; Package parent rows use
-- not_required and remain excluded. Migrations 024–025 are remote-applied and
-- immutable.

create or replace function public.phase8_recompute_confirmation(target_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_status text;
  previous_status text;
  actor text;
begin
  select confirmation_status
  into previous_status
  from public.bookings
  where id = target_booking_id;

  select case
    when lifecycle_status = 'cancelled' then 'cancelled'
    when not exists (
      select 1 from public.booking_items item
      where item.booking_id = target_booking_id
        and item.confirmation_status <> 'not_required'
    ) then 'pending'
    when exists (
      select 1 from public.booking_items item
      where item.booking_id = target_booking_id
        and item.confirmation_status in ('declined', 'expired', 'cancelled')
    ) then 'failed'
    when not exists (
      select 1 from public.booking_items item
      where item.booking_id = target_booking_id
        and item.confirmation_status not in ('confirmed', 'not_required')
    ) then 'confirmed'
    when exists (
      select 1 from public.booking_items item
      where item.booking_id = target_booking_id
        and item.confirmation_status = 'confirmed'
    ) then 'partial'
    else 'pending'
  end
  into next_status
  from public.bookings
  where id = target_booking_id;

  update public.bookings
  set confirmation_status = next_status,
      updated_at = now(),
      updated_by = auth.uid()
  where id = target_booking_id
    and confirmation_status is distinct from next_status;

  if found then
    actor := case
      when (select public.is_admin()) then 'admin'
      when (select public.is_staff_or_admin()) then 'staff'
      else 'system'
    end;
    insert into public.booking_events (
      booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id
    ) values (
      target_booking_id,
      'booking_confirmation_changed',
      case next_status
        when 'confirmed' then 'Tất cả dịch vụ đã chọn cần xác nhận đã được xác nhận.'
        when 'partial' then 'Một phần dịch vụ đã được xác nhận.'
        when 'failed' then 'Có dịch vụ đã chọn không thể xác nhận.'
        when 'cancelled' then 'Quy trình xác nhận đã được hủy.'
        else 'Đội ngũ đang kiểm tra từng dịch vụ.'
      end,
      jsonb_build_object('previous_status', previous_status, 'next_status', next_status),
      actor,
      auth.uid()
    );
  end if;
end;
$$;

revoke all on function public.phase8_recompute_confirmation(uuid) from public, anon, authenticated;

comment on function public.phase8_recompute_confirmation(uuid) is
  'Derives Booking confirmation from every selected service item. Catalog-optional Package components count after traveler selection; Package parent rows remain not_required.';
