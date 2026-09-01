-- Rollback-only Phase 11 Operations, change/replacement, RLS, concurrency and
-- idempotency smoke. Run only after migration 030 is remotely applied.
begin;

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';

do $fixtures$
declare destination_uuid uuid; supplier_uuid uuid; ref_uuid uuid; media_uuid uuid;
begin
  select id into destination_uuid from public.destinations where slug='ta-xua';
  perform public.save_package_commerce(
    null,destination_uuid,'phase11-rollback-package','phase11-rollback-package','Gói Phase 11 rollback','Chỉ dùng trong transaction kiểm thử',
    'Không tồn tại sau rollback.','published',current_date,current_date+30,'manual','https://example.com/request',false,0,null,null,
    jsonb_build_array(jsonb_build_object('component_key','local-support','component_type','CUSTOM','custom_code','local-support','custom_name','Hỗ trợ địa phương','custom_description','Xác nhận thủ công','is_required',true,'quantity',1,'sort_order',0,'confirmation_mode','manual')),
    jsonb_build_array(jsonb_build_object('rule_key','two-adults','price_vnd',800000,'effective_from',current_date,'effective_until',current_date+30,'adults_min',2,'adults_max',2,'children_min',0,'children_max',0,'rooms_min',1,'rooms_max',1,'selected_optional_component_keys','[]'::jsonb,'priority',10,'price_source','admin','verified_at',now()-interval '1 hour','price_valid_until',current_date+30,'is_active',true))
  );

  insert into public.suppliers (supplier_code,supplier_type,display_name,status)
  values ('SUP-OPS-000001','motorbike','Phase 11 manual source','active') returning id into supplier_uuid;
  insert into public.supplier_external_refs (supplier_id,system_key,external_reference,metadata,is_active)
  values (supplier_uuid,'taxua_biker','phase11-rollback-source','{"scope":"identity-only"}',true) returning id into ref_uuid;
  insert into public.cms_media_assets (title,alt_text,role,external_url,mime_type)
  values ('Phase 11 rollback image','Xe máy rollback','card','https://example.com/phase11.webp','image/webp') returning id into media_uuid;
  insert into public.motorbike_offerings (
    supplier_id,source_external_ref_id,slug,display_name,vehicle_category,transmission_type,engine_class_cc,
    helmet_status,image_media_id,availability_state,confirmation_mode,public_price_vnd,price_source,price_checked_at,
    price_valid_until,public_request_url,source_checked_at,publication_status,sort_order
  ) values
    (supplier_uuid,ref_uuid,'phase11-bike-a','Xe Phase 11 A','motorbike','semi_automatic',110,'unknown',media_uuid,'needs_confirmation','manual',200000,'owner_confirmation',now()-interval '1 hour',current_date+30,'https://example.com/confirm',now()-interval '1 hour','published',1),
    (supplier_uuid,ref_uuid,'phase11-bike-b','Xe Phase 11 B','motorbike','automatic',125,'unknown',media_uuid,'needs_confirmation','manual',250000,'owner_confirmation',now()-interval '1 hour',current_date+30,'https://example.com/confirm',now()-interval '1 hour','published',2);
end $fixtures$;

set local role anon;
do $anonymous$
declare package_uuid uuid; code_package text; code_bike text; safe jsonb; denied boolean:=false; function_denied boolean:=false;
begin
  select id into package_uuid from public.public_packages where slug='phase11-rollback-package';
  select booking_code into code_package from public.create_public_booking_request(
    jsonb_build_object('check_in',current_date+2,'check_out',current_date+4,'adults',2,'children',0,'rooms',1,'customer',jsonb_build_object('name','Khách Operations','phone','0912345678'),'selections',jsonb_build_array(jsonb_build_object('type','PACKAGE','source_id',package_uuid))),
    repeat('1',64),repeat('2',64));
  select booking_code into code_bike from public.create_public_booking_request(
    jsonb_build_object('check_in',current_date+2,'check_out',current_date+4,'adults',2,'children',0,'rooms',1,'customer',jsonb_build_object('name','Khách Replacement','phone','0987654321'),'selections',jsonb_build_array(jsonb_build_object('type','MOTORBIKE','source_slug','phase11-bike-a','quantity',1))),
    repeat('3',64),repeat('4',64));
  safe:=public.get_public_booking_status(code_package,repeat('1',64));
  if safe is null or safe::text ~* '0912345678' then raise exception 'Token projection failed or leaked PII'; end if;
  if public.get_public_booking_status(code_package,repeat('9',64)) is not null then raise exception 'Wrong token read Booking'; end if;
  begin perform count(*) from public.booking_change_requests; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anon read Booking changes'; end if;
  denied:=false;
  begin perform count(*) from public.booking_confirmation_events; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Anon read confirmation history'; end if;
  begin perform public.get_admin_operations_feed(10); exception when insufficient_privilege then function_denied:=true; end;
  if not function_denied then raise exception 'Anon executed private Operations feed'; end if;
end $anonymous$;

reset role;
set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"staff"}}';
do $staff$
declare booking_uuid uuid; item_uuid uuid; confirmation_uuid uuid; revision bigint; change_uuid uuid; observed text;
begin
  select id,operations_revision into booking_uuid,revision from public.bookings where idempotency_key_hash=repeat('3',64);
  select id into item_uuid from public.booking_items where booking_id=booking_uuid and operational_status='active' and component_type='MOTORBIKE';
  select id into confirmation_uuid from public.booking_item_confirmations where booking_item_id=item_uuid;
  perform public.update_supplier_confirmation_v2(item_uuid,'requested','Đã gọi Supplier',null,null,(select updated_at from public.booking_item_confirmations where id=confirmation_uuid));
  if (select due_at from public.booking_item_confirmations where id=confirmation_uuid) is null then raise exception 'Confirmation due_at missing'; end if;
  perform public.follow_up_supplier_confirmation(confirmation_uuid,(select updated_at from public.booking_item_confirmations where id=confirmation_uuid),'Follow-up rollback');
  perform public.follow_up_supplier_confirmation(confirmation_uuid,(select updated_at from public.booking_item_confirmations where id=confirmation_uuid),'Repeat inside idempotency window');
  if (select reminder_count from public.booking_item_confirmations where id=confirmation_uuid)<>1 then raise exception 'Follow-up idempotency failed'; end if;
  revision:=(select operations_revision from public.bookings where id=booking_uuid);
  change_uuid:=public.create_booking_change_request(booking_uuid,'replace_item',jsonb_build_object('target_item_id',item_uuid,'replacement_component_type','MOTORBIKE','replacement_source_id',(select id from public.motorbike_offerings where slug='phase11-bike-b')),'Khách cần xe khác','Rollback only',revision);
  perform public.review_booking_change_request(change_uuid,'reviewing','Staff đã kiểm tra',revision);
  begin perform public.review_booking_change_request(change_uuid,'approved','Staff không được duyệt',revision); raise exception 'Staff approval succeeded';
  exception when others then observed:=sqlerrm; if observed not like '%requires admin%' then raise; end if; end;
  begin perform public.update_booking_lifecycle_v2(booking_uuid,'active',null,revision-1); raise exception 'Stale lifecycle succeeded';
  exception when others then observed:=sqlerrm; if observed not like '%Booking changed%' then raise; end if; end;
end $staff$;

reset role;
do $admin_claim$
declare admin_user uuid;
begin
  select id into admin_user from auth.users order by created_at limit 1;
  if admin_user is null then raise exception 'Phase 11 smoke requires one existing Auth user for audited Admin IDs'; end if;
  perform set_config('phase11.test_admin_user',admin_user::text,true);
end $admin_claim$;
set local role authenticated;
do $admin$
declare admin_user uuid; booking_uuid uuid; old_item uuid; new_item uuid; change_uuid uuid; revision bigint; quote_before uuid; quote_after uuid; observed text; result_one jsonb; result_two jsonb;
begin
  admin_user:=current_setting('phase11.test_admin_user')::uuid;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'app_metadata',jsonb_build_object('role','admin'))::text,true);
  select id,operations_revision into booking_uuid,revision from public.bookings where idempotency_key_hash=repeat('3',64);
  select id into old_item from public.booking_items where booking_id=booking_uuid and operational_status='active' and component_type='MOTORBIKE';
  select id into change_uuid from public.booking_change_requests where booking_id=booking_uuid and status='reviewing';
  select id into quote_before from public.booking_quotes where booking_id=booking_uuid and is_current;
  perform public.review_booking_change_request(change_uuid,'approved','Admin approved rollback replacement',revision);
  perform public.apply_booking_change_request(change_uuid,revision);
  select id into new_item from public.booking_items where booking_id=booking_uuid and replacement_for_booking_item_id=old_item;
  select id into quote_after from public.booking_quotes where booking_id=booking_uuid and is_current;
  if new_item is null or (select operational_status from public.booking_items where id=old_item)<>'replaced' then raise exception 'Replacement history failed'; end if;
  if quote_after=quote_before or (select quote_status from public.booking_quotes where id=quote_before)<>'superseded' then raise exception 'Replacement did not invalidate/requote'; end if;
  if (select status from public.booking_change_requests where id=change_uuid)<>'applied' then raise exception 'Change not applied'; end if;
  if not exists(select 1 from public.booking_confirmation_events where booking_id=booking_uuid) then raise exception 'Confirmation history missing'; end if;
  begin update public.booking_confirmation_events set reason='tamper' where booking_id=booking_uuid; raise exception 'Append-only history mutated';
  exception when others then observed:=sqlerrm; if sqlstate<>'42501' and observed not like '%append-only%' then raise; end if; end;
  perform public.apply_booking_change_request(change_uuid,(select operations_revision from public.bookings where id=booking_uuid));
  if (select count(*) from public.booking_items where replacement_for_booking_item_id=old_item)<>1 then raise exception 'Apply idempotency duplicated replacement'; end if;
  result_one:=public.process_operational_expiries(200);
  result_two:=public.process_operational_expiries(200);
  if (result_two->>'confirmation_expired')::integer>(result_one->>'confirmation_expired')::integer then raise exception 'Expiry retry created more work'; end if;
  if jsonb_array_length(public.get_public_booking_status((select booking_code from public.bookings where id=booking_uuid),repeat('3',64))->'items')<>1 then raise exception 'Public projection included historical item'; end if;
  if jsonb_array_length(public.get_admin_operations_feed(100)->'bookings')<2 then raise exception 'Operations feed missing fixtures'; end if;
  if public.get_admin_data_health(100)->>'policy_version'<>'phase11-data-health-v1' then raise exception 'Data Health policy missing'; end if;

end $admin$;

reset role;
do $history_guard$
declare booking_uuid uuid; observed text;
begin
  select id into booking_uuid from public.bookings where idempotency_key_hash=repeat('3',64);
  begin update public.booking_confirmation_events set reason='owner tamper' where booking_id=booking_uuid; raise exception 'Owner bypassed append-only history';
  exception when others then observed:=sqlerrm; if observed not like '%append-only%' then raise; end if; end;
end $history_guard$;

alter table public.booking_quotes add constraint phase11_force_quote_failure check (quote_version<2) not valid;
set local role authenticated;
do $forced_rollback$
declare admin_user uuid; booking_uuid uuid; change_uuid uuid; revision bigint; adults_before integer;
begin
  admin_user:=current_setting('phase11.test_admin_user')::uuid;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_user,'app_metadata',jsonb_build_object('role','admin'))::text,true);
  select id,operations_revision,adults into booking_uuid,revision,adults_before from public.bookings where idempotency_key_hash=repeat('1',64);
  change_uuid:=public.create_booking_change_request(booking_uuid,'guest_count',jsonb_build_object('adults',3,'children',0),null,'Forced rollback proof',revision);
  perform public.review_booking_change_request(change_uuid,'approved','Approve only for forced rollback smoke',revision);
  begin
    perform public.apply_booking_change_request(change_uuid,revision);
    raise exception 'Forced quote failure did not stop change application';
  exception when check_violation then null;
  end;
  if (select adults from public.bookings where id=booking_uuid)<>adults_before
    or (select status from public.booking_change_requests where id=change_uuid)<>'approved'
    or (select count(*) from public.booking_quotes where booking_id=booking_uuid)<>1 then
    raise exception 'Forced failure did not roll back the full change transaction';
  end if;
end $forced_rollback$;
reset role;
alter table public.booking_quotes drop constraint phase11_force_quote_failure;

rollback;
