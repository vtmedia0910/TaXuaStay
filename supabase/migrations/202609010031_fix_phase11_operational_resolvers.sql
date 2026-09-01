-- Corrective V2 Phase 11 resolver migration. Migration 030 is remotely applied
-- and immutable; this migration fixes only lint-discovered function definitions.

alter function public.phase11_validate_change_payload(text,jsonb) stable;

create or replace function public.phase11_create_quote_version(target_booking_id uuid, target_reason text, target_actor text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row record; item record; offering_row record; current_quote record;
  new_quote_id uuid; next_version integer; resolved jsonb; assessment jsonb;
  optional_keys text[]; item_status text; item_total bigint; item_valid_until date;
  overall_status text := 'authoritative'; quote_total bigint := 0; earliest_valid date;
  quote_expiry timestamptz; final_quote_status text; invalidated_count integer;
begin
  if char_length(btrim(coalesce(target_reason, ''))) not between 2 and 500 then raise exception 'Quote reason is required'; end if;
  if target_actor not in ('customer','staff','admin','system') then raise exception 'Invalid quote actor'; end if;
  select * into booking_row from public.bookings where id = target_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if booking_row.lifecycle_status in ('cancelled','completed','expired') then raise exception 'Terminal Booking cannot be requoted'; end if;
  select * into current_quote from public.booking_quotes where booking_id = target_booking_id and is_current for update;
  next_version := coalesce(current_quote.quote_version, 0) + 1;
  if current_quote.id is not null then
    update public.booking_quotes set quote_status='superseded',is_current=false,superseded_at=now(),expired_at=null where id=current_quote.id;
    update public.checkout_sessions set status='expired',invalidated_at=now(),invalidation_reason='quote_superseded',updated_at=now(),updated_by=auth.uid()
    where booking_id=target_booking_id and status in ('draft','ready');
    get diagnostics invalidated_count = row_count;
    if invalidated_count > 0 then
      insert into public.booking_events (booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
      values (target_booking_id,'checkout_session_expired','Phiên chuẩn bị thanh toán cũ đã hết hiệu lực sau khi báo giá thay đổi.',
        jsonb_build_object('count',invalidated_count,'previous_quote_version',current_quote.quote_version),target_actor,auth.uid());
    end if;
  end if;

  insert into public.booking_quotes (booking_id,quote_version,quote_status,price_status,booking_total_vnd,quoted_at,reason,quote_snapshot,created_by)
  values (target_booking_id,next_version,'needs_requote','missing',null,now(),btrim(target_reason),jsonb_build_object('policy_version','phase9-checkout-readiness-v1','operations_policy_version','phase11-operations-v1'),auth.uid())
  returning id into new_quote_id;

  for item in
    select * from public.booking_items
    where booking_id = target_booking_id and operational_status = 'active'
    order by created_at,item_key
  loop
    resolved:=null; assessment:=null; item_total:=null; item_valid_until:=null;
    if not item.counts_toward_booking_total then
      item_status:='included_in_package';
      resolved:=jsonb_build_object('source',item.source_snapshot,'price',item.price_snapshot,'availability',item.availability_snapshot,'verification',item.verification_snapshot);
    elsif item.component_type='ROOM' then
      resolved:=public.phase8_room_snapshot(item.source_room_type_id,booking_row.check_in,booking_row.check_out,item.quantity);
      assessment:=public.phase9_assess_room_price(resolved);
      item_status:=assessment->>'status'; item_total:=(assessment->>'total_vnd')::bigint; item_valid_until:=(assessment->>'valid_until')::date;
    elsif item.component_type='PACKAGE' then
      select coalesce(array_agg(distinct lower(btrim(entry.value)) order by lower(btrim(entry.value))),'{}'::text[])
      into optional_keys from jsonb_array_elements_text(coalesce(item.source_snapshot->'selected_optional_component_keys','[]'::jsonb)) as entry(value);
      resolved:=jsonb_build_object(
        'source',item.source_snapshot,
        'price',public.phase8_package_price_snapshot(item.source_package_id,booking_row.check_in,booking_row.check_out,booking_row.adults,booking_row.children,booking_row.rooms,optional_keys),
        'availability',item.availability_snapshot,'verification',item.verification_snapshot
      );
      item_status:=case coalesce(resolved#>>'{price,status}','') when 'quoted' then 'authoritative' when 'conflict' then 'conflict' else case when resolved#>>'{price,reason}'='stale' then 'stale' else 'missing' end end;
      if item_status='authoritative' then item_total:=(resolved#>>'{price,total_vnd}')::bigint; item_valid_until:=(resolved#>>'{price,valid_until}')::date; end if;
    elsif item.component_type='MOTORBIKE' then
      select source_offering.* into offering_row from public.motorbike_offerings source_offering
      where source_offering.id=item.source_motorbike_offering_id and source_offering.publication_status='published'
        and source_offering.availability_state<>'unavailable'
        and public.is_current_motorbike_source(source_offering.supplier_id,source_offering.source_external_ref_id);
      if not found or offering_row.public_price_vnd is null then
        item_status:='missing';
        resolved:=jsonb_build_object('source',item.source_snapshot,'price',jsonb_build_object('status','missing','total_vnd',null),'availability',item.availability_snapshot,'verification',item.verification_snapshot);
      elsif offering_row.price_checked_at is null or offering_row.price_checked_at>now()
        or offering_row.price_valid_until is null or offering_row.price_valid_until<greatest((now() at time zone 'Asia/Ho_Chi_Minh')::date,booking_row.check_out-1)
        or offering_row.source_checked_at is null or offering_row.source_checked_at>now() or now()-offering_row.source_checked_at>interval '7 days' then
        item_status:='stale';
        resolved:=jsonb_build_object('source',item.source_snapshot,'price',jsonb_build_object('status','stale','total_vnd',null,'verified_at',offering_row.price_checked_at,'valid_until',offering_row.price_valid_until),'availability',item.availability_snapshot,'verification',item.verification_snapshot);
      else
        item_status:='authoritative'; item_total:=offering_row.public_price_vnd::bigint*item.quantity; item_valid_until:=offering_row.price_valid_until;
        resolved:=jsonb_build_object('source',item.source_snapshot,'price',jsonb_build_object('status','authoritative','total_vnd',item_total,'unit_vnd',offering_row.public_price_vnd,'verified_at',offering_row.price_checked_at,'valid_until',offering_row.price_valid_until),'availability',jsonb_build_object('status','needs_confirmation','source_checked_at',offering_row.source_checked_at),'verification',item.verification_snapshot);
      end if;
    else
      item_status:='missing';
      resolved:=jsonb_build_object('source',item.source_snapshot,'price',jsonb_build_object('status','missing','total_vnd',null),'availability',item.availability_snapshot,'verification',item.verification_snapshot);
    end if;

    if item.counts_toward_booking_total then
      if item_status='conflict' then overall_status:='conflict';
      elsif item_status='stale' and overall_status<>'conflict' then overall_status:='stale';
      elsif item_status='missing' and overall_status not in ('conflict','stale') then overall_status:='missing'; end if;
      if item_status='authoritative' then
        quote_total:=quote_total+item_total;
        earliest_valid:=least(coalesce(earliest_valid,item_valid_until),item_valid_until);
      end if;
    end if;

    insert into public.booking_quote_items (
      quote_id,booking_item_id,item_key,component_type,quantity,counts_toward_booking_total,
      sell_price_vnd,price_status,price_valid_until,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot
    ) values (
      new_quote_id,item.id,item.item_key,item.component_type,item.quantity,item.counts_toward_booking_total,
      case when item_status='authoritative' then item_total else null end,item_status,item_valid_until,
      coalesce(resolved->'source','{}'::jsonb),coalesce(resolved->'price','{}'::jsonb),
      coalesce(resolved->'availability','{}'::jsonb),coalesce(resolved->'verification','{}'::jsonb)
    );
  end loop;

  if overall_status='authoritative' and earliest_valid is not null then
    quote_expiry:=least(now()+interval '24 hours',((earliest_valid+1)::timestamp at time zone 'Asia/Ho_Chi_Minh'));
    final_quote_status:=case when quote_expiry>now() then 'valid' else 'expired' end;
  else final_quote_status:='needs_requote'; quote_expiry:=null; end if;
  update public.booking_quotes set
    quote_status=final_quote_status,price_status=overall_status,
    booking_total_vnd=case when overall_status='authoritative' then quote_total else null end,
    quote_expires_at=quote_expiry,expired_at=case when final_quote_status='expired' then now() else null end,
    finalized_at=now(),quote_snapshot=jsonb_build_object('policy_version','phase9-checkout-readiness-v1','operations_policy_version','phase11-operations-v1','source','server_reresolution','active_item_count',(select count(*) from public.booking_quote_items where quote_id=new_quote_id))
  where id=new_quote_id;
  insert into public.booking_events (booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values (target_booking_id,case when next_version=1 then 'booking_quote_created' else 'booking_requoted' end,
    case when final_quote_status='valid' then 'Báo giá chuyến đi đã được cập nhật.' else 'Báo giá cần được kiểm tra lại trước bước thanh toán.' end,
    jsonb_build_object('quote_version',next_version,'quote_status',final_quote_status,'price_status',overall_status,'reason',btrim(target_reason),'operations_policy_version','phase11-operations-v1'),target_actor,auth.uid());
  return new_quote_id;
end;
$$;

create or replace function public.get_admin_data_health(target_limit integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb; bounded_limit integer; total_count bigint;
begin
  if not public.is_staff_or_admin() then raise exception 'Data Health requires staff'; end if;
  bounded_limit:=least(greatest(coalesce(target_limit,200),1),500);
  with issues as (
    select 'data_health'::text category,'property_without_room'::text code,'Thiếu phòng công khai'::text label,
      'property'::text entity_type,property.id entity_id,property.name::text entity_label,
      ('/admin/properties/'||property.id||'/edit')::text path
    from public.properties property
    where property.is_active and property.publish_status='published'
      and not exists (select 1 from public.room_types room where room.property_id=property.id and public.is_room_public(room.id))
    union all
    select 'data_health','room_missing_price','Thiếu giá đã xác minh','room',room.id,property.name||' · '||room.name,
      '/admin/rates?property_id='||property.id
    from public.room_types room join public.properties property on property.id=room.property_id
    where public.is_room_public(room.id) and not exists (
      select 1 from public.room_rate_rules rule join public.rate_plans plan on plan.id=rule.rate_plan_id
      where rule.room_type_id=room.id and rule.is_active and plan.is_active and plan.publish_status='published'
        and rule.source in ('partner','admin','contract') and rule.price_verified_at is not null and rule.price_verified_at<=now()
        and rule.price_valid_until is not null and rule.price_valid_until>=(now() at time zone 'Asia/Ho_Chi_Minh')::date
    )
    union all
    select 'data_health','room_missing_verification','Thiếu xác minh phòng','room',room.id,property.name||' · '||room.name,
      '/admin/verification?room_type_id='||room.id
    from public.room_types room join public.properties property on property.id=room.property_id
    where public.is_room_public(room.id) and not exists (
      select 1 from public.verification_records verification
      where verification.room_type_id=room.id and verification.verification_type='room' and public.is_verification_public(verification.id)
    )
    union all
    select 'supplier','room_missing_supplier','Thiếu Supplier','room',room.id,property.name||' · '||room.name,
      '/admin/suppliers?property_id='||property.id
    from public.room_types room join public.properties property on property.id=room.property_id
    where public.is_room_public(room.id) and not exists (
      select 1 from public.supplier_properties link join public.suppliers supplier on supplier.id=link.supplier_id
      where link.property_id=property.id and supplier.status='active'
        and (link.valid_from is null or link.valid_from<=current_date)
        and (link.valid_until is null or link.valid_until>=current_date)
    )
    union all
    select 'data_health','package_component_invalid','Package thiếu component hợp lệ','package',package.id,package.name,
      '/admin/packages/'||package.id||'/edit'
    from public.packages package
    where package.lifecycle_status='published' and (
      not exists (select 1 from public.package_components component where component.package_id=package.id and component.is_required)
      or exists (
        select 1 from public.package_components component where component.package_id=package.id and component.is_required and (
          (component.component_type='ROOM' and not public.is_room_public(component.room_type_id))
          or (component.component_type='MOTORBIKE' and not exists (
            select 1 from public.motorbike_offerings offering where offering.id=component.motorbike_offering_id
              and offering.publication_status='published' and offering.availability_state<>'unavailable'
              and public.is_current_motorbike_source(offering.supplier_id,offering.source_external_ref_id)
          ))
        )
      )
    )
    union all
    select 'supplier','motorbike_missing_confirmation_context','Xe máy thiếu đầu mối xác nhận','motorbike',offering.id,offering.display_name,
      '/admin/motorbike/'||offering.id||'/edit'
    from public.motorbike_offerings offering
    where offering.publication_status='published' and not exists (
      select 1 from public.supplier_contacts contact where contact.supplier_id=offering.supplier_id and contact.is_active
    )
    union all
    select 'booking','booking_item_missing_price','Booking Item thiếu giá','booking_item',item.id,booking.booking_code||' · '||item.display_name_snapshot,
      '/admin/bookings/'||booking.id
    from public.booking_items item join public.bookings booking on booking.id=item.booking_id
    where item.operational_status='active' and item.counts_toward_booking_total and item.sell_price_vnd is null
      and booking.lifecycle_status in ('submitted','active')
    union all
    select 'confirmation','booking_confirmation_unresolved','Booking còn xác nhận chưa giải quyết','booking',booking.id,booking.booking_code,
      '/admin/bookings/'||booking.id
    from public.bookings booking
    where booking.lifecycle_status in ('submitted','active') and booking.confirmation_status<>'confirmed'
  ), numbered as (
    select issues.*,pg_catalog.md5(category||':'||code||':'||entity_type||':'||entity_id::text) fingerprint,
      count(*) over () exact_total,row_number() over (order by category,code,entity_label,entity_id) sequence
    from issues
  )
  select coalesce(max(exact_total),0),jsonb_build_object(
    'policy_version','phase11-data-health-v1','total_issues',coalesce(max(exact_total),0),
    'truncated',coalesce(max(exact_total),0)>bounded_limit,
    'issues',coalesce(jsonb_agg(jsonb_build_object(
      'category',category,'code',code,'label',label,'entity_type',entity_type,'entity_id',entity_id,
      'entity_label',entity_label,'path',path,'fingerprint',fingerprint
    ) order by sequence) filter (where sequence<=bounded_limit),'[]'::jsonb)
  ) into total_count,result from numbered;
  return coalesce(result,jsonb_build_object('policy_version','phase11-data-health-v1','total_issues',0,'truncated',false,'issues','[]'::jsonb));
end;
$$;

revoke all on function public.phase11_validate_change_payload(text,jsonb) from public,anon,authenticated;
revoke all on function public.phase11_create_quote_version(uuid,text,text) from public,anon,authenticated;
revoke all on function public.get_admin_data_health(integer) from public,anon,authenticated;
grant execute on function public.get_admin_data_health(integer) to authenticated;

comment on function public.phase11_create_quote_version(uuid,text,text) is
  'Private Phase 11 active-item quote resolver; corrected after linked lint without changing price authority.';
