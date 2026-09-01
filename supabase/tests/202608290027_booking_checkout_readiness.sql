-- Rollback-only Phase 9 quote, policy, checkout-readiness and RLS smoke.
begin;

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';

do $fixtures$
declare destination_uuid uuid;
begin
  select id into destination_uuid from public.destinations where slug = 'ta-xua';
  perform public.save_package_commerce(
    null, destination_uuid, 'phase9-rollback-package', 'phase9-rollback-package',
    'Gói Phase 9 rollback', 'Chỉ tồn tại trong transaction kiểm thử.',
    'Không tạo dữ liệu production.', 'published', current_date, current_date + 30,
    'manual', 'https://example.com/request', false, 0, null, null,
    jsonb_build_array(jsonb_build_object(
      'component_key','local-support','component_type','CUSTOM','custom_code','local-support',
      'custom_name','Hỗ trợ địa phương','custom_description','Xác nhận thủ công',
      'is_required',true,'quantity',1,'sort_order',0,'confirmation_mode','manual'
    )),
    jsonb_build_array(jsonb_build_object(
      'rule_key','two-adults','price_vnd',800000,'effective_from',current_date,
      'effective_until',current_date + 30,'adults_min',2,'adults_max',2,
      'children_min',0,'children_max',0,'rooms_min',1,'rooms_max',1,
      'selected_optional_component_keys','[]'::jsonb,'priority',10,'price_source','admin',
      'verified_at',now() - interval '1 hour','price_valid_until',current_date + 30,'is_active',true
    ))
  );
end $fixtures$;

set local role anon;
do $anonymous$
declare package_uuid uuid; booking_code_value text; safe jsonb; denied boolean := false;
begin
  select id into package_uuid from public.public_packages where slug = 'phase9-rollback-package';
  select booking_code into booking_code_value from public.create_public_booking_request(
    jsonb_build_object(
      'check_in',current_date + 1,'check_out',current_date + 3,'adults',2,'children',0,'rooms',1,
      'customer',jsonb_build_object('name','Khách kiểm thử','phone','0912345678'),
      'selections',jsonb_build_array(jsonb_build_object('type','PACKAGE','source_id',package_uuid))
    ), repeat('d',64), repeat('e',64)
  );
  safe := public.get_public_booking_status(booking_code_value, repeat('d',64));
  if safe is null or safe->'checkout' is null then raise exception 'Public checkout-readiness DTO missing'; end if;
  if safe->'checkout'->>'provider_state' <> 'unconfigured' then raise exception 'Provider boundary is not unconfigured'; end if;
  if safe::text ~* '0912345678' then raise exception 'Public status leaked PII'; end if;
  if public.get_public_booking_status(booking_code_value, repeat('f',64)) is not null then raise exception 'Wrong token read Booking'; end if;
  begin perform count(*) from public.booking_quotes; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anonymous direct quote read succeeded'; end if;
  denied := false;
  begin insert into public.checkout_sessions default values; exception when insufficient_privilege then denied := true; when not_null_violation then null; end;
  if not denied then raise exception 'Anonymous direct checkout write reached table constraints'; end if;
end $anonymous$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"staff"}}';
do $staff$
declare booking_uuid uuid; service_uuid uuid; readiness jsonb; denied boolean := false;
begin
  select id into booking_uuid from public.bookings where idempotency_key_hash = repeat('d',64);
  if (select count(*) from public.booking_quotes where booking_id = booking_uuid) <> 1 then raise exception 'Initial quote version missing'; end if;
  if (select booking_total_vnd from public.booking_quotes where booking_id = booking_uuid and is_current) <> 800000 then raise exception 'Package total authority lost'; end if;
  if exists(select 1 from public.booking_quote_items where quote_id = (select id from public.booking_quotes where booking_id = booking_uuid and is_current) and not counts_toward_booking_total and sell_price_vnd is not null) then raise exception 'Package child double-counted'; end if;
  perform public.update_booking_lifecycle(booking_uuid, 'active', null);
  readiness := public.get_admin_checkout_readiness(booking_uuid);
  if readiness->>'readiness_state' <> 'needs_confirmation' then raise exception 'Supplier confirmation did not gate readiness: %', readiness; end if;
  begin perform public.set_booking_deposit_policy(booking_uuid,'percentage',null,2500,null,null,null,'Rollback terms'); exception when others then denied := sqlerrm like '%requires admin%'; end;
  if not denied then raise exception 'Staff changed Admin-only deposit policy'; end if;
  select id into service_uuid from public.booking_items where booking_id = booking_uuid and confirmation_status <> 'not_required' limit 1;
  perform public.update_supplier_confirmation(service_uuid, 'confirmed', 'rollback confirmed', 'PHASE9-REF', now() + interval '1 day');
  if (select confirmation_status from public.bookings where id = booking_uuid) <> 'confirmed' then raise exception 'Supplier aggregation did not confirm Booking'; end if;
end $staff$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
do $admin$
declare booking_uuid uuid; readiness jsonb; first_session uuid; repeated_session uuid; second_session uuid; first_quote uuid; second_quote uuid;
begin
  select id into booking_uuid from public.bookings where idempotency_key_hash = repeat('d',64);
  perform public.set_booking_deposit_policy(booking_uuid,'percentage',null,2500,null,null,null,'Hủy theo điều khoản rollback.');
  readiness := public.get_admin_checkout_readiness(booking_uuid);
  if readiness->>'readiness_state' <> 'ready' or readiness#>>'{amounts,deposit_due_vnd}' <> '200000' or readiness#>>'{amounts,planned_remaining_balance_vnd}' <> '600000' then
    raise exception 'Deterministic deposit/readiness mismatch: %', readiness;
  end if;
  first_session := public.create_checkout_draft(booking_uuid);
  repeated_session := public.create_checkout_draft(booking_uuid);
  if first_session <> repeated_session then raise exception 'Checkout draft idempotency failed'; end if;
  if (select status from public.checkout_sessions where id = first_session) <> 'ready' then raise exception 'Ready session status mismatch'; end if;
  select id into first_quote from public.booking_quotes where booking_id = booking_uuid and is_current;
  second_quote := public.requote_booking(booking_uuid, 'Nguồn giá được kiểm tra lại');
  if second_quote = first_quote or (select quote_version from public.booking_quotes where id = second_quote) <> 2 then raise exception 'Requote version history failed'; end if;
  if (select quote_status from public.booking_quotes where id = first_quote) <> 'superseded' then raise exception 'Historical quote not superseded'; end if;
  if (select status from public.checkout_sessions where id = first_session) <> 'expired' then raise exception 'Stale checkout session not invalidated'; end if;
  second_session := public.create_checkout_draft(booking_uuid);
  if second_session = first_session or (select quote_id from public.checkout_sessions where id = second_session) <> second_quote then raise exception 'New session not bound to quote v2'; end if;
  perform public.set_booking_deposit_policy(booking_uuid,'fixed_amount',900000,null,null,null,null,'Invalid amount must block.');
  readiness := public.get_admin_checkout_readiness(booking_uuid);
  if readiness->>'readiness_state' <> 'blocked' or not (readiness->'blockers' ? 'deposit_invalid_fixed_amount') then raise exception 'Invalid fixed deposit did not block: %', readiness; end if;
  if (select status from public.checkout_sessions where id = second_session) <> 'cancelled' then raise exception 'Policy change did not invalidate session'; end if;
  begin perform public.create_checkout_draft(booking_uuid); raise exception 'Blocked readiness created checkout'; exception when others then if sqlerrm not like '%Deposit policy blocks checkout%' then raise; end if; end;
  begin update public.booking_quotes set booking_total_vnd = 1 where id = second_quote; raise exception 'Quote financial mutation succeeded'; exception when others then if sqlstate <> '42501' and sqlerrm not like '%immutable%' then raise; end if; end;
  if (select count(*) from public.booking_events where booking_id = booking_uuid and event_type in ('booking_quote_created','booking_requoted','deposit_policy_set','checkout_session_created','checkout_session_expired')) < 5 then raise exception 'Phase 9 audit timeline incomplete'; end if;
end $admin$;

rollback;
