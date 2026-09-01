-- V2 Phase 10: expose only customer-safe verification facts from immutable
-- Booking Item snapshots through the existing code + opaque-token RPC.

create or replace function public.get_public_booking_status(target_booking_code text, target_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare booking_uuid uuid; result jsonb;
begin
  select id into booking_uuid
  from public.bookings
  where booking_code = upper(btrim(target_booking_code))
    and public_access_token_hash = target_token_hash;

  if not found then return null; end if;

  perform public.phase9_sync_checkout_state(booking_uuid);

  select jsonb_build_object(
    'booking_code', b.booking_code,
    'lifecycle_status', b.lifecycle_status,
    'confirmation_status', b.confirmation_status,
    'check_in', b.check_in,
    'check_out', b.check_out,
    'adults', b.adults,
    'children', b.children,
    'rooms', b.rooms,
    'currency', b.currency,
    'quoted_sell_total_vnd', b.quoted_sell_total_vnd,
    'price_status', b.price_status,
    'quoted_at', b.quoted_at,
    'submitted_at', b.submitted_at,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'item_key', i.item_key,
          'component_type', i.component_type,
          'display_name', i.display_name_snapshot,
          'description', i.description_snapshot,
          'parent_name', i.parent_name_snapshot,
          'quantity', i.quantity,
          'is_required', i.is_required,
          'counts_toward_booking_total', i.counts_toward_booking_total,
          'sell_price_vnd', i.sell_price_vnd,
          'price_status', i.price_status,
          'availability_status', i.availability_status,
          'confirmation_status', i.confirmation_status,
          'confirmation_mode', i.confirmation_mode_snapshot,
          'quoted_at', i.quoted_at,
          'verification', jsonb_build_object(
            'room_verified', case
              when i.component_type <> 'ROOM' or not (i.verification_snapshot ? 'room_verified') then null
              when lower(i.verification_snapshot->>'room_verified') = 'true' then true
              when lower(i.verification_snapshot->>'room_verified') = 'false' then false
              else null
            end,
            'cloud_view_verified', case
              when i.component_type <> 'ROOM' or not (i.verification_snapshot ? 'cloud_view') then null
              when jsonb_typeof(i.verification_snapshot->'cloud_view') = 'object' then true
              when jsonb_typeof(i.verification_snapshot->'cloud_view') = 'null' then false
              else null
            end,
            'road_verified', case
              when i.component_type <> 'ROOM' or not (i.verification_snapshot ? 'road') then null
              when jsonb_typeof(i.verification_snapshot->'road') = 'object' then true
              when jsonb_typeof(i.verification_snapshot->'road') = 'null' then false
              else null
            end,
            'road_grade', case
              when i.component_type = 'ROOM'
                and jsonb_typeof(i.verification_snapshot->'road') = 'object'
                and i.verification_snapshot#>>'{road,grade}' in ('a', 'b', 'c', 'd')
              then i.verification_snapshot#>>'{road,grade}'
              else null
            end
          )
        )
        order by i.created_at, i.item_key
      )
      from public.booking_items i
      where i.booking_id = b.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'event_type', e.event_type,
          'message', e.public_message,
          'created_at', e.created_at
        )
        order by e.created_at, e.id
      )
      from public.booking_events e
      where e.booking_id = b.id and e.public_message is not null
    ), '[]'::jsonb),
    'checkout', public.phase9_resolve_checkout_readiness(b.id)
  ) into result
  from public.bookings b
  where b.id = booking_uuid;

  return result;
end;
$$;

revoke all on function public.get_public_booking_status(text,text) from public;
grant execute on function public.get_public_booking_status(text,text) to anon, authenticated;

comment on function public.get_public_booking_status(text,text) is
  'Secure code-plus-opaque-token My Trip projection. Verification fields are a narrow allow-list derived only from immutable Booking Item verification snapshots.';
