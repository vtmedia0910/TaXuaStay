-- Rollback-only Phase 12 Telegram RLS, onboarding, outbox, callback,
-- stale-state and idempotency smoke. Never sends a real Telegram message.
begin;

do $fixtures$
declare destination_uuid uuid; supplier_uuid uuid; booking_uuid uuid; item_uuid uuid; confirmation_uuid uuid; admin_user uuid;
begin
  select id into admin_user from auth.users order by created_at limit 1;
  if admin_user is null then raise exception 'Phase 12 smoke requires one Auth user'; end if;
  select id into destination_uuid from public.destinations where slug = 'ta-xua';
  insert into public.suppliers (supplier_code, supplier_type, display_name, status)
  values ('SUP-TG-000001', 'accommodation', 'Phase 12 rollback Supplier', 'active') returning id into supplier_uuid;
  insert into public.bookings (
    booking_code, destination_id, lifecycle_status, confirmation_status, check_in, check_out,
    adults, children, rooms, quoted_sell_total_vnd, price_status, customer_name, customer_phone,
    public_access_token_hash, idempotency_key_hash, request_fingerprint
  ) values (
    'TX-20991231-TGTEST', destination_uuid, 'submitted', 'pending', current_date + 2, current_date + 4,
    2, 0, 1, null, 'unknown', 'Rollback Telegram', '0900000000', repeat('1',64), repeat('2',64), repeat('3',64)
  ) returning id into booking_uuid;
  insert into public.booking_items (
    booking_id, item_key, component_type, source_custom_code, service_from, service_until, quantity,
    display_name_snapshot, confirmation_mode_snapshot, sell_price_vnd, net_cost_vnd, price_status,
    availability_status, confirmation_status, source_snapshot, price_snapshot, availability_snapshot,
    verification_snapshot, confirmation_context_snapshot, policy_snapshot
  ) values (
    booking_uuid, 'telegram-room', 'CUSTOM', 'telegram-room', current_date + 2, current_date + 4, 1,
    'Phòng rollback Telegram', 'supplier_manual', null, null, 'unknown', 'needs_confirmation', 'pending',
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
    jsonb_build_object('supplier_id', supplier_uuid, 'supplier_name', 'Phase 12 rollback Supplier'), '{}'::jsonb
  ) returning id into item_uuid;
  insert into public.booking_item_confirmations (
    booking_item_id, supplier_id, status, confirmation_mode, supplier_snapshot
  ) values (
    item_uuid, supplier_uuid, 'pending', 'supplier_manual',
    jsonb_build_object('supplier_id', supplier_uuid, 'supplier_name', 'Phase 12 rollback Supplier')
  ) returning id into confirmation_uuid;
  perform set_config('phase12.admin_user', admin_user::text, true);
  perform set_config('phase12.supplier_id', supplier_uuid::text, true);
  perform set_config('phase12.booking_id', booking_uuid::text, true);
  perform set_config('phase12.item_id', item_uuid::text, true);
  perform set_config('phase12.confirmation_id', confirmation_uuid::text, true);
end $fixtures$;

set local role authenticated;
do $admin_setup$
declare admin_user uuid := current_setting('phase12.admin_user')::uuid; generated jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_user, 'app_metadata', jsonb_build_object('role','admin'))::text, true);
  generated := public.generate_telegram_connection_code(current_setting('phase12.supplier_id')::uuid);
  if generated->>'code' !~ '^TXC-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$' then raise exception 'Connection code format invalid'; end if;
  perform set_config('phase12.connection_code', generated->>'code', true);
end $admin_setup$;

reset role;
set local role anon;
do $anon_security$
declare denied boolean := false; connected jsonb;
begin
  begin perform count(*) from public.supplier_communication_channels; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anon read Telegram channel table'; end if;
  denied := false;
  begin perform count(*) from public.communication_outbox; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anon read Telegram outbox'; end if;
  denied := false;
  begin perform count(*) from public.telegram_actions; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anon read Telegram actions'; end if;
  connected := public.connect_supplier_telegram_group(current_setting('phase12.connection_code'), 900001, -100900001, 'supergroup', 'Phase 12 rollback group');
  if connected->>'outcome' <> 'connected' then raise exception 'One-time connection failed: %', connected; end if;
  if public.connect_supplier_telegram_group(current_setting('phase12.connection_code'), 900002, -100900002, 'supergroup', 'Replay group')->>'outcome' <> 'rejected' then
    raise exception 'Connection code replay succeeded';
  end if;
  if public.connect_supplier_telegram_group('TXC-0000-0000-0000-0000', 900003, -100900003, 'supergroup', 'Wrong group')->>'outcome' <> 'rejected' then
    raise exception 'Wrong connection code succeeded';
  end if;
end $anon_security$;

reset role;
set local role authenticated;
do $dispatch$
declare admin_user uuid := current_setting('phase12.admin_user')::uuid; dispatched jsonb; claimed jsonb; first_claim jsonb; tokens jsonb;
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_user, 'app_metadata', jsonb_build_object('role','admin'))::text, true);
  dispatched := public.dispatch_supplier_confirmation_telegram(
    current_setting('phase12.confirmation_id')::uuid,
    (select updated_at from public.booking_item_confirmations where id = current_setting('phase12.confirmation_id')::uuid),
    (select operations_revision from public.bookings where id = current_setting('phase12.booking_id')::uuid),
    'initial'
  );
  if dispatched->>'status' <> 'queued' then raise exception 'Dispatch did not enqueue'; end if;
  if (select status from public.booking_item_confirmations where id = current_setting('phase12.confirmation_id')::uuid) <> 'requested' then raise exception 'Dispatch did not reuse confirmation state'; end if;
  claimed := public.claim_telegram_outbox(10);
  if jsonb_array_length(claimed) <> 1 then raise exception 'Worker claim failed: %', claimed; end if;
  first_claim := claimed->0;
  tokens := first_claim#>'{payload,callback_tokens}';
  perform set_config('phase12.confirm_token', tokens->>'CONFIRM', true);
  perform set_config('phase12.claim_token', first_claim->>'claim_token', true);
  perform set_config('phase12.outbox_id', first_claim->>'outbox_id', true);
  perform public.complete_telegram_outbox(
    (first_claim->>'outbox_id')::uuid, (first_claim->>'claim_token')::uuid, true, 12345, 200,
    null, null, false, null, null
  );
  if (select status from public.communication_outbox where id = (first_claim->>'outbox_id')::uuid) <> 'sent' then raise exception 'Delivery completion failed'; end if;
  if (select payload ? 'callback_tokens' from public.communication_outbox where id = (first_claim->>'outbox_id')::uuid) then raise exception 'Terminal outbox retained callback tokens'; end if;
end $dispatch$;

reset role;
set local role anon;
do $callback$
declare result jsonb; duplicate_result jsonb; wrong_result jsonb;
begin
  wrong_result := public.process_telegram_supplier_callback(900010, -100999999, repeat('4',64), current_setting('phase12.confirm_token'), 12345);
  if wrong_result->>'outcome' <> 'rejected' then raise exception 'Wrong chat callback succeeded'; end if;
  result := public.process_telegram_supplier_callback(900011, -100900001, repeat('5',64), current_setting('phase12.confirm_token'), 12345);
  if result->>'outcome' <> 'processed' or result->>'action' <> 'CONFIRM' then raise exception 'Valid callback failed: %', result; end if;
  duplicate_result := public.process_telegram_supplier_callback(900011, -100900001, repeat('5',64), current_setting('phase12.confirm_token'), 12345);
  if duplicate_result->>'outcome' <> 'duplicate' then raise exception 'Duplicate callback was not idempotent'; end if;
  if (select status from public.booking_item_confirmations where id = current_setting('phase12.confirmation_id')::uuid) <> 'confirmed' then raise exception 'Callback did not update authoritative Confirmation'; end if;
  if not exists(select 1 from public.booking_confirmation_events where confirmation_id = current_setting('phase12.confirmation_id')::uuid and actor_type = 'supplier') then raise exception 'Supplier confirmation audit missing'; end if;
end $callback$;

rollback;
