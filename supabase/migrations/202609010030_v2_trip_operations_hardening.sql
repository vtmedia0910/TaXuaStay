-- Tà Xùa Trip V2 Phase 11: Trip Operations Hardening + System Administration.
-- Additive only. This migration adds no payment state, provider integration,
-- customer account, AI workflow, or new service vertical.

alter table public.bookings
  add column operations_revision bigint not null default 1,
  add column last_operational_activity_at timestamptz not null default now();

alter table public.booking_item_confirmations
  add column due_at timestamptz,
  add column last_reminded_at timestamptz,
  add column reminder_count integer not null default 0,
  add column overdue_event_at timestamptz,
  add constraint booking_confirmations_due_shape check (due_at is null or due_at > coalesce(requested_at, created_at)),
  add constraint booking_confirmations_reminder_count check (reminder_count between 0 and 1000),
  add constraint booking_confirmations_reminder_shape check ((reminder_count = 0 and last_reminded_at is null) or (reminder_count > 0 and last_reminded_at is not null));

update public.booking_item_confirmations
set due_at = requested_at + interval '4 hours'
where status = 'requested' and requested_at is not null and due_at is null;

create table public.booking_change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  change_code text not null unique,
  change_type text not null,
  status text not null default 'requested',
  request_payload jsonb not null,
  customer_reason text,
  internal_note text,
  booking_revision_at_request bigint not null,
  resolution_snapshot jsonb not null default '{}'::jsonb,
  requested_by_actor_type text not null,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  applied_at timestamptz,
  applied_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_change_code_format check (change_code ~ '^CHG-[0-9]{8}-[A-Z0-9]{6}$'),
  constraint booking_change_type_allowed check (change_type in ('dates','guest_count','room_quantity','replace_item')),
  constraint booking_change_status_allowed check (status in ('requested','reviewing','approved','applied','rejected','cancelled')),
  constraint booking_change_actor_allowed check (requested_by_actor_type in ('staff','admin')),
  constraint booking_change_revision_positive check (booking_revision_at_request > 0),
  constraint booking_change_payload_object check (jsonb_typeof(request_payload) = 'object'),
  constraint booking_change_resolution_object check (jsonb_typeof(resolution_snapshot) = 'object'),
  constraint booking_change_copy_length check (
    (customer_reason is null or char_length(customer_reason) <= 3000)
    and (internal_note is null or char_length(internal_note) <= 5000)
  ),
  constraint booking_change_review_shape check (
    (status in ('requested','reviewing') and reviewed_at is null and reviewed_by is null)
    or (status in ('approved','applied','rejected','cancelled') and reviewed_at is not null and reviewed_by is not null)
  ),
  constraint booking_change_apply_shape check ((status = 'applied') = (applied_at is not null and applied_by is not null)),
  constraint booking_change_cancel_shape check ((status = 'cancelled') = (cancelled_at is not null))
);

create index booking_change_requests_queue_index
  on public.booking_change_requests (status, created_at, booking_id);
create unique index booking_change_requests_one_open_type
  on public.booking_change_requests (booking_id, change_type)
  where status in ('requested','reviewing','approved');

alter table public.booking_items
  add column operational_status text not null default 'active',
  add column replacement_for_booking_item_id uuid references public.booking_items(id) on delete restrict,
  add column replaced_by_booking_item_id uuid references public.booking_items(id) on delete restrict,
  add column change_request_id uuid references public.booking_change_requests(id) on delete restrict,
  add column operational_updated_at timestamptz not null default now(),
  add constraint booking_items_operational_status_allowed check (operational_status in ('active','replaced','cancelled')),
  add constraint booking_items_replacement_not_self check (
    replacement_for_booking_item_id is null or replacement_for_booking_item_id <> id
  ),
  add constraint booking_items_replaced_by_not_self check (
    replaced_by_booking_item_id is null or replaced_by_booking_item_id <> id
  ),
  add constraint booking_items_replaced_shape check (
    (operational_status = 'replaced' and replaced_by_booking_item_id is not null)
    or (operational_status <> 'replaced' and replaced_by_booking_item_id is null)
  );

create unique index booking_items_one_replacement
  on public.booking_items (replacement_for_booking_item_id)
  where replacement_for_booking_item_id is not null;
create index booking_items_operational_index
  on public.booking_items (booking_id, operational_status, created_at, item_key);

create table public.booking_confirmation_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  booking_item_id uuid not null references public.booking_items(id) on delete restrict,
  confirmation_id uuid not null references public.booking_item_confirmations(id) on delete restrict,
  previous_status text not null,
  next_status text not null,
  requested_at_snapshot timestamptz,
  due_at_snapshot timestamptz,
  responded_at_snapshot timestamptz,
  expires_at_snapshot timestamptz,
  reminder_count_snapshot integer not null default 0,
  external_reference_snapshot text,
  response_note_snapshot text,
  supplier_snapshot jsonb not null,
  reason text,
  actor_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint booking_confirmation_events_statuses check (
    previous_status in ('pending','requested','confirmed','declined','expired','cancelled')
    and next_status in ('pending','requested','confirmed','declined','expired','cancelled')
  ),
  constraint booking_confirmation_events_actor check (actor_type in ('staff','admin','system')),
  constraint booking_confirmation_events_supplier_object check (jsonb_typeof(supplier_snapshot) = 'object'),
  constraint booking_confirmation_events_copy_length check (
    (external_reference_snapshot is null or char_length(external_reference_snapshot) <= 500)
    and (response_note_snapshot is null or char_length(response_note_snapshot) <= 5000)
    and (reason is null or char_length(reason) <= 5000)
  )
);

create index booking_confirmation_events_timeline_index
  on public.booking_confirmation_events (booking_id, created_at, id);

create or replace function public.phase11_validate_change_payload(target_type text, target_payload jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare allowed text[];
begin
  if jsonb_typeof(target_payload) <> 'object' then return false; end if;
  case target_type
    when 'dates' then
      allowed := array['check_in','check_out'];
      return not (target_payload - allowed <> '{}'::jsonb)
        and target_payload ?& allowed
        and (target_payload->>'check_in')::date < (target_payload->>'check_out')::date
        and (target_payload->>'check_out')::date <= (target_payload->>'check_in')::date + 31;
    when 'guest_count' then
      allowed := array['adults','children'];
      return not (target_payload - allowed <> '{}'::jsonb)
        and target_payload ?& allowed
        and (target_payload->>'adults')::integer between 1 and 100
        and (target_payload->>'children')::integer between 0 and 100;
    when 'room_quantity' then
      allowed := array['target_item_id','quantity'];
      return not (target_payload - allowed <> '{}'::jsonb)
        and target_payload ?& allowed
        and (target_payload->>'target_item_id')::uuid is not null
        and (target_payload->>'quantity')::integer between 1 and 100;
    when 'replace_item' then
      allowed := array['target_item_id','replacement_component_type','replacement_source_id'];
      return not (target_payload - allowed <> '{}'::jsonb)
        and target_payload ?& allowed
        and (target_payload->>'target_item_id')::uuid is not null
        and (target_payload->>'replacement_source_id')::uuid is not null
        and target_payload->>'replacement_component_type' in ('ROOM','MOTORBIKE');
    else return false;
  end case;
exception when others then return false;
end;
$$;

alter table public.booking_change_requests
  add constraint booking_change_payload_valid
  check (public.phase11_validate_change_payload(change_type, request_payload));

create or replace function public.guard_phase8_booking_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare change_id text;
begin
  if row(new.booking_code,new.destination_id,new.channel,new.currency,new.quoted_at,new.customer_name,new.customer_phone,new.customer_email,new.customer_zalo,new.customer_note,new.public_access_token_hash,new.idempotency_key_hash,new.request_fingerprint,new.quote_policy_version,new.submitted_at,new.created_at)
    is distinct from row(old.booking_code,old.destination_id,old.channel,old.currency,old.quoted_at,old.customer_name,old.customer_phone,old.customer_email,old.customer_zalo,old.customer_note,old.public_access_token_hash,old.idempotency_key_hash,old.request_fingerprint,old.quote_policy_version,old.submitted_at,old.created_at) then
    raise exception 'Booking submission snapshot is immutable';
  end if;
  if row(new.check_in,new.check_out,new.adults,new.children,new.rooms)
    is distinct from row(old.check_in,old.check_out,old.adults,old.children,old.rooms) then
    change_id := current_setting('phase11.change_request_id', true);
    if change_id is null or not exists (
      select 1 from public.booking_change_requests request
      where request.id = change_id::uuid and request.booking_id = old.id and request.status = 'approved'
    ) then
      raise exception 'Booking trip facts require an approved change request';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.phase11_booking_revision_trigger()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(new.lifecycle_status,new.confirmation_status,new.check_in,new.check_out,new.adults,new.children,new.rooms,new.quoted_sell_total_vnd,new.price_status,new.internal_note)
    is distinct from row(old.lifecycle_status,old.confirmation_status,old.check_in,old.check_out,old.adults,old.children,old.rooms,old.quoted_sell_total_vnd,old.price_status,old.internal_note) then
    new.operations_revision := old.operations_revision + 1;
    new.last_operational_activity_at := now();
  end if;
  return new;
end;
$$;

create trigger phase11_booking_revision
before update on public.bookings
for each row execute function public.phase11_booking_revision_trigger();

create or replace function public.phase11_touch_booking_from_child()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare target_booking_id uuid;
begin
  target_booking_id := case tg_table_name
    when 'booking_item_confirmations' then (select booking_id from public.booking_items where id = new.booking_item_id)
    when 'booking_items' then new.booking_id
    else new.booking_id
  end;
  update public.bookings
  set operations_revision = operations_revision + 1,
      last_operational_activity_at = now(),
      updated_at = greatest(updated_at, now())
  where id = target_booking_id;
  return new;
end;
$$;

create trigger phase11_touch_booking_confirmation
after insert or update on public.booking_item_confirmations
for each row execute function public.phase11_touch_booking_from_child();
create trigger phase11_touch_booking_item
after update of operational_status, replaced_by_booking_item_id on public.booking_items
for each row execute function public.phase11_touch_booking_from_child();
create trigger phase11_touch_booking_quote
after insert or update of quote_status, is_current on public.booking_quotes
for each row execute function public.phase11_touch_booking_from_child();
create trigger phase11_touch_booking_deposit_policy
after insert or update of status, is_current on public.booking_deposit_policies
for each row execute function public.phase11_touch_booking_from_child();
create trigger phase11_touch_booking_checkout
after insert or update of status on public.checkout_sessions
for each row execute function public.phase11_touch_booking_from_child();

create or replace function public.reject_phase11_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$ begin raise exception 'Phase 11 operational history is append-only'; end; $$;

create trigger booking_confirmation_events_append_only
before update or delete on public.booking_confirmation_events
for each row execute function public.reject_phase11_history_mutation();

create or replace function public.create_booking_change_request(
  target_booking_id uuid,
  target_change_type text,
  target_request_payload jsonb,
  target_customer_reason text,
  target_internal_note text,
  target_expected_revision bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare booking_row record; saved_id uuid; saved_code text; actor text;
begin
  if not public.is_staff_or_admin() then raise exception 'Booking change request requires staff'; end if;
  if target_change_type not in ('dates','guest_count','room_quantity','replace_item')
    or not public.phase11_validate_change_payload(target_change_type, target_request_payload) then
    raise exception 'Invalid controlled Booking change';
  end if;
  if target_customer_reason is not null and char_length(target_customer_reason) > 3000 then raise exception 'Customer reason is too long'; end if;
  if target_internal_note is not null and char_length(target_internal_note) > 5000 then raise exception 'Internal note is too long'; end if;
  if nullif(btrim(target_customer_reason),'') is null and nullif(btrim(target_internal_note),'') is null then raise exception 'Booking change reason is required'; end if;
  select * into booking_row from public.bookings where id = target_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if booking_row.operations_revision <> target_expected_revision then raise exception 'Booking changed; reload before continuing'; end if;
  if booking_row.lifecycle_status in ('cancelled','completed','expired') then raise exception 'Terminal Booking cannot receive a change request'; end if;
  if target_change_type in ('room_quantity','replace_item') and not exists (
    select 1 from public.booking_items item
    where item.id = (target_request_payload->>'target_item_id')::uuid
      and item.booking_id = target_booking_id and item.operational_status = 'active'
  ) then raise exception 'Target Booking Item is not active'; end if;
  loop
    saved_code := 'CHG-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYYMMDD') || '-' || upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,6));
    exit when not exists (select 1 from public.booking_change_requests where change_code = saved_code);
  end loop;
  actor := case when public.is_admin() then 'admin' else 'staff' end;
  insert into public.booking_change_requests (
    booking_id,change_code,change_type,request_payload,customer_reason,internal_note,
    booking_revision_at_request,requested_by_actor_type,requested_by_user_id
  ) values (
    target_booking_id,saved_code,target_change_type,target_request_payload,nullif(btrim(target_customer_reason),''),
    nullif(btrim(target_internal_note),''),target_expected_revision,actor,auth.uid()
  ) returning id into saved_id;
  insert into public.booking_events (booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values (target_booking_id,'change_requested','Đội ngũ đã ghi nhận một yêu cầu thay đổi chuyến đi.',
    jsonb_build_object('change_request_id',saved_id,'change_code',saved_code,'change_type',target_change_type),actor,auth.uid());
  return saved_id;
end;
$$;

create or replace function public.review_booking_change_request(
  target_change_request_id uuid,
  target_status text,
  target_internal_note text,
  target_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare request_row record; booking_revision bigint; actor text;
begin
  if not public.is_staff_or_admin() then raise exception 'Booking change review requires staff'; end if;
  if target_status not in ('reviewing','approved','rejected','cancelled') then raise exception 'Invalid change review status'; end if;
  if target_status <> 'reviewing' and not public.is_admin() then raise exception 'High-risk change decision requires admin'; end if;
  if target_internal_note is not null and char_length(target_internal_note) > 5000 then raise exception 'Internal note is too long'; end if;
  if target_status<>'reviewing' and nullif(btrim(target_internal_note),'') is null then raise exception 'Change decision reason is required'; end if;
  select * into request_row from public.booking_change_requests where id = target_change_request_id for update;
  if not found then raise exception 'Change request not found'; end if;
  select operations_revision into booking_revision from public.bookings where id = request_row.booking_id for update;
  if booking_revision <> target_expected_revision or booking_revision <> request_row.booking_revision_at_request then
    raise exception 'Booking changed; reload before continuing';
  end if;
  if request_row.status not in ('requested','reviewing') then
    if request_row.status = target_status then return; end if;
    raise exception 'Change request is no longer reviewable';
  end if;
  actor := case when public.is_admin() then 'admin' else 'staff' end;
  update public.booking_change_requests
  set status = target_status,
      internal_note = coalesce(nullif(btrim(target_internal_note),''),internal_note),
      reviewed_at = case when target_status = 'reviewing' then null else now() end,
      reviewed_by = case when target_status = 'reviewing' then null else auth.uid() end,
      cancelled_at = case when target_status = 'cancelled' then now() else null end,
      updated_at = now()
  where id = target_change_request_id;
  insert into public.booking_events (booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values (request_row.booking_id,'change_' || target_status,
    case target_status when 'approved' then 'Yêu cầu thay đổi đã được duyệt và đang chờ áp dụng.' when 'rejected' then 'Yêu cầu thay đổi không được áp dụng.' when 'cancelled' then 'Yêu cầu thay đổi đã được hủy.' else null end,
    jsonb_build_object('change_request_id',target_change_request_id,'change_code',request_row.change_code,'change_type',request_row.change_type,'note',nullif(btrim(target_internal_note),'')),actor,auth.uid());
end;
$$;

-- Phase 9 remains the quote authority. This Phase 11 variant has the same
-- resolver contract but deliberately excludes replaced/cancelled Booking Items.
create or replace function public.phase11_create_quote_version(target_booking_id uuid, target_reason text, target_actor text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking_row record; item record; offering record; current_quote record;
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
      select offering.* into offering from public.motorbike_offerings offering
      where offering.id=item.source_motorbike_offering_id and offering.publication_status='published'
        and offering.availability_state<>'unavailable'
        and public.is_current_motorbike_source(offering.supplier_id,offering.source_external_ref_id);
      if not found or offering.public_price_vnd is null then
        item_status:='missing';
        resolved:=jsonb_build_object('source',item.source_snapshot,'price',jsonb_build_object('status','missing','total_vnd',null),'availability',item.availability_snapshot,'verification',item.verification_snapshot);
      elsif offering.price_checked_at is null or offering.price_checked_at>now()
        or offering.price_valid_until is null or offering.price_valid_until<greatest((now() at time zone 'Asia/Ho_Chi_Minh')::date,booking_row.check_out-1)
        or offering.source_checked_at is null or offering.source_checked_at>now() or now()-offering.source_checked_at>interval '7 days' then
        item_status:='stale';
        resolved:=jsonb_build_object('source',item.source_snapshot,'price',jsonb_build_object('status','stale','total_vnd',null,'verified_at',offering.price_checked_at,'valid_until',offering.price_valid_until),'availability',item.availability_snapshot,'verification',item.verification_snapshot);
      else
        item_status:='authoritative'; item_total:=offering.public_price_vnd::bigint*item.quantity; item_valid_until:=offering.price_valid_until;
        resolved:=jsonb_build_object('source',item.source_snapshot,'price',jsonb_build_object('status','authoritative','total_vnd',item_total,'unit_vnd',offering.public_price_vnd,'verified_at',offering.price_checked_at,'valid_until',offering.price_valid_until),'availability',jsonb_build_object('status','needs_confirmation','source_checked_at',offering.source_checked_at),'verification',item.verification_snapshot);
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

create or replace function public.requote_booking(target_booking_id uuid, target_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare result uuid;
begin
  if not public.is_staff_or_admin() then raise exception 'Requote requires staff'; end if;
  result:=public.phase11_create_quote_version(target_booking_id,target_reason,public.phase9_actor_type());
  perform public.phase9_sync_checkout_state(target_booking_id);
  return result;
end;
$$;

create or replace function public.phase8_recompute_confirmation(target_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare next_status text; previous_status text; actor text;
begin
  select confirmation_status into previous_status from public.bookings where id=target_booking_id;
  select case
    when lifecycle_status='cancelled' then 'cancelled'
    when not exists (
      select 1 from public.booking_items item
      where item.booking_id=target_booking_id and item.operational_status='active' and item.confirmation_status<>'not_required'
    ) then 'pending'
    when exists (
      select 1 from public.booking_items item
      where item.booking_id=target_booking_id and item.operational_status='active' and item.confirmation_status in ('declined','expired','cancelled')
    ) then 'failed'
    when not exists (
      select 1 from public.booking_items item
      where item.booking_id=target_booking_id and item.operational_status='active' and item.confirmation_status not in ('confirmed','not_required')
    ) then 'confirmed'
    when exists (
      select 1 from public.booking_items item
      where item.booking_id=target_booking_id and item.operational_status='active' and item.confirmation_status='confirmed'
    ) then 'partial'
    else 'pending' end
  into next_status from public.bookings where id=target_booking_id;
  update public.bookings set confirmation_status=next_status,updated_at=now(),updated_by=auth.uid()
  where id=target_booking_id and confirmation_status is distinct from next_status;
  if found then
    actor:=case when public.is_admin() then 'admin' when public.is_staff_or_admin() then 'staff' else 'system' end;
    insert into public.booking_events (booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
    values (target_booking_id,'booking_confirmation_changed',case next_status
      when 'confirmed' then 'Tất cả dịch vụ đang hoạt động cần xác nhận đã được xác nhận.'
      when 'partial' then 'Một phần dịch vụ đã được xác nhận.'
      when 'failed' then 'Có dịch vụ đang hoạt động không thể xác nhận.'
      when 'cancelled' then 'Quy trình xác nhận đã được hủy.'
      else 'Đội ngũ đang kiểm tra từng dịch vụ.' end,
      jsonb_build_object('previous_status',previous_status,'next_status',next_status,'operations_policy_version','phase11-operations-v1'),actor,auth.uid());
  end if;
end;
$$;

create or replace function public.phase11_replace_booking_item(
  target_change_request_id uuid,
  target_booking_item_id uuid,
  target_component_type text,
  target_source_id uuid,
  target_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row record; booking_row record; old_item record; old_confirmation record;
  room_snapshot jsonb; offering record; new_item_id uuid; new_key text;
  supplier_uuid uuid; contact_uuid uuid; item_price bigint; actor text;
begin
  select * into request_row from public.booking_change_requests where id=target_change_request_id for update;
  if not found or request_row.status<>'approved' then raise exception 'Approved change request is required'; end if;
  select * into booking_row from public.bookings where id=request_row.booking_id for update;
  select * into old_item from public.booking_items where id=target_booking_item_id and booking_id=request_row.booking_id for update;
  if not found or old_item.operational_status<>'active' then raise exception 'Replacement target is no longer active'; end if;
  if old_item.component_type not in ('ROOM','MOTORBIKE') or target_component_type<>old_item.component_type then
    raise exception 'Replacement must preserve the implemented service type';
  end if;
  if target_quantity not between 1 and 100 then raise exception 'Replacement quantity is invalid'; end if;
  new_key:=left(old_item.item_key,105)||'-r'||(booking_row.operations_revision+1)::text;
  actor:=case when public.is_admin() then 'admin' else 'staff' end;

  if target_component_type='ROOM' then
    room_snapshot:=public.phase8_room_snapshot(target_source_id,booking_row.check_in,booking_row.check_out,target_quantity);
    if room_snapshot#>>'{availability,status}'='unavailable' then raise exception 'Replacement Room is unavailable'; end if;
    supplier_uuid:=nullif(room_snapshot#>>'{confirmation,supplier_id}','')::uuid;
    contact_uuid:=nullif(room_snapshot#>>'{confirmation,contact_id}','')::uuid;
    item_price:=case when old_item.counts_toward_booking_total then (room_snapshot#>>'{price,total_vnd}')::bigint else null end;
    insert into public.booking_items (
      booking_id,parent_booking_item_id,item_key,component_type,source_room_type_id,source_package_component_id,
      service_from,service_until,quantity,is_required,counts_toward_booking_total,display_name_snapshot,
      description_snapshot,parent_name_snapshot,confirmation_mode_snapshot,sell_price_vnd,net_cost_vnd,
      price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,
      verification_snapshot,confirmation_context_snapshot,policy_snapshot,replacement_for_booking_item_id,
      change_request_id,operational_status
    ) values (
      booking_row.id,old_item.parent_booking_item_id,new_key,'ROOM',target_source_id,old_item.source_package_component_id,
      booking_row.check_in,booking_row.check_out,target_quantity,old_item.is_required,old_item.counts_toward_booking_total,
      room_snapshot#>>'{source,room_name}',nullif(room_snapshot#>>'{source,description}',''),room_snapshot#>>'{source,property_name}',
      case when supplier_uuid is null then 'internal_manual' else 'supplier_manual' end,item_price,(room_snapshot#>>'{cost,total_vnd}')::bigint,
      case when old_item.counts_toward_booking_total then room_snapshot#>>'{price,status}' else 'included_in_package' end,
      room_snapshot#>>'{availability,status}','pending',room_snapshot->'source',
      case when old_item.counts_toward_booking_total then room_snapshot->'price' else jsonb_build_object('status','included_in_package','total_vnd',null,'standalone_reference',room_snapshot->'price') end,
      room_snapshot->'availability',room_snapshot->'verification',room_snapshot->'confirmation',
      jsonb_build_object('booking','phase11-operations-v1','replacement_for_booking_item_id',old_item.id,'component_double_counting',false,'cost_snapshot',room_snapshot->'cost'),
      old_item.id,target_change_request_id,'active'
    ) returning id into new_item_id;
    insert into public.booking_item_confirmations (booking_item_id,supplier_id,supplier_contact_id,status,confirmation_mode,supplier_snapshot)
    values (new_item_id,supplier_uuid,contact_uuid,'pending',case when supplier_uuid is null then 'internal_manual' else 'supplier_manual' end,room_snapshot->'confirmation');
  else
    select source.*,supplier.display_name as supplier_name,contact.id as contact_id,contact.contact_name,contact.phone,contact.email,contact.zalo
    into offering
    from public.motorbike_offerings source
    join public.suppliers supplier on supplier.id=source.supplier_id
    left join lateral (
      select saved.* from public.supplier_contacts saved
      where saved.supplier_id=supplier.id and saved.is_active
      order by saved.is_primary desc,saved.updated_at desc limit 1
    ) contact on true
    where source.id=target_source_id and source.publication_status='published' and source.availability_state<>'unavailable'
      and public.is_current_motorbike_source(source.supplier_id,source.source_external_ref_id);
    if not found then raise exception 'Replacement Motorbike source is not requestable'; end if;
    item_price:=case when old_item.counts_toward_booking_total and offering.public_price_vnd is not null
      and offering.price_checked_at<=now() and offering.price_valid_until>=greatest((now() at time zone 'Asia/Ho_Chi_Minh')::date,booking_row.check_out-1)
      then offering.public_price_vnd::bigint*target_quantity else null end;
    insert into public.booking_items (
      booking_id,parent_booking_item_id,item_key,component_type,source_motorbike_offering_id,source_package_component_id,
      service_from,service_until,quantity,is_required,counts_toward_booking_total,display_name_snapshot,
      description_snapshot,parent_name_snapshot,confirmation_mode_snapshot,sell_price_vnd,net_cost_vnd,
      price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,
      verification_snapshot,confirmation_context_snapshot,policy_snapshot,replacement_for_booking_item_id,
      change_request_id,operational_status
    ) values (
      booking_row.id,old_item.parent_booking_item_id,new_key,'MOTORBIKE',target_source_id,old_item.source_package_component_id,
      booking_row.check_in,booking_row.check_out,target_quantity,old_item.is_required,old_item.counts_toward_booking_total,
      offering.display_name,offering.public_description,old_item.parent_name_snapshot,'operator_manual',item_price,null,
      case when old_item.counts_toward_booking_total then case when item_price is null then 'unknown' else 'quoted' end else 'included_in_package' end,
      'needs_confirmation','pending',jsonb_build_object('offering_id',offering.id,'slug',offering.slug,'display_name',offering.display_name,'source_system','taxua_biker_manual_reference'),
      case when old_item.counts_toward_booking_total then jsonb_build_object('status',case when item_price is null then 'unknown' else 'quoted' end,'total_vnd',item_price,'listed_unit_vnd',case when item_price is null then null else offering.public_price_vnd end,'currency','VND') else jsonb_build_object('status','included_in_package','total_vnd',null) end,
      jsonb_build_object('status','needs_confirmation','source_state',offering.availability_state),
      '{}'::jsonb,jsonb_build_object('supplier_id',offering.supplier_id,'supplier_name',offering.supplier_name,'contact_id',offering.contact_id,'contact_name',offering.contact_name,'phone',offering.phone,'email',offering.email,'zalo',offering.zalo),
      jsonb_build_object('booking','phase11-operations-v1','integration_mode','manual_reference','replacement_for_booking_item_id',old_item.id,'component_double_counting',false),
      old_item.id,target_change_request_id,'active'
    ) returning id into new_item_id;
    insert into public.booking_item_confirmations (booking_item_id,supplier_id,supplier_contact_id,status,confirmation_mode,supplier_snapshot)
    values (new_item_id,offering.supplier_id,offering.contact_id,'pending','operator_manual',
      jsonb_build_object('supplier_id',offering.supplier_id,'supplier_name',offering.supplier_name,'contact_id',offering.contact_id,'contact_name',offering.contact_name,'phone',offering.phone,'email',offering.email,'zalo',offering.zalo));
  end if;

  select confirmation.*,old_item.booking_id into old_confirmation
  from public.booking_item_confirmations confirmation where confirmation.booking_item_id=old_item.id for update;
  if found then
    insert into public.booking_confirmation_events (
      booking_id,booking_item_id,confirmation_id,previous_status,next_status,requested_at_snapshot,due_at_snapshot,
      responded_at_snapshot,expires_at_snapshot,reminder_count_snapshot,external_reference_snapshot,
      response_note_snapshot,supplier_snapshot,reason,actor_type,actor_user_id
    ) values (
      booking_row.id,old_item.id,old_confirmation.id,old_confirmation.status,
      case when old_confirmation.status in ('declined','expired','cancelled') then old_confirmation.status else 'cancelled' end,
      old_confirmation.requested_at,old_confirmation.due_at,old_confirmation.responded_at,old_confirmation.expires_at,
      old_confirmation.reminder_count,old_confirmation.external_reference,old_confirmation.response_note_internal,
      old_confirmation.supplier_snapshot,'Booking Item được thay thế',actor,auth.uid()
    );
    if old_confirmation.status not in ('declined','expired','cancelled') then
      update public.booking_item_confirmations set status='cancelled',responded_at=now(),updated_at=now(),updated_by=auth.uid()
      where id=old_confirmation.id;
    end if;
  end if;
  update public.booking_items
  set operational_status='replaced',replaced_by_booking_item_id=new_item_id,operational_updated_at=now()
  where id=old_item.id;
  insert into public.booking_events (booking_id,booking_item_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values (booking_row.id,new_item_id,'item_replaced','Một dịch vụ trong chuyến đi đã được thay thế và cần xác nhận lại.',
    jsonb_build_object('change_request_id',target_change_request_id,'old_booking_item_id',old_item.id,'new_booking_item_id',new_item_id,'component_type',target_component_type),actor,auth.uid());
  return new_item_id;
end;
$$;

create or replace function public.apply_booking_change_request(
  target_change_request_id uuid,
  target_expected_revision bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row record; booking_row record; current_quote record; new_quote_id uuid; new_item_id uuid;
  old_snapshot jsonb; new_snapshot jsonb; target_item record; actor text; reset_row record;
begin
  if not public.is_admin() then raise exception 'Applying a Booking change requires admin'; end if;
  select * into request_row from public.booking_change_requests where id=target_change_request_id for update;
  if not found then raise exception 'Change request not found'; end if;
  if request_row.status='applied' then return nullif(request_row.resolution_snapshot->>'new_quote_id','')::uuid; end if;
  if request_row.status<>'approved' then raise exception 'Only an approved change can be applied'; end if;
  select * into booking_row from public.bookings where id=request_row.booking_id for update;
  if booking_row.operations_revision<>target_expected_revision or booking_row.operations_revision<>request_row.booking_revision_at_request then
    raise exception 'Booking changed; reload before continuing';
  end if;
  if booking_row.lifecycle_status in ('cancelled','completed','expired') then raise exception 'Terminal Booking cannot be changed'; end if;
  actor:='admin';
  select * into current_quote from public.booking_quotes where booking_id=booking_row.id and is_current for update;
  old_snapshot:=jsonb_build_object(
    'check_in',booking_row.check_in,'check_out',booking_row.check_out,'adults',booking_row.adults,
    'children',booking_row.children,'rooms',booking_row.rooms,'quote_version',current_quote.quote_version
  );
  perform set_config('phase11.change_request_id',request_row.id::text,true);

  if request_row.change_type='dates' then
    update public.bookings set check_in=(request_row.request_payload->>'check_in')::date,
      check_out=(request_row.request_payload->>'check_out')::date,updated_at=now(),updated_by=auth.uid()
    where id=booking_row.id;
  elsif request_row.change_type='guest_count' then
    update public.bookings set adults=(request_row.request_payload->>'adults')::integer,
      children=(request_row.request_payload->>'children')::integer,updated_at=now(),updated_by=auth.uid()
    where id=booking_row.id;
  elsif request_row.change_type='room_quantity' then
    select * into target_item from public.booking_items
    where id=(request_row.request_payload->>'target_item_id')::uuid and booking_id=booking_row.id and operational_status='active' for update;
    if not found or target_item.component_type not in ('ROOM','MOTORBIKE') then raise exception 'Room quantity target is not replaceable'; end if;
    new_item_id:=public.phase11_replace_booking_item(request_row.id,target_item.id,target_item.component_type,
      coalesce(target_item.source_room_type_id,target_item.source_motorbike_offering_id),(request_row.request_payload->>'quantity')::integer);
  else
    new_item_id:=public.phase11_replace_booking_item(request_row.id,
      (request_row.request_payload->>'target_item_id')::uuid,request_row.request_payload->>'replacement_component_type',
      (request_row.request_payload->>'replacement_source_id')::uuid,
      (select quantity from public.booking_items where id=(request_row.request_payload->>'target_item_id')::uuid));
  end if;

  if request_row.change_type in ('dates','guest_count') then
    for reset_row in
      select confirmation.*,item.booking_id
      from public.booking_item_confirmations confirmation
      join public.booking_items item on item.id=confirmation.booking_item_id
      where item.booking_id=booking_row.id and item.operational_status='active'
      for update of confirmation
    loop
      insert into public.booking_confirmation_events (
        booking_id,booking_item_id,confirmation_id,previous_status,next_status,requested_at_snapshot,due_at_snapshot,
        responded_at_snapshot,expires_at_snapshot,reminder_count_snapshot,external_reference_snapshot,
        response_note_snapshot,supplier_snapshot,reason,actor_type,actor_user_id
      ) values (
        booking_row.id,reset_row.booking_item_id,reset_row.id,reset_row.status,'pending',reset_row.requested_at,
        reset_row.due_at,reset_row.responded_at,reset_row.expires_at,reset_row.reminder_count,
        reset_row.external_reference,reset_row.response_note_internal,reset_row.supplier_snapshot,
        'Thay đổi thông tin chuyến đi yêu cầu xác nhận lại',actor,auth.uid()
      );
    end loop;
    update public.booking_item_confirmations confirmation set
      status='pending',requested_at=null,due_at=null,responded_at=null,expires_at=null,
      last_reminded_at=null,reminder_count=0,overdue_event_at=null,external_reference=null,
      response_note_internal=null,updated_at=now(),updated_by=auth.uid()
    where confirmation.booking_item_id in (
      select id from public.booking_items where booking_id=booking_row.id and operational_status='active'
    );
    update public.booking_items set confirmation_status='pending'
    where booking_id=booking_row.id and operational_status='active' and confirmation_status<>'not_required';
  end if;

  perform public.phase8_recompute_confirmation(booking_row.id);
  new_quote_id:=public.phase11_create_quote_version(booking_row.id,'Áp dụng '||request_row.change_code,actor);
  perform public.phase9_sync_checkout_state(booking_row.id);
  select jsonb_build_object('check_in',check_in,'check_out',check_out,'adults',adults,'children',children,'rooms',rooms,
    'operations_revision',operations_revision,'new_booking_item_id',new_item_id,
    'quote_version',(select quote_version from public.booking_quotes where id=new_quote_id))
  into new_snapshot from public.bookings where id=booking_row.id;
  update public.booking_change_requests set status='applied',applied_at=now(),applied_by=auth.uid(),updated_at=now(),
    resolution_snapshot=jsonb_build_object('old',old_snapshot,'new',new_snapshot,'old_quote_id',current_quote.id,'new_quote_id',new_quote_id)
  where id=request_row.id;
  insert into public.booking_events (booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values (booking_row.id,'change_applied','Thay đổi chuyến đi đã được áp dụng; các thông tin liên quan đang được kiểm tra lại.',
    jsonb_build_object('change_request_id',request_row.id,'change_code',request_row.change_code,'change_type',request_row.change_type,
      'old',old_snapshot,'new',new_snapshot,'old_quote_id',current_quote.id,'new_quote_id',new_quote_id),actor,auth.uid());
  return new_quote_id;
end;
$$;

create or replace function public.update_supplier_confirmation_v2(
  target_booking_item_id uuid,
  target_status text,
  target_note text default null,
  target_external_reference text default null,
  target_expires_at timestamptz default null,
  target_expected_updated_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare confirmation_row record; booking_uuid uuid; actor text; next_requested_at timestamptz; next_due_at timestamptz;
begin
  if not public.is_staff_or_admin() then raise exception 'Supplier confirmation requires staff'; end if;
  if target_status not in ('requested','confirmed','declined','expired','cancelled') then raise exception 'Invalid confirmation status'; end if;
  if target_expected_updated_at is null then raise exception 'Confirmation revision is required'; end if;
  if target_note is not null and char_length(target_note)>5000 then raise exception 'Confirmation note is too long'; end if;
  if target_external_reference is not null and char_length(target_external_reference)>500 then raise exception 'Confirmation reference is too long'; end if;
  if target_expires_at is not null and target_expires_at<=now() and target_status not in ('expired','cancelled') then raise exception 'Confirmation expiry must be in the future'; end if;
  select confirmation.*,item.booking_id,item.operational_status
  into confirmation_row
  from public.booking_item_confirmations confirmation
  join public.booking_items item on item.id=confirmation.booking_item_id
  where confirmation.booking_item_id=target_booking_item_id for update of confirmation;
  if not found then raise exception 'Confirmation not found'; end if;
  if confirmation_row.updated_at is distinct from target_expected_updated_at then raise exception 'Booking changed; reload before continuing'; end if;
  if confirmation_row.operational_status<>'active' then raise exception 'Inactive Booking Item cannot be confirmed'; end if;
  if confirmation_row.status in ('declined','expired','cancelled') then raise exception 'Terminal supplier response is immutable'; end if;
  if target_status='requested' and confirmation_row.status not in ('pending','requested') then raise exception 'Confirmed response cannot return to requested'; end if;
  next_requested_at:=case when target_status='requested' then coalesce(confirmation_row.requested_at,now()) else confirmation_row.requested_at end;
  next_due_at:=case when target_status='requested' then coalesce(confirmation_row.due_at,next_requested_at+interval '4 hours') else confirmation_row.due_at end;
  if confirmation_row.status=target_status
    and confirmation_row.expires_at is not distinct from target_expires_at
    and confirmation_row.external_reference is not distinct from nullif(btrim(target_external_reference),'')
    and confirmation_row.response_note_internal is not distinct from nullif(btrim(target_note),'') then return; end if;
  booking_uuid:=confirmation_row.booking_id;
  actor:=case when public.is_admin() then 'admin' else 'staff' end;
  insert into public.booking_confirmation_events (
    booking_id,booking_item_id,confirmation_id,previous_status,next_status,requested_at_snapshot,due_at_snapshot,
    responded_at_snapshot,expires_at_snapshot,reminder_count_snapshot,external_reference_snapshot,
    response_note_snapshot,supplier_snapshot,reason,actor_type,actor_user_id
  ) values (
    booking_uuid,target_booking_item_id,confirmation_row.id,confirmation_row.status,target_status,
    confirmation_row.requested_at,confirmation_row.due_at,confirmation_row.responded_at,confirmation_row.expires_at,
    confirmation_row.reminder_count,confirmation_row.external_reference,confirmation_row.response_note_internal,
    confirmation_row.supplier_snapshot,nullif(btrim(target_note),''),actor,auth.uid()
  );
  update public.booking_item_confirmations set
    status=target_status,requested_at=next_requested_at,due_at=next_due_at,
    responded_at=case when target_status in ('confirmed','declined','expired','cancelled') then now() else null end,
    expires_at=target_expires_at,external_reference=nullif(btrim(target_external_reference),''),
    response_note_internal=nullif(btrim(target_note),''),updated_at=now(),updated_by=auth.uid()
  where id=confirmation_row.id;
  update public.booking_items set confirmation_status=target_status where id=target_booking_item_id;
  perform public.phase8_recompute_confirmation(booking_uuid);
  perform public.phase9_sync_checkout_state(booking_uuid);
  insert into public.booking_events (booking_id,booking_item_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values (booking_uuid,target_booking_item_id,'supplier_confirmation_'||target_status,case target_status
    when 'requested' then 'Đang chờ nhà cung cấp phản hồi cho một dịch vụ.'
    when 'confirmed' then 'Một dịch vụ đã được xác nhận.'
    when 'declined' then 'Một dịch vụ không thể xác nhận.'
    when 'expired' then 'Một xác nhận dịch vụ đã hết hiệu lực.'
    else 'Một yêu cầu xác nhận dịch vụ đã được hủy.' end,
    jsonb_build_object('external_reference',nullif(btrim(target_external_reference),''),'due_at',next_due_at,'operations_policy_version','phase11-operations-v1'),actor,auth.uid());
end;
$$;

create or replace function public.update_booking_lifecycle_v2(
  target_booking_id uuid,
  target_status text,
  target_note text,
  target_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_revision bigint;
begin
  if not public.is_staff_or_admin() then raise exception 'Booking lifecycle requires staff'; end if;
  if target_status='cancelled' and not public.is_admin() then raise exception 'Booking cancellation requires admin'; end if;
  if target_status in ('cancelled','completed','expired') and nullif(btrim(target_note),'') is null then raise exception 'Terminal lifecycle reason is required'; end if;
  select operations_revision into current_revision from public.bookings where id=target_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if current_revision<>target_expected_revision then raise exception 'Booking changed; reload before continuing'; end if;
  perform public.update_booking_lifecycle(target_booking_id,target_status,target_note);
end;
$$;

create or replace function public.follow_up_supplier_confirmation(
  target_confirmation_id uuid,
  target_expected_updated_at timestamptz,
  target_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare confirmation_row record; booking_uuid uuid; actor text;
begin
  if not public.is_staff_or_admin() then raise exception 'Confirmation follow-up requires staff'; end if;
  if char_length(btrim(coalesce(target_reason,''))) not between 2 and 500 then raise exception 'Follow-up reason is required'; end if;
  select confirmation.*,item.booking_id,item.operational_status into confirmation_row
  from public.booking_item_confirmations confirmation join public.booking_items item on item.id=confirmation.booking_item_id
  where confirmation.id=target_confirmation_id for update of confirmation;
  if not found then raise exception 'Confirmation not found'; end if;
  if confirmation_row.updated_at is distinct from target_expected_updated_at then raise exception 'Booking changed; reload before continuing'; end if;
  if confirmation_row.status<>'requested' or confirmation_row.operational_status<>'active' then raise exception 'Only an active requested confirmation can be followed up'; end if;
  if confirmation_row.last_reminded_at is not null and confirmation_row.last_reminded_at>now()-interval '5 minutes' then return; end if;
  booking_uuid:=confirmation_row.booking_id; actor:=case when public.is_admin() then 'admin' else 'staff' end;
  insert into public.booking_confirmation_events (
    booking_id,booking_item_id,confirmation_id,previous_status,next_status,requested_at_snapshot,due_at_snapshot,
    responded_at_snapshot,expires_at_snapshot,reminder_count_snapshot,external_reference_snapshot,
    response_note_snapshot,supplier_snapshot,reason,actor_type,actor_user_id
  ) values (
    booking_uuid,confirmation_row.booking_item_id,confirmation_row.id,'requested','requested',confirmation_row.requested_at,
    confirmation_row.due_at,confirmation_row.responded_at,confirmation_row.expires_at,confirmation_row.reminder_count,
    confirmation_row.external_reference,confirmation_row.response_note_internal,confirmation_row.supplier_snapshot,
    btrim(target_reason),actor,auth.uid()
  );
  update public.booking_item_confirmations set reminder_count=reminder_count+1,last_reminded_at=now(),updated_at=now(),updated_by=auth.uid()
  where id=target_confirmation_id;
  insert into public.booking_events (booking_id,booking_item_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values (booking_uuid,confirmation_row.booking_item_id,'confirmation_followed_up',null,
    jsonb_build_object('confirmation_id',confirmation_row.id,'reason',btrim(target_reason),'reminder_count',confirmation_row.reminder_count+1),actor,auth.uid());
end;
$$;

create or replace function public.process_operational_expiries(target_limit integer default 200)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare row_item record; processed_confirmations integer:=0; marked_overdue integer:=0; synced_bookings integer:=0; expired_bookings integer:=0;
begin
  if not public.is_staff_or_admin() then raise exception 'Operational expiry processing requires staff'; end if;
  if target_limit not between 1 and 500 then raise exception 'Expiry batch limit is invalid'; end if;

  for row_item in
    select confirmation.*,item.booking_id,item.id as item_id
    from public.booking_item_confirmations confirmation
    join public.booking_items item on item.id=confirmation.booking_item_id
    join public.bookings booking on booking.id=item.booking_id
    where item.operational_status='active' and booking.lifecycle_status in ('submitted','active')
      and confirmation.status in ('requested','confirmed') and confirmation.expires_at is not null and confirmation.expires_at<=now()
    order by confirmation.expires_at,confirmation.id for update of confirmation skip locked limit target_limit
  loop
    insert into public.booking_confirmation_events (
      booking_id,booking_item_id,confirmation_id,previous_status,next_status,requested_at_snapshot,due_at_snapshot,
      responded_at_snapshot,expires_at_snapshot,reminder_count_snapshot,external_reference_snapshot,
      response_note_snapshot,supplier_snapshot,reason,actor_type
    ) values (
      row_item.booking_id,row_item.item_id,row_item.id,row_item.status,'expired',row_item.requested_at,row_item.due_at,
      row_item.responded_at,row_item.expires_at,row_item.reminder_count,row_item.external_reference,
      row_item.response_note_internal,row_item.supplier_snapshot,'Hết hiệu lực theo mốc đã lưu','system'
    );
    update public.booking_item_confirmations set status='expired',responded_at=coalesce(responded_at,now()),updated_at=now() where id=row_item.id;
    update public.booking_items set confirmation_status='expired' where id=row_item.item_id;
    perform public.phase8_recompute_confirmation(row_item.booking_id);
    perform public.phase9_sync_checkout_state(row_item.booking_id);
    insert into public.booking_events (booking_id,booking_item_id,event_type,public_message,internal_detail,actor_type)
    values (row_item.booking_id,row_item.item_id,'supplier_confirmation_expired','Một xác nhận dịch vụ đã hết hiệu lực.',jsonb_build_object('confirmation_id',row_item.id,'expires_at',row_item.expires_at),'system');
    processed_confirmations:=processed_confirmations+1;
  end loop;

  for row_item in
    select confirmation.*,item.booking_id,item.id as item_id
    from public.booking_item_confirmations confirmation
    join public.booking_items item on item.id=confirmation.booking_item_id
    join public.bookings booking on booking.id=item.booking_id
    where item.operational_status='active' and booking.lifecycle_status in ('submitted','active')
      and confirmation.status='requested' and confirmation.due_at is not null and confirmation.due_at<=now()
      and confirmation.overdue_event_at is null
    order by confirmation.due_at,confirmation.id for update of confirmation skip locked limit target_limit
  loop
    update public.booking_item_confirmations set overdue_event_at=now(),updated_at=now() where id=row_item.id;
    insert into public.booking_events (booking_id,booking_item_id,event_type,public_message,internal_detail,actor_type)
    values (row_item.booking_id,row_item.item_id,'confirmation_overdue',null,
      jsonb_build_object('confirmation_id',row_item.id,'requested_at',row_item.requested_at,'due_at',row_item.due_at,'sla_kind','internal_operational'),'system');
    marked_overdue:=marked_overdue+1;
  end loop;

  for row_item in
    select distinct booking.id
    from public.bookings booking
    left join public.booking_quotes quote on quote.booking_id=booking.id and quote.is_current
    left join public.checkout_sessions checkout on checkout.booking_id=booking.id and checkout.status in ('draft','ready')
    where (quote.quote_status='valid' and quote.quote_expires_at<=now()) or checkout.expires_at<=now()
    order by booking.id limit target_limit
  loop
    perform public.phase9_sync_checkout_state(row_item.id); synced_bookings:=synced_bookings+1;
  end loop;

  for row_item in
    select id from public.bookings
    where lifecycle_status in ('submitted','active') and check_out < (now() at time zone 'Asia/Ho_Chi_Minh')::date
    order by check_out,id for update skip locked limit target_limit
  loop
    perform public.update_booking_lifecycle(row_item.id,'expired','Hết hiệu lực sau ngày kết thúc chuyến đi.');
    expired_bookings:=expired_bookings+1;
  end loop;
  return jsonb_build_object('confirmation_expired',processed_confirmations,'confirmation_overdue_marked',marked_overdue,
    'checkout_quote_synced',synced_bookings,'booking_expired',expired_bookings,'policy_version','phase11-operations-v1');
end;
$$;

create or replace function public.get_admin_operations_feed(target_limit integer default 500)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb; bounded_limit integer; total_count bigint;
begin
  if not public.is_staff_or_admin() then raise exception 'Operations feed requires staff'; end if;
  bounded_limit:=least(greatest(coalesce(target_limit,500),1),1000);
  select count(*) into total_count from public.bookings;
  select jsonb_build_object(
    'policy_version','phase11-operations-v1',
    'priority_policy_version','phase11-operations-priority-v1',
    'total_bookings',total_count,
    'truncated',total_count>bounded_limit,
    'bookings',coalesce(jsonb_agg(jsonb_build_object(
      'id',booking.id,'booking_code',booking.booking_code,'customer_name',booking.customer_name,
      'customer_phone',booking.customer_phone,'lifecycle_status',booking.lifecycle_status,
      'confirmation_status',booking.confirmation_status,'check_in',booking.check_in,'check_out',booking.check_out,
      'adults',booking.adults,'children',booking.children,'rooms',booking.rooms,
      'price_status',booking.price_status,'submitted_at',booking.submitted_at,'updated_at',booking.updated_at,
      'operations_revision',booking.operations_revision,'last_operational_activity_at',booking.last_operational_activity_at,
      'items',coalesce((select jsonb_agg(jsonb_build_object(
        'id',item.id,'item_key',item.item_key,'component_type',item.component_type,
        'display_name',item.display_name_snapshot,'parent_name',item.parent_name_snapshot,'quantity',item.quantity,
        'is_required',item.is_required,'counts_toward_booking_total',item.counts_toward_booking_total,
        'price_status',item.price_status,'availability_status',item.availability_status,
        'confirmation_status',item.confirmation_status,'confirmation_mode',item.confirmation_mode_snapshot,
        'source_room_type_id',item.source_room_type_id,'source_motorbike_offering_id',item.source_motorbike_offering_id,
        'source_package_id',item.source_package_id,'operational_status',item.operational_status,
        'replacement_for_booking_item_id',item.replacement_for_booking_item_id,'replaced_by_booking_item_id',item.replaced_by_booking_item_id,
        'supplier_name',confirmation.supplier_snapshot->>'supplier_name',
        'confirmation',case when confirmation.id is null then null else jsonb_build_object(
          'id',confirmation.id,'status',confirmation.status,'requested_at',confirmation.requested_at,
          'due_at',confirmation.due_at,'responded_at',confirmation.responded_at,'expires_at',confirmation.expires_at,
          'last_reminded_at',confirmation.last_reminded_at,'reminder_count',confirmation.reminder_count,
          'updated_at',confirmation.updated_at,'has_supplier',confirmation.supplier_id is not null
        ) end
      ) order by item.created_at,item.item_key)
      from public.booking_items item
      left join public.booking_item_confirmations confirmation on confirmation.booking_item_id=item.id
      where item.booking_id=booking.id),'[]'::jsonb),
      'change_requests',coalesce((select jsonb_agg(jsonb_build_object(
        'id',request.id,'change_code',request.change_code,'change_type',request.change_type,'status',request.status,
        'request_payload',request.request_payload,'customer_reason',request.customer_reason,'internal_note',request.internal_note,
        'booking_revision_at_request',request.booking_revision_at_request,'resolution_snapshot',request.resolution_snapshot,
        'created_at',request.created_at,'updated_at',request.updated_at,'reviewed_at',request.reviewed_at,'applied_at',request.applied_at
      ) order by request.created_at desc)
      from public.booking_change_requests request where request.booking_id=booking.id),'[]'::jsonb),
      'current_quote',(select jsonb_build_object('id',quote.id,'quote_version',quote.quote_version,'quote_status',quote.quote_status,
        'price_status',quote.price_status,'booking_total_vnd',quote.booking_total_vnd,'quoted_at',quote.quoted_at,
        'quote_expires_at',quote.quote_expires_at) from public.booking_quotes quote where quote.booking_id=booking.id and quote.is_current),
      'checkout',public.phase9_resolve_checkout_readiness(booking.id)
    ) order by booking.submitted_at desc,booking.id),'[]'::jsonb)
  ) into result
  from (
    select saved.* from public.bookings saved order by saved.submitted_at desc,saved.id limit bounded_limit
  ) booking;
  return result;
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
    where package.publication_status='published' and (
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

create or replace function public.get_public_booking_status(target_booking_code text,target_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare booking_uuid uuid; result jsonb;
begin
  select id into booking_uuid from public.bookings
  where booking_code=upper(btrim(target_booking_code)) and public_access_token_hash=target_token_hash;
  if not found then return null; end if;
  perform public.phase9_sync_checkout_state(booking_uuid);
  select jsonb_build_object(
    'booking_code',b.booking_code,'lifecycle_status',b.lifecycle_status,'confirmation_status',b.confirmation_status,
    'check_in',b.check_in,'check_out',b.check_out,'adults',b.adults,'children',b.children,'rooms',b.rooms,
    'currency',b.currency,'quoted_sell_total_vnd',b.quoted_sell_total_vnd,'price_status',b.price_status,
    'quoted_at',b.quoted_at,'submitted_at',b.submitted_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'item_key',item.item_key,'component_type',item.component_type,'display_name',item.display_name_snapshot,
      'description',item.description_snapshot,'parent_name',item.parent_name_snapshot,'quantity',item.quantity,
      'is_required',item.is_required,'counts_toward_booking_total',item.counts_toward_booking_total,
      'sell_price_vnd',item.sell_price_vnd,'price_status',item.price_status,'availability_status',item.availability_status,
      'confirmation_status',item.confirmation_status,'confirmation_mode',item.confirmation_mode_snapshot,'quoted_at',item.quoted_at,
      'verification',jsonb_build_object(
        'room_verified',case when item.component_type<>'ROOM' or not (item.verification_snapshot?'room_verified') then null when lower(item.verification_snapshot->>'room_verified')='true' then true when lower(item.verification_snapshot->>'room_verified')='false' then false else null end,
        'cloud_view_verified',case when item.component_type<>'ROOM' or not (item.verification_snapshot?'cloud_view') then null when jsonb_typeof(item.verification_snapshot->'cloud_view')='object' then true when jsonb_typeof(item.verification_snapshot->'cloud_view')='null' then false else null end,
        'road_verified',case when item.component_type<>'ROOM' or not (item.verification_snapshot?'road') then null when jsonb_typeof(item.verification_snapshot->'road')='object' then true when jsonb_typeof(item.verification_snapshot->'road')='null' then false else null end,
        'road_grade',case when item.component_type='ROOM' and jsonb_typeof(item.verification_snapshot->'road')='object' and item.verification_snapshot#>>'{road,grade}' in ('a','b','c','d') then item.verification_snapshot#>>'{road,grade}' else null end
      )) order by item.created_at,item.item_key)
      from public.booking_items item where item.booking_id=b.id and item.operational_status='active'),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(jsonb_build_object('event_type',event.event_type,'message',event.public_message,'created_at',event.created_at) order by event.created_at,event.id)
      from public.booking_events event where event.booking_id=b.id and event.public_message is not null),'[]'::jsonb),
    'checkout',public.phase9_resolve_checkout_readiness(b.id)
  ) into result from public.bookings b where b.id=booking_uuid;
  return result;
end;
$$;

alter table public.booking_change_requests enable row level security;
alter table public.booking_confirmation_events enable row level security;

revoke all on table public.booking_change_requests,public.booking_confirmation_events from public,anon,authenticated;
grant select on table public.booking_change_requests,public.booking_confirmation_events to authenticated;

create policy "staff reads Booking change requests"
on public.booking_change_requests for select to authenticated
using ((select public.is_staff_or_admin()));

create policy "staff reads confirmation history"
on public.booking_confirmation_events for select to authenticated
using ((select public.is_staff_or_admin()));

revoke all on function public.phase11_validate_change_payload(text,jsonb) from public,anon,authenticated;
revoke all on function public.phase11_booking_revision_trigger() from public,anon,authenticated;
revoke all on function public.phase11_touch_booking_from_child() from public,anon,authenticated;
revoke all on function public.reject_phase11_history_mutation() from public,anon,authenticated;
revoke all on function public.phase11_create_quote_version(uuid,text,text) from public,anon,authenticated;
revoke all on function public.phase11_replace_booking_item(uuid,uuid,text,uuid,integer) from public,anon,authenticated;
revoke all on function public.create_booking_change_request(uuid,text,jsonb,text,text,bigint) from public,anon,authenticated;
revoke all on function public.review_booking_change_request(uuid,text,text,bigint) from public,anon,authenticated;
revoke all on function public.apply_booking_change_request(uuid,bigint) from public,anon,authenticated;
revoke all on function public.update_supplier_confirmation_v2(uuid,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.update_booking_lifecycle_v2(uuid,text,text,bigint) from public,anon,authenticated;
revoke all on function public.follow_up_supplier_confirmation(uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function public.process_operational_expiries(integer) from public,anon,authenticated;
revoke all on function public.get_admin_operations_feed(integer) from public,anon,authenticated;
revoke all on function public.get_admin_data_health(integer) from public,anon,authenticated;

-- Close the pre-Phase-11 mutation entry point, which cannot carry a stale-state
-- version. Application and authenticated callers must use the V2 contract.
revoke all on function public.update_supplier_confirmation(uuid,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.update_booking_lifecycle(uuid,text,text) from public,anon,authenticated;

grant execute on function public.create_booking_change_request(uuid,text,jsonb,text,text,bigint) to authenticated;
grant execute on function public.review_booking_change_request(uuid,text,text,bigint) to authenticated;
grant execute on function public.apply_booking_change_request(uuid,bigint) to authenticated;
grant execute on function public.update_supplier_confirmation_v2(uuid,text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.update_booking_lifecycle_v2(uuid,text,text,bigint) to authenticated;
grant execute on function public.follow_up_supplier_confirmation(uuid,timestamptz,text) to authenticated;
grant execute on function public.process_operational_expiries(integer) to authenticated;
grant execute on function public.get_admin_operations_feed(integer) to authenticated;
grant execute on function public.get_admin_data_health(integer) to authenticated;

revoke all on function public.get_public_booking_status(text,text) from public;
grant execute on function public.get_public_booking_status(text,text) to anon,authenticated;

comment on table public.booking_change_requests is
  'Controlled Phase 11 Booking changes. Request, review and atomic apply remain separate; unrestricted JSON mutation is rejected.';
comment on table public.booking_confirmation_events is
  'Private append-only confirmation transition/reminder history. Anonymous access is zero.';
comment on column public.booking_item_confirmations.due_at is
  'Internal operational follow-up target. This is not a Supplier contractual SLA.';
comment on function public.get_admin_operations_feed(integer) is
  'Bounded private operations input for deterministic phase11-operations-v1 application policy.';
comment on function public.process_operational_expiries(integer) is
  'Bounded idempotent manual maintenance for Booking, Confirmation, Quote and Checkout expiry semantics.';
comment on function public.apply_booking_change_request(uuid,bigint) is
  'Admin-only atomic apply with revision check, immutable replacement snapshots, confirmation reevaluation, requote and audit.';
comment on function public.get_public_booking_status(text,text) is
  'Secure code-plus-opaque-token My Trip projection. Replaced/private operational records remain excluded; verification stays snapshot-derived.';
