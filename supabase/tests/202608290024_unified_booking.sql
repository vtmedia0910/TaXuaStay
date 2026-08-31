-- Rollback-only Phase 8 atomicity, RLS, idempotency and lifecycle smoke.
begin;

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';

do $fixtures$
declare destination_uuid uuid;
begin
  select id into destination_uuid from public.destinations where slug='ta-xua';
  perform public.save_package_commerce(
    null,destination_uuid,'phase8-rollback-package','phase8-rollback-package','Gói Phase 8 rollback','Chỉ dùng trong transaction kiểm thử',
    'Không tồn tại sau rollback.','published',current_date,current_date+30,'manual','https://example.com/request',false,0,null,null,
    jsonb_build_array(
      jsonb_build_object('component_key','local-support','component_type','CUSTOM','custom_code','local-support','custom_name','Hỗ trợ địa phương','custom_description','Xác nhận thủ công','is_required',true,'quantity',1,'sort_order',0,'confirmation_mode','manual'),
      jsonb_build_object('component_key','breakfast','component_type','CUSTOM','custom_code','breakfast','custom_name','Bữa sáng đã chọn','custom_description','Tùy chọn được khách chủ động chọn','is_required',false,'quantity',1,'sort_order',1,'confirmation_mode','manual')
    ),
    jsonb_build_array(jsonb_build_object('rule_key','two-adults-breakfast','price_vnd',700000,'effective_from',current_date,'effective_until',current_date+30,'adults_min',2,'adults_max',2,'children_min',0,'children_max',0,'rooms_min',1,'rooms_max',1,'selected_optional_component_keys',jsonb_build_array('breakfast'),'priority',10,'price_source','admin','verified_at',now()-interval '1 hour','price_valid_until',current_date+30,'is_active',true))
  );
end $fixtures$;

set local role anon;
do $anonymous$
declare package_uuid uuid; code_one text; code_two text; safe jsonb; denied boolean:=false; write_denied boolean:=false;
begin
  select id into package_uuid from public.public_packages where slug='phase8-rollback-package';
  select booking_code into code_one from public.create_public_booking_request(
    jsonb_build_object('check_in',current_date+1,'check_out',current_date+3,'adults',2,'children',0,'rooms',1,'customer',jsonb_build_object('name','Khách kiểm thử','phone','0912345678','email','khach@example.com','note','private note'),'selections',jsonb_build_array(jsonb_build_object('type','PACKAGE','source_id',package_uuid,'optional_component_keys',jsonb_build_array('breakfast')))),
    repeat('a',64),repeat('b',64));
  select booking_code into code_two from public.create_public_booking_request(
    jsonb_build_object('check_in',current_date+1,'check_out',current_date+3,'adults',2,'children',0,'rooms',1,'customer',jsonb_build_object('name','Khách kiểm thử','phone','0912345678'),'selections',jsonb_build_array(jsonb_build_object('type','PACKAGE','source_id',package_uuid,'optional_component_keys',jsonb_build_array('breakfast')))),
    repeat('a',64),repeat('b',64));
  if code_one is null or code_one<>code_two then raise exception 'Idempotent request returned different Booking'; end if;
  begin
    perform public.create_public_booking_request(jsonb_build_object('check_in',current_date+1,'check_out',current_date+3,'adults',2,'children',0,'rooms',1,'customer',jsonb_build_object('name','Khách kiểm thử','phone','0912345678'),'selections',jsonb_build_array(jsonb_build_object('type','PACKAGE','source_id',package_uuid,'optional_component_keys',jsonb_build_array('breakfast')))),repeat('a',64),repeat('c',64));
    raise exception 'Mismatched idempotency fingerprint succeeded';
  exception when others then if sqlerrm not like '%different request%' then raise; end if; end;
  safe:=public.get_public_booking_status(code_one,repeat('a',64));
  if safe is null or safe->>'quoted_sell_total_vnd'<>'700000' or jsonb_array_length(safe->'items')<>3 then raise exception 'Safe status snapshot mismatch: %',safe; end if;
  if safe::text ~* '0912345678|khach@example.com|private note' then raise exception 'Public status leaked PII'; end if;
  if public.get_public_booking_status(code_one,repeat('c',64)) is not null then raise exception 'Wrong token read Booking'; end if;
  begin perform count(*) from public.bookings; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anonymous direct Booking read succeeded'; end if;
  begin update public.bookings set lifecycle_status='cancelled' where booking_code=code_one; exception when insufficient_privilege then write_denied:=true; end;
  if not write_denied then raise exception 'Anonymous direct Booking write succeeded'; end if;
end $anonymous$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"staff"}}';
do $staff$
declare booking_uuid uuid; child_uuid uuid; optional_uuid uuid;
begin
  select id into booking_uuid from public.bookings where idempotency_key_hash=repeat('a',64);
  if (select count(*) from public.bookings where id=booking_uuid)<>1 then raise exception 'One request did not create one Booking'; end if;
  if (select count(*) from public.booking_items where booking_id=booking_uuid)<>3 then raise exception 'Package did not create parent plus selected component items'; end if;
  if (select quoted_sell_total_vnd from public.bookings where id=booking_uuid)<>700000 then raise exception 'Package total authority lost'; end if;
  if exists(select 1 from public.booking_items where booking_id=booking_uuid and parent_booking_item_id is not null and (counts_toward_booking_total or sell_price_vnd is not null)) then raise exception 'Package component double-counted'; end if;
  select id into child_uuid from public.booking_items where booking_id=booking_uuid and item_key like '%local-support';
  select id into optional_uuid from public.booking_items where booking_id=booking_uuid and item_key like '%breakfast';
  perform public.update_supplier_confirmation(child_uuid,'requested','sent',null,null);
  perform public.update_supplier_confirmation(child_uuid,'confirmed','confirmed','REF-1',now()+interval '1 day');
  if (select confirmation_status from public.bookings where id=booking_uuid)='confirmed' then raise exception 'Selected optional component did not block confirmation'; end if;
  perform public.update_supplier_confirmation(optional_uuid,'confirmed','confirmed selected option','REF-2',now()+interval '1 day');
  perform public.update_booking_internal_note(booking_uuid,'rollback-only internal note');
  if (select confirmation_status from public.bookings where id=booking_uuid)<>'confirmed' then raise exception 'Confirmation aggregation failed'; end if;
  begin update public.booking_items set display_name_snapshot='Tampered' where id=child_uuid; raise exception 'Snapshot mutation succeeded'; exception when others then if sqlerrm not like '%snapshot is immutable%' then raise; end if; end;
  begin update public.booking_events set public_message='Tampered' where booking_id=booking_uuid; raise exception 'Event mutation succeeded'; exception when others then if sqlerrm not like '%append-only%' then raise; end if; end;
  begin perform public.update_booking_lifecycle(booking_uuid,'cancelled',null); raise exception 'Staff cancellation succeeded'; exception when others then if sqlerrm<>'Booking cancellation requires admin' then raise; end if; end;
end $staff$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
do $admin$
declare booking_uuid uuid;
begin
  select id into booking_uuid from public.bookings where idempotency_key_hash=repeat('a',64);
  perform public.update_booking_lifecycle(booking_uuid,'cancelled','owner cancellation test');
  if (select lifecycle_status from public.bookings where id=booking_uuid)<>'cancelled' then raise exception 'Admin cancellation failed'; end if;
  if (select count(*) from public.booking_events where booking_id=booking_uuid)<4 then raise exception 'Append-only timeline incomplete'; end if;
end $admin$;

rollback;
