-- Tà Xùa Trip V2 Phase 9: Booking Operations + Checkout Readiness.
-- This migration prepares a provider-neutral payment boundary. It does not
-- collect money, create a provider intent, accept a webhook, or add paid state.

create table public.booking_quotes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  quote_version integer not null,
  quote_status text not null,
  price_status text not null,
  currency text not null default 'VND',
  booking_total_vnd bigint,
  quoted_at timestamptz not null default now(),
  quote_expires_at timestamptz,
  is_current boolean not null default true,
  reason text not null,
  quote_snapshot jsonb not null default '{}'::jsonb,
  superseded_at timestamptz,
  expired_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint booking_quotes_version_unique unique (booking_id, quote_version),
  constraint booking_quotes_version_positive check (quote_version > 0),
  constraint booking_quotes_status_allowed check (quote_status in ('valid', 'expired', 'superseded', 'needs_requote')),
  constraint booking_quotes_price_status_allowed check (price_status in ('authoritative', 'missing', 'stale', 'conflict')),
  constraint booking_quotes_currency_vnd check (currency = 'VND'),
  constraint booking_quotes_total_valid check (booking_total_vnd is null or booking_total_vnd between 0 and 200000000000),
  constraint booking_quotes_reason_length check (char_length(btrim(reason)) between 2 and 500),
  constraint booking_quotes_snapshot_object check (jsonb_typeof(quote_snapshot) = 'object'),
  constraint booking_quotes_valid_shape check (
    (quote_status = 'valid' and price_status = 'authoritative' and booking_total_vnd is not null and quote_expires_at > quoted_at)
    or quote_status <> 'valid'
  ),
  constraint booking_quotes_superseded_shape check ((quote_status = 'superseded') = (superseded_at is not null)),
  constraint booking_quotes_expired_shape check ((quote_status = 'expired') = (expired_at is not null))
);

create unique index booking_quotes_one_current on public.booking_quotes (booking_id) where is_current;
create index booking_quotes_history_index on public.booking_quotes (booking_id, quote_version desc);

create table public.booking_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.booking_quotes(id) on delete restrict,
  booking_item_id uuid not null references public.booking_items(id) on delete restrict,
  item_key text not null,
  component_type text not null,
  quantity integer not null,
  counts_toward_booking_total boolean not null,
  sell_price_vnd bigint,
  price_status text not null,
  price_valid_until date,
  source_snapshot jsonb not null,
  price_snapshot jsonb not null,
  availability_snapshot jsonb not null,
  verification_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint booking_quote_items_unique unique (quote_id, booking_item_id),
  constraint booking_quote_items_component_allowed check (component_type in ('ROOM', 'MOTORBIKE', 'PACKAGE', 'CUSTOM')),
  constraint booking_quote_items_quantity_valid check (quantity between 1 and 100),
  constraint booking_quote_items_sell_valid check (sell_price_vnd is null or sell_price_vnd between 0 and 200000000000),
  constraint booking_quote_items_price_status_allowed check (price_status in ('authoritative', 'missing', 'stale', 'conflict', 'included_in_package')),
  constraint booking_quote_items_snapshots_object check (
    jsonb_typeof(source_snapshot) = 'object' and jsonb_typeof(price_snapshot) = 'object'
    and jsonb_typeof(availability_snapshot) = 'object' and jsonb_typeof(verification_snapshot) = 'object'
  )
);

create index booking_quote_items_quote_index on public.booking_quote_items (quote_id, created_at, item_key);

create table public.booking_deposit_policies (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  policy_version integer not null,
  status text not null default 'active',
  policy_type text not null,
  fixed_amount_vnd bigint,
  percentage_bps integer,
  free_cancel_until timestamptz,
  non_refundable_after timestamptz,
  manual_policy text,
  cancellation_terms text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  superseded_at timestamptz,
  constraint booking_deposit_policies_version_unique unique (booking_id, policy_version),
  constraint booking_deposit_policies_version_positive check (policy_version > 0),
  constraint booking_deposit_policies_status_allowed check (status in ('active', 'superseded')),
  constraint booking_deposit_policies_type_allowed check (policy_type in ('none', 'fixed_amount', 'percentage', 'full_payment', 'manual')),
  constraint booking_deposit_policies_shape check (
    (policy_type = 'fixed_amount' and fixed_amount_vnd between 0 and 200000000000 and percentage_bps is null)
    or (policy_type = 'percentage' and percentage_bps between 1 and 10000 and fixed_amount_vnd is null)
    or (policy_type in ('none', 'full_payment', 'manual') and fixed_amount_vnd is null and percentage_bps is null)
  ),
  constraint booking_deposit_policies_copy_length check (
    (manual_policy is null or char_length(manual_policy) <= 5000)
    and (cancellation_terms is null or char_length(cancellation_terms) <= 10000)
  ),
  constraint booking_deposit_policies_superseded_shape check ((status = 'superseded') = (superseded_at is not null))
);

create unique index booking_deposit_policies_one_current on public.booking_deposit_policies (booking_id) where is_current;
create index booking_deposit_policies_history_index on public.booking_deposit_policies (booking_id, policy_version desc);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  quote_id uuid not null references public.booking_quotes(id) on delete restrict,
  quote_version integer not null,
  deposit_policy_id uuid not null references public.booking_deposit_policies(id) on delete restrict,
  deposit_policy_version integer not null,
  status text not null default 'draft',
  booking_total_vnd bigint not null,
  amount_due_vnd bigint not null,
  planned_remaining_balance_vnd bigint not null,
  currency text not null default 'VND',
  deposit_policy_snapshot jsonb not null,
  readiness_snapshot jsonb not null,
  readiness_policy_version text not null default 'phase9-checkout-readiness-v1',
  provider_state text not null default 'unconfigured',
  provider_key text,
  provider_reference text,
  expires_at timestamptz not null,
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint checkout_sessions_status_allowed check (status in ('draft', 'ready', 'expired', 'cancelled', 'consumed')),
  constraint checkout_sessions_versions_positive check (quote_version > 0 and deposit_policy_version > 0),
  constraint checkout_sessions_amounts_valid check (
    booking_total_vnd between 0 and 200000000000
    and amount_due_vnd between 0 and booking_total_vnd
    and planned_remaining_balance_vnd = booking_total_vnd - amount_due_vnd
  ),
  constraint checkout_sessions_currency_vnd check (currency = 'VND'),
  constraint checkout_sessions_snapshots_object check (jsonb_typeof(deposit_policy_snapshot) = 'object' and jsonb_typeof(readiness_snapshot) = 'object'),
  constraint checkout_sessions_policy_version check (readiness_policy_version = 'phase9-checkout-readiness-v1'),
  constraint checkout_sessions_provider_unconfigured check (provider_state = 'unconfigured' and provider_key is null and provider_reference is null),
  constraint checkout_sessions_expiry_valid check (expires_at > created_at),
  constraint checkout_sessions_invalidation_shape check ((status in ('expired', 'cancelled')) = (invalidated_at is not null))
);

create unique index checkout_sessions_one_active_per_booking on public.checkout_sessions (booking_id) where status in ('draft', 'ready');
create index checkout_sessions_booking_index on public.checkout_sessions (booking_id, created_at desc);

create or replace function public.phase9_actor_type()
returns text language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then 'admin' when public.is_staff_or_admin() then 'staff' else 'system' end;
$$;

create or replace function public.phase9_calculate_deposit(
  target_policy_type text,
  target_total_vnd bigint,
  target_fixed_amount_vnd bigint,
  target_percentage_bps integer
)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare amount_due bigint;
begin
  if target_total_vnd is null or target_total_vnd < 0 then
    return jsonb_build_object('valid', false, 'amount_due_vnd', null, 'remaining_balance_vnd', null, 'blocker', 'missing_total');
  end if;
  case target_policy_type
    when 'none' then amount_due := 0;
    when 'fixed_amount' then
      if target_fixed_amount_vnd is null or target_fixed_amount_vnd < 0 or target_fixed_amount_vnd > target_total_vnd then
        return jsonb_build_object('valid', false, 'amount_due_vnd', null, 'remaining_balance_vnd', null, 'blocker', 'invalid_fixed_amount');
      end if;
      amount_due := target_fixed_amount_vnd;
    when 'percentage' then
      if target_percentage_bps is null or target_percentage_bps < 1 or target_percentage_bps > 10000 then
        return jsonb_build_object('valid', false, 'amount_due_vnd', null, 'remaining_balance_vnd', null, 'blocker', 'invalid_percentage');
      end if;
      amount_due := round((target_total_vnd::numeric * target_percentage_bps::numeric) / 10000)::bigint;
    when 'full_payment' then amount_due := target_total_vnd;
    when 'manual' then
      return jsonb_build_object('valid', false, 'amount_due_vnd', null, 'remaining_balance_vnd', null, 'blocker', 'manual_policy');
    else
      return jsonb_build_object('valid', false, 'amount_due_vnd', null, 'remaining_balance_vnd', null, 'blocker', 'missing_policy');
  end case;
  return jsonb_build_object('valid', true, 'amount_due_vnd', amount_due, 'remaining_balance_vnd', target_total_vnd - amount_due, 'blocker', null);
end;
$$;

create or replace function public.phase9_assess_room_price(target_snapshot jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare line jsonb; earliest_valid date; required_date date;
begin
  if coalesce(target_snapshot#>>'{price,status}', '') = 'conflict' then
    return jsonb_build_object('status', 'conflict', 'total_vnd', null, 'valid_until', null);
  end if;
  if coalesce(target_snapshot#>>'{price,status}', '') <> 'quoted' or target_snapshot#>>'{price,total_vnd}' is null then
    return jsonb_build_object('status', 'missing', 'total_vnd', null, 'valid_until', null);
  end if;
  for line in select value from jsonb_array_elements(coalesce(target_snapshot#>'{price,nightly_lines}', '[]'::jsonb)) loop
    required_date := greatest((line->>'date')::date, (now() at time zone 'Asia/Ho_Chi_Minh')::date);
    if coalesce(line->>'state', '') <> 'resolved'
      or coalesce(line->>'source', '') not in ('partner', 'admin', 'contract')
      or line->>'verified_at' is null or (line->>'verified_at')::timestamptz > now()
      or line->>'valid_until' is null or (line->>'valid_until')::date < required_date then
      return jsonb_build_object('status', 'stale', 'total_vnd', null, 'valid_until', null);
    end if;
    earliest_valid := least(coalesce(earliest_valid, (line->>'valid_until')::date), (line->>'valid_until')::date);
  end loop;
  if earliest_valid is null then return jsonb_build_object('status', 'missing', 'total_vnd', null, 'valid_until', null); end if;
  return jsonb_build_object('status', 'authoritative', 'total_vnd', (target_snapshot#>>'{price,total_vnd}')::bigint, 'valid_until', earliest_valid);
end;
$$;

create or replace function public.phase9_create_quote_version(target_booking_id uuid, target_reason text, target_actor text)
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
  if target_actor not in ('customer', 'staff', 'admin', 'system') then raise exception 'Invalid quote actor'; end if;
  select * into booking_row from public.bookings where id = target_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if booking_row.lifecycle_status in ('cancelled', 'completed', 'expired') then raise exception 'Terminal Booking cannot be requoted'; end if;
  select * into current_quote from public.booking_quotes where booking_id = target_booking_id and is_current for update;
  next_version := coalesce(current_quote.quote_version, 0) + 1;
  if current_quote.id is not null then
    update public.booking_quotes set quote_status = 'superseded', is_current = false, superseded_at = now(), expired_at = null
    where id = current_quote.id;
    update public.checkout_sessions set status = 'expired', invalidated_at = now(), invalidation_reason = 'quote_superseded', updated_at = now(), updated_by = auth.uid()
    where booking_id = target_booking_id and status in ('draft', 'ready');
    get diagnostics invalidated_count = row_count;
    if invalidated_count > 0 then
      insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
      values (target_booking_id, 'checkout_session_expired', 'Phiên chuẩn bị thanh toán cũ đã hết hiệu lực sau khi báo giá thay đổi.', jsonb_build_object('count', invalidated_count, 'previous_quote_version', current_quote.quote_version), target_actor, auth.uid());
    end if;
  end if;

  insert into public.booking_quotes (booking_id, quote_version, quote_status, price_status, booking_total_vnd, quoted_at, reason, quote_snapshot, created_by)
  values (target_booking_id, next_version, 'needs_requote', 'missing', null, now(), btrim(target_reason), jsonb_build_object('policy_version', 'phase9-checkout-readiness-v1'), auth.uid())
  returning id into new_quote_id;

  for item in select * from public.booking_items where booking_id = target_booking_id order by created_at, item_key loop
    resolved := null; assessment := null; item_total := null; item_valid_until := null;
    if not item.counts_toward_booking_total then
      item_status := 'included_in_package';
      resolved := jsonb_build_object('source', item.source_snapshot, 'price', item.price_snapshot, 'availability', item.availability_snapshot, 'verification', item.verification_snapshot);
    elsif item.component_type = 'ROOM' then
      resolved := public.phase8_room_snapshot(item.source_room_type_id, booking_row.check_in, booking_row.check_out, item.quantity);
      assessment := public.phase9_assess_room_price(resolved);
      item_status := assessment->>'status'; item_total := (assessment->>'total_vnd')::bigint; item_valid_until := (assessment->>'valid_until')::date;
    elsif item.component_type = 'PACKAGE' then
      select coalesce(array_agg(distinct lower(btrim(entry.value)) order by lower(btrim(entry.value))), '{}'::text[])
      into optional_keys from jsonb_array_elements_text(coalesce(item.source_snapshot->'selected_optional_component_keys', '[]'::jsonb)) as entry(value);
      resolved := jsonb_build_object(
        'source', item.source_snapshot,
        'price', public.phase8_package_price_snapshot(item.source_package_id, booking_row.check_in, booking_row.check_out, booking_row.adults, booking_row.children, booking_row.rooms, optional_keys),
        'availability', item.availability_snapshot,
        'verification', item.verification_snapshot
      );
      item_status := case coalesce(resolved#>>'{price,status}', '') when 'quoted' then 'authoritative' when 'conflict' then 'conflict' else case when resolved#>>'{price,reason}' = 'stale' then 'stale' else 'missing' end end;
      if item_status = 'authoritative' then item_total := (resolved#>>'{price,total_vnd}')::bigint; item_valid_until := (resolved#>>'{price,valid_until}')::date; end if;
    elsif item.component_type = 'MOTORBIKE' then
      select o.* into offering from public.motorbike_offerings o
      where o.id = item.source_motorbike_offering_id and o.publication_status = 'published'
        and o.availability_state <> 'unavailable' and public.is_current_motorbike_source(o.supplier_id, o.source_external_ref_id);
      if not found or offering.public_price_vnd is null then
        item_status := 'missing';
        resolved := jsonb_build_object('source', item.source_snapshot, 'price', jsonb_build_object('status', 'missing', 'total_vnd', null), 'availability', item.availability_snapshot, 'verification', item.verification_snapshot);
      elsif offering.price_checked_at is null or offering.price_checked_at > now()
        or offering.price_valid_until is null or offering.price_valid_until < greatest((now() at time zone 'Asia/Ho_Chi_Minh')::date, booking_row.check_out - 1)
        or offering.source_checked_at is null or offering.source_checked_at > now() or now() - offering.source_checked_at > interval '7 days' then
        item_status := 'stale';
        resolved := jsonb_build_object('source', item.source_snapshot, 'price', jsonb_build_object('status', 'stale', 'total_vnd', null, 'verified_at', offering.price_checked_at, 'valid_until', offering.price_valid_until), 'availability', item.availability_snapshot, 'verification', item.verification_snapshot);
      else
        item_status := 'authoritative'; item_total := offering.public_price_vnd::bigint * item.quantity; item_valid_until := offering.price_valid_until;
        resolved := jsonb_build_object('source', item.source_snapshot, 'price', jsonb_build_object('status', 'authoritative', 'total_vnd', item_total, 'unit_vnd', offering.public_price_vnd, 'verified_at', offering.price_checked_at, 'valid_until', offering.price_valid_until), 'availability', jsonb_build_object('status', 'needs_confirmation', 'source_checked_at', offering.source_checked_at), 'verification', item.verification_snapshot);
      end if;
    else
      item_status := 'missing';
      resolved := jsonb_build_object('source', item.source_snapshot, 'price', jsonb_build_object('status', 'missing', 'total_vnd', null), 'availability', item.availability_snapshot, 'verification', item.verification_snapshot);
    end if;

    if item.counts_toward_booking_total then
      if item_status = 'conflict' then overall_status := 'conflict';
      elsif item_status = 'stale' and overall_status <> 'conflict' then overall_status := 'stale';
      elsif item_status = 'missing' and overall_status not in ('conflict', 'stale') then overall_status := 'missing'; end if;
      if item_status = 'authoritative' then
        quote_total := quote_total + item_total;
        earliest_valid := least(coalesce(earliest_valid, item_valid_until), item_valid_until);
      end if;
    end if;

    insert into public.booking_quote_items (
      quote_id, booking_item_id, item_key, component_type, quantity, counts_toward_booking_total,
      sell_price_vnd, price_status, price_valid_until, source_snapshot, price_snapshot, availability_snapshot, verification_snapshot
    ) values (
      new_quote_id, item.id, item.item_key, item.component_type, item.quantity, item.counts_toward_booking_total,
      case when item_status = 'authoritative' then item_total else null end, item_status, item_valid_until,
      coalesce(resolved->'source', '{}'::jsonb), coalesce(resolved->'price', '{}'::jsonb),
      coalesce(resolved->'availability', '{}'::jsonb), coalesce(resolved->'verification', '{}'::jsonb)
    );
  end loop;

  if overall_status = 'authoritative' and earliest_valid is not null then
    quote_expiry := least(now() + interval '24 hours', ((earliest_valid + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'));
    if quote_expiry > now() then final_quote_status := 'valid'; else final_quote_status := 'expired'; end if;
  else
    final_quote_status := 'needs_requote'; quote_expiry := null;
  end if;
  update public.booking_quotes set
    quote_status = final_quote_status,
    price_status = overall_status,
    booking_total_vnd = case when overall_status = 'authoritative' then quote_total else null end,
    quote_expires_at = quote_expiry,
    expired_at = case when final_quote_status = 'expired' then now() else null end,
    finalized_at = now(),
    quote_snapshot = jsonb_build_object('policy_version', 'phase9-checkout-readiness-v1', 'source', 'server_reresolution', 'item_count', (select count(*) from public.booking_quote_items where quote_id = new_quote_id))
  where id = new_quote_id;
  insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
  values (target_booking_id, case when next_version = 1 then 'booking_quote_created' else 'booking_requoted' end,
    case when final_quote_status = 'valid' then 'Báo giá chuyến đi đã được cập nhật.' else 'Báo giá cần được kiểm tra lại trước bước thanh toán.' end,
    jsonb_build_object('quote_version', next_version, 'quote_status', final_quote_status, 'price_status', overall_status, 'reason', btrim(target_reason)), target_actor, auth.uid());
  return new_quote_id;
end;
$$;

create or replace function public.phase9_resolve_checkout_readiness(target_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  booking_row record; quote_row record; policy_row record; session_row record;
  blockers jsonb := '[]'::jsonb; deposit jsonb; readiness text;
begin
  select * into booking_row from public.bookings where id = target_booking_id;
  if not found then return null; end if;
  select * into quote_row from public.booking_quotes where booking_id = target_booking_id and is_current;
  select * into policy_row from public.booking_deposit_policies where booking_id = target_booking_id and is_current;

  if booking_row.lifecycle_status <> 'active' then blockers := blockers || jsonb_build_array(case when booking_row.lifecycle_status in ('cancelled','completed','expired') then 'booking_terminal' else 'booking_not_active' end); end if;
  if booking_row.confirmation_status in ('failed', 'cancelled') then blockers := blockers || jsonb_build_array('confirmation_failed');
  elsif booking_row.confirmation_status <> 'confirmed' then blockers := blockers || jsonb_build_array('confirmation_incomplete'); end if;
  if quote_row.id is null then blockers := blockers || jsonb_build_array('quote_missing');
  elsif quote_row.quote_status = 'expired' or (quote_row.quote_status = 'valid' and quote_row.quote_expires_at <= now()) then blockers := blockers || jsonb_build_array('quote_expired');
  elsif quote_row.quote_status <> 'valid' then blockers := blockers || jsonb_build_array('quote_needs_requote'); end if;
  if quote_row.id is not null and quote_row.price_status <> 'authoritative' then blockers := blockers || jsonb_build_array('price_' || quote_row.price_status); end if;
  if quote_row.id is not null and quote_row.booking_total_vnd is null then blockers := blockers || jsonb_build_array('total_unknown'); end if;
  if policy_row.id is null then
    deposit := jsonb_build_object('valid', false, 'amount_due_vnd', null, 'remaining_balance_vnd', null, 'blocker', 'missing_policy');
    blockers := blockers || jsonb_build_array('deposit_policy_missing');
  else
    deposit := public.phase9_calculate_deposit(policy_row.policy_type, quote_row.booking_total_vnd, policy_row.fixed_amount_vnd, policy_row.percentage_bps);
    if not coalesce((deposit->>'valid')::boolean, false) then blockers := blockers || jsonb_build_array('deposit_' || coalesce(deposit->>'blocker', 'invalid')); end if;
    if policy_row.free_cancel_until is not null and policy_row.non_refundable_after is not null and policy_row.free_cancel_until > policy_row.non_refundable_after then
      blockers := blockers || jsonb_build_array('cancellation_policy_conflict');
    end if;
  end if;

  readiness := case
    when blockers ? 'booking_terminal' or blockers ? 'confirmation_failed' or blockers ? 'cancellation_policy_conflict' or blockers ? 'deposit_invalid_fixed_amount' or blockers ? 'deposit_invalid_percentage' then 'blocked'
    when blockers ? 'quote_expired' then 'expired'
    when blockers ? 'quote_missing' or blockers ? 'quote_needs_requote' or blockers ? 'price_missing' or blockers ? 'price_stale' or blockers ? 'price_conflict' or blockers ? 'total_unknown' then 'needs_requote'
    when blockers ? 'confirmation_incomplete' then 'needs_confirmation'
    when jsonb_array_length(blockers) > 0 then 'not_ready'
    else 'ready' end;

  if quote_row.id is not null then
    select * into session_row from public.checkout_sessions where booking_id = target_booking_id and quote_id = quote_row.id order by created_at desc limit 1;
  end if;
  return jsonb_build_object(
    'policy_version', 'phase9-checkout-readiness-v1', 'readiness_state', readiness, 'blockers', blockers,
    'quote', case when quote_row.id is null then null else jsonb_build_object('quote_version', quote_row.quote_version, 'quote_status', case when quote_row.quote_status = 'valid' and quote_row.quote_expires_at <= now() then 'expired' else quote_row.quote_status end, 'price_status', quote_row.price_status, 'quoted_at', quote_row.quoted_at, 'quote_expires_at', quote_row.quote_expires_at) end,
    'amounts', jsonb_build_object('currency', 'VND', 'booking_total_vnd', quote_row.booking_total_vnd, 'deposit_due_vnd', (deposit->>'amount_due_vnd')::bigint, 'planned_remaining_balance_vnd', (deposit->>'remaining_balance_vnd')::bigint),
    'deposit_policy', case when policy_row.id is null then null else jsonb_build_object('policy_version', policy_row.policy_version, 'policy_type', policy_row.policy_type, 'fixed_amount_vnd', policy_row.fixed_amount_vnd, 'percentage_bps', policy_row.percentage_bps, 'free_cancel_until', policy_row.free_cancel_until, 'non_refundable_after', policy_row.non_refundable_after, 'manual_policy', policy_row.manual_policy, 'cancellation_terms', policy_row.cancellation_terms) end,
    'checkout_session', case when session_row.id is null then null else jsonb_build_object('checkout_session_id', session_row.id, 'quote_version', session_row.quote_version, 'status', case when session_row.status in ('draft','ready') and session_row.expires_at <= now() then 'expired' else session_row.status end, 'amount_due_vnd', session_row.amount_due_vnd, 'expires_at', session_row.expires_at, 'provider_state', 'unconfigured') end,
    'provider_state', 'unconfigured'
  );
end;
$$;

create or replace function public.phase9_sync_checkout_state(target_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare booking_row record; quote_row record; readiness jsonb; changed integer; actor text;
begin
  select * into booking_row from public.bookings where id = target_booking_id;
  if not found then return; end if;
  actor := public.phase9_actor_type();
  select * into quote_row from public.booking_quotes where booking_id = target_booking_id and is_current for update;
  if quote_row.id is not null and quote_row.quote_status = 'valid' and quote_row.quote_expires_at <= now() then
    update public.booking_quotes set quote_status = 'expired', expired_at = now() where id = quote_row.id;
    insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
    values (target_booking_id, 'quote_expired', 'Báo giá đã hết hiệu lực.', jsonb_build_object('quote_version', quote_row.quote_version), 'system', auth.uid());
  end if;
  update public.checkout_sessions set status = 'expired', invalidated_at = now(), invalidation_reason = 'session_or_quote_expired', updated_at = now(), updated_by = auth.uid()
  where booking_id = target_booking_id and status in ('draft','ready') and (expires_at <= now() or quote_id in (select id from public.booking_quotes where booking_id = target_booking_id and quote_status in ('expired','superseded')));
  get diagnostics changed = row_count;
  if changed > 0 then
    insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
    values (target_booking_id, 'checkout_session_expired', 'Phiên chuẩn bị thanh toán đã hết hiệu lực.', jsonb_build_object('count', changed), 'system', auth.uid());
  end if;
  if booking_row.lifecycle_status in ('cancelled','completed','expired') then
    update public.checkout_sessions set status = 'cancelled', invalidated_at = now(), invalidation_reason = 'booking_terminal', updated_at = now(), updated_by = auth.uid()
    where booking_id = target_booking_id and status in ('draft','ready');
    get diagnostics changed = row_count;
    if changed > 0 then
      insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
      values (target_booking_id, 'checkout_session_cancelled', 'Phiên chuẩn bị thanh toán đã được hủy theo trạng thái chuyến đi.', jsonb_build_object('count', changed, 'lifecycle_status', booking_row.lifecycle_status), actor, auth.uid());
    end if;
    return;
  end if;
  readiness := public.phase9_resolve_checkout_readiness(target_booking_id);
  if readiness->>'readiness_state' = 'ready' then
    update public.checkout_sessions set status = 'ready', readiness_snapshot = readiness, updated_at = now(), updated_by = auth.uid()
    where booking_id = target_booking_id and status = 'draft' and expires_at > now() and quote_version = (readiness#>>'{quote,quote_version}')::integer;
    get diagnostics changed = row_count;
    if changed > 0 then
      insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
      values (target_booking_id, 'checkout_became_ready', 'Chuyến đi đã đủ điều kiện cho bước thanh toán.', jsonb_build_object('quote_version', (readiness#>>'{quote,quote_version}')::integer), actor, auth.uid());
    end if;
  else
    update public.checkout_sessions set status = 'cancelled', invalidated_at = now(), invalidation_reason = 'readiness_regressed', readiness_snapshot = readiness, updated_at = now(), updated_by = auth.uid()
    where booking_id = target_booking_id and status = 'ready';
    get diagnostics changed = row_count;
    if changed > 0 then
      insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
      values (target_booking_id, 'checkout_blocked', 'Chuyến đi chưa đủ điều kiện cho bước thanh toán.', jsonb_build_object('blockers', readiness->'blockers'), actor, auth.uid());
    end if;
  end if;
end;
$$;

create or replace function public.requote_booking(target_booking_id uuid, target_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.is_staff_or_admin() then raise exception 'Requote requires staff'; end if;
  result := public.phase9_create_quote_version(target_booking_id, target_reason, public.phase9_actor_type());
  perform public.phase9_sync_checkout_state(target_booking_id);
  return result;
end;
$$;

create or replace function public.set_booking_deposit_policy(
  target_booking_id uuid, target_policy_type text, target_fixed_amount_vnd bigint default null,
  target_percentage_bps integer default null, target_free_cancel_until timestamptz default null,
  target_non_refundable_after timestamptz default null, target_manual_policy text default null,
  target_cancellation_terms text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare next_version integer; saved_id uuid; actor text; invalidated integer;
begin
  if not public.is_admin() then raise exception 'Deposit policy requires admin'; end if;
  if target_policy_type not in ('none','fixed_amount','percentage','full_payment','manual') then raise exception 'Invalid deposit policy'; end if;
  if target_manual_policy is not null and char_length(target_manual_policy) > 5000 then raise exception 'Manual policy is too long'; end if;
  if target_cancellation_terms is not null and char_length(target_cancellation_terms) > 10000 then raise exception 'Cancellation terms are too long'; end if;
  perform 1 from public.bookings where id = target_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  select coalesce(max(policy_version), 0) + 1 into next_version from public.booking_deposit_policies where booking_id = target_booking_id;
  update public.booking_deposit_policies set status = 'superseded', is_current = false, superseded_at = now() where booking_id = target_booking_id and is_current;
  insert into public.booking_deposit_policies (booking_id, policy_version, policy_type, fixed_amount_vnd, percentage_bps, free_cancel_until, non_refundable_after, manual_policy, cancellation_terms, created_by)
  values (target_booking_id, next_version, target_policy_type, target_fixed_amount_vnd, target_percentage_bps, target_free_cancel_until, target_non_refundable_after, nullif(btrim(target_manual_policy),''), nullif(btrim(target_cancellation_terms),''), auth.uid()) returning id into saved_id;
  update public.checkout_sessions set status = 'cancelled', invalidated_at = now(), invalidation_reason = 'deposit_policy_changed', updated_at = now(), updated_by = auth.uid()
  where booking_id = target_booking_id and status in ('draft','ready');
  get diagnostics invalidated = row_count;
  actor := public.phase9_actor_type();
  insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
  values (target_booking_id, 'deposit_policy_set', 'Thông tin thanh toán trước đã được cập nhật.', jsonb_build_object('policy_version', next_version, 'policy_type', target_policy_type, 'invalidated_sessions', invalidated), actor, auth.uid());
  perform public.phase9_sync_checkout_state(target_booking_id);
  return saved_id;
end;
$$;

create or replace function public.create_checkout_draft(target_booking_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare booking_row record; quote_row record; policy_row record; readiness jsonb; deposit jsonb; existing_id uuid; saved_id uuid; initial_status text; actor text;
begin
  if not public.is_staff_or_admin() then raise exception 'Checkout draft requires staff'; end if;
  perform public.phase9_sync_checkout_state(target_booking_id);
  select * into booking_row from public.bookings where id = target_booking_id for update;
  select * into quote_row from public.booking_quotes where booking_id = target_booking_id and is_current for update;
  select * into policy_row from public.booking_deposit_policies where booking_id = target_booking_id and is_current;
  if booking_row.lifecycle_status <> 'active' then raise exception 'Booking lifecycle does not permit checkout'; end if;
  if booking_row.confirmation_status in ('failed','cancelled') then raise exception 'Supplier confirmation blocks checkout'; end if;
  if quote_row.id is null or quote_row.quote_status <> 'valid' or quote_row.quote_expires_at <= now() or quote_row.price_status <> 'authoritative' or quote_row.booking_total_vnd is null then raise exception 'A current authoritative quote is required'; end if;
  if policy_row.id is null then raise exception 'Deposit policy is required'; end if;
  deposit := public.phase9_calculate_deposit(policy_row.policy_type, quote_row.booking_total_vnd, policy_row.fixed_amount_vnd, policy_row.percentage_bps);
  if not coalesce((deposit->>'valid')::boolean, false) then raise exception 'Deposit policy blocks checkout'; end if;
  if policy_row.free_cancel_until is not null and policy_row.non_refundable_after is not null and policy_row.free_cancel_until > policy_row.non_refundable_after then raise exception 'Cancellation policy is conflicting'; end if;
  select id into existing_id from public.checkout_sessions where booking_id = target_booking_id and quote_version = quote_row.quote_version and status in ('draft','ready');
  if found then return existing_id; end if;
  readiness := public.phase9_resolve_checkout_readiness(target_booking_id);
  initial_status := case when readiness->>'readiness_state' = 'ready' then 'ready' else 'draft' end;
  insert into public.checkout_sessions (
    booking_id, quote_id, quote_version, deposit_policy_id, deposit_policy_version, status,
    booking_total_vnd, amount_due_vnd, planned_remaining_balance_vnd, deposit_policy_snapshot,
    readiness_snapshot, expires_at, created_by, updated_by
  ) values (
    target_booking_id, quote_row.id, quote_row.quote_version, policy_row.id, policy_row.policy_version, initial_status,
    quote_row.booking_total_vnd, (deposit->>'amount_due_vnd')::bigint, (deposit->>'remaining_balance_vnd')::bigint,
    jsonb_build_object('policy_version', policy_row.policy_version, 'policy_type', policy_row.policy_type, 'fixed_amount_vnd', policy_row.fixed_amount_vnd, 'percentage_bps', policy_row.percentage_bps, 'free_cancel_until', policy_row.free_cancel_until, 'non_refundable_after', policy_row.non_refundable_after, 'manual_policy', policy_row.manual_policy, 'cancellation_terms', policy_row.cancellation_terms),
    readiness, quote_row.quote_expires_at, auth.uid(), auth.uid()
  ) returning id into saved_id;
  actor := public.phase9_actor_type();
  insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
  values (target_booking_id, 'checkout_session_created', case when initial_status = 'ready' then 'Chuyến đi đã sẵn sàng cho bước thanh toán.' else 'Đã chuẩn bị phiên thanh toán; vẫn cần hoàn tất các điều kiện còn lại.' end, jsonb_build_object('checkout_session_id', saved_id, 'quote_version', quote_row.quote_version, 'status', initial_status), actor, auth.uid());
  if initial_status = 'ready' then
    insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
    values (target_booking_id, 'checkout_became_ready', 'Chuyến đi đã đủ điều kiện cho bước thanh toán.', jsonb_build_object('checkout_session_id', saved_id, 'quote_version', quote_row.quote_version), actor, auth.uid());
  end if;
  return saved_id;
end;
$$;

create or replace function public.cancel_checkout_draft(target_checkout_session_id uuid, target_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare session_row record; actor text;
begin
  if not public.is_staff_or_admin() then raise exception 'Checkout cancellation requires staff'; end if;
  select * into session_row from public.checkout_sessions where id = target_checkout_session_id for update;
  if not found then raise exception 'Checkout session not found'; end if;
  if session_row.status not in ('draft','ready') then raise exception 'Checkout session is not active'; end if;
  update public.checkout_sessions set status = 'cancelled', invalidated_at = now(), invalidation_reason = coalesce(nullif(btrim(target_reason),''),'cancelled_by_staff'), updated_at = now(), updated_by = auth.uid() where id = target_checkout_session_id;
  actor := public.phase9_actor_type();
  insert into public.booking_events (booking_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
  values (session_row.booking_id, 'checkout_session_cancelled', 'Phiên chuẩn bị thanh toán đã được hủy.', jsonb_build_object('checkout_session_id', target_checkout_session_id, 'reason', nullif(btrim(target_reason),'')), actor, auth.uid());
end;
$$;

create or replace function public.get_admin_checkout_readiness(target_booking_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff_or_admin() then raise exception 'Checkout readiness requires staff'; end if;
  perform public.phase9_sync_checkout_state(target_booking_id);
  return public.phase9_resolve_checkout_readiness(target_booking_id);
end;
$$;

create or replace function public.phase9_initial_quote_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.booking_quotes where booking_id = new.id)
    and exists (select 1 from public.booking_items where booking_id = new.id) then
    perform public.phase9_create_quote_version(new.id, 'Báo giá tại thời điểm gửi yêu cầu', 'customer');
  end if;
  return new;
end;
$$;

create trigger phase9_create_initial_quote
after update of quoted_sell_total_vnd, price_status on public.bookings
for each row execute function public.phase9_initial_quote_trigger();

create or replace function public.phase9_booking_state_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin perform public.phase9_sync_checkout_state(new.id); return new; end;
$$;
create trigger phase9_sync_after_booking_state
after update of lifecycle_status, confirmation_status on public.bookings
for each row when (old.lifecycle_status is distinct from new.lifecycle_status or old.confirmation_status is distinct from new.confirmation_status)
execute function public.phase9_booking_state_trigger();

create or replace function public.guard_phase9_quote_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.finalized_at is not null and row(new.booking_id,new.quote_version,new.price_status,new.currency,new.booking_total_vnd,new.quoted_at,new.quote_expires_at,new.reason,new.quote_snapshot,new.created_at,new.created_by,new.finalized_at)
    is distinct from row(old.booking_id,old.quote_version,old.price_status,old.currency,old.booking_total_vnd,old.quoted_at,old.quote_expires_at,old.reason,old.quote_snapshot,old.created_at,old.created_by,old.finalized_at) then
    raise exception 'Quote financial snapshot is immutable';
  end if;
  return new;
end;
$$;
create trigger booking_quotes_immutable_snapshot before update on public.booking_quotes for each row execute function public.guard_phase9_quote_update();

create or replace function public.guard_phase9_deposit_policy_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if row(new.booking_id,new.policy_version,new.policy_type,new.fixed_amount_vnd,new.percentage_bps,new.free_cancel_until,new.non_refundable_after,new.manual_policy,new.cancellation_terms,new.created_at,new.created_by)
    is distinct from row(old.booking_id,old.policy_version,old.policy_type,old.fixed_amount_vnd,old.percentage_bps,old.free_cancel_until,old.non_refundable_after,old.manual_policy,old.cancellation_terms,old.created_at,old.created_by) then
    raise exception 'Deposit policy financial snapshot is immutable';
  end if;
  return new;
end;
$$;
create trigger booking_deposit_policies_immutable_snapshot before update on public.booking_deposit_policies for each row execute function public.guard_phase9_deposit_policy_update();

create or replace function public.guard_phase9_checkout_session_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if row(new.booking_id,new.quote_id,new.quote_version,new.deposit_policy_id,new.deposit_policy_version,new.booking_total_vnd,new.amount_due_vnd,new.planned_remaining_balance_vnd,new.currency,new.deposit_policy_snapshot,new.readiness_policy_version,new.provider_state,new.provider_key,new.provider_reference,new.expires_at,new.created_at,new.created_by)
    is distinct from row(old.booking_id,old.quote_id,old.quote_version,old.deposit_policy_id,old.deposit_policy_version,old.booking_total_vnd,old.amount_due_vnd,old.planned_remaining_balance_vnd,old.currency,old.deposit_policy_snapshot,old.readiness_policy_version,old.provider_state,old.provider_key,old.provider_reference,old.expires_at,old.created_at,old.created_by) then
    raise exception 'Checkout session financial binding is immutable';
  end if;
  return new;
end;
$$;
create trigger checkout_sessions_immutable_binding before update on public.checkout_sessions for each row execute function public.guard_phase9_checkout_session_update();

create or replace function public.reject_phase9_history_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$ begin raise exception 'Phase 9 history is append-only'; end; $$;
create trigger booking_quote_items_append_only before update or delete on public.booking_quote_items for each row execute function public.reject_phase9_history_mutation();
create trigger booking_deposit_policies_no_delete before delete on public.booking_deposit_policies for each row execute function public.reject_phase9_history_mutation();
create trigger booking_quotes_no_delete before delete on public.booking_quotes for each row execute function public.reject_phase9_history_mutation();
create trigger checkout_sessions_no_delete before delete on public.checkout_sessions for each row execute function public.reject_phase9_history_mutation();

create or replace function public.get_public_booking_status(target_booking_code text, target_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare booking_uuid uuid; result jsonb;
begin
  select id into booking_uuid from public.bookings where booking_code = upper(btrim(target_booking_code)) and public_access_token_hash = target_token_hash;
  if not found then return null; end if;
  perform public.phase9_sync_checkout_state(booking_uuid);
  select jsonb_build_object(
    'booking_code', b.booking_code, 'lifecycle_status', b.lifecycle_status, 'confirmation_status', b.confirmation_status,
    'check_in', b.check_in, 'check_out', b.check_out, 'adults', b.adults, 'children', b.children, 'rooms', b.rooms,
    'currency', b.currency, 'quoted_sell_total_vnd', b.quoted_sell_total_vnd, 'price_status', b.price_status, 'quoted_at', b.quoted_at, 'submitted_at', b.submitted_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('item_key',i.item_key,'component_type',i.component_type,'display_name',i.display_name_snapshot,'description',i.description_snapshot,'parent_name',i.parent_name_snapshot,'quantity',i.quantity,'is_required',i.is_required,'counts_toward_booking_total',i.counts_toward_booking_total,'sell_price_vnd',i.sell_price_vnd,'price_status',i.price_status,'availability_status',i.availability_status,'confirmation_status',i.confirmation_status,'confirmation_mode',i.confirmation_mode_snapshot,'quoted_at',i.quoted_at) order by i.created_at,i.item_key) from public.booking_items i where i.booking_id=b.id),'[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('event_type',e.event_type,'message',e.public_message,'created_at',e.created_at) order by e.created_at,e.id) from public.booking_events e where e.booking_id=b.id and e.public_message is not null),'[]'::jsonb),
    'checkout', public.phase9_resolve_checkout_readiness(b.id)
  ) into result from public.bookings b where b.id = booking_uuid;
  return result;
end;
$$;

alter table public.booking_quotes enable row level security;
alter table public.booking_quote_items enable row level security;
alter table public.booking_deposit_policies enable row level security;
alter table public.checkout_sessions enable row level security;

revoke all on table public.booking_quotes, public.booking_quote_items, public.booking_deposit_policies, public.checkout_sessions from public, anon, authenticated;
grant select on table public.booking_quotes, public.booking_quote_items, public.booking_deposit_policies, public.checkout_sessions to authenticated;
create policy "staff reads booking quotes" on public.booking_quotes for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads booking quote items" on public.booking_quote_items for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads booking deposit policies" on public.booking_deposit_policies for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads checkout sessions" on public.checkout_sessions for select to authenticated using ((select public.is_staff_or_admin()));

revoke all on function public.phase9_actor_type() from public, anon, authenticated;
revoke all on function public.phase9_calculate_deposit(text,bigint,bigint,integer) from public, anon, authenticated;
revoke all on function public.phase9_assess_room_price(jsonb) from public, anon, authenticated;
revoke all on function public.phase9_create_quote_version(uuid,text,text) from public, anon, authenticated;
revoke all on function public.phase9_resolve_checkout_readiness(uuid) from public, anon, authenticated;
revoke all on function public.phase9_sync_checkout_state(uuid) from public, anon, authenticated;
revoke all on function public.requote_booking(uuid,text) from public, anon, authenticated;
revoke all on function public.set_booking_deposit_policy(uuid,text,bigint,integer,timestamptz,timestamptz,text,text) from public, anon, authenticated;
revoke all on function public.create_checkout_draft(uuid) from public, anon, authenticated;
revoke all on function public.cancel_checkout_draft(uuid,text) from public, anon, authenticated;
revoke all on function public.get_admin_checkout_readiness(uuid) from public, anon, authenticated;
revoke all on function public.phase9_initial_quote_trigger() from public, anon, authenticated;
revoke all on function public.phase9_booking_state_trigger() from public, anon, authenticated;
revoke all on function public.guard_phase9_quote_update() from public, anon, authenticated;
revoke all on function public.guard_phase9_deposit_policy_update() from public, anon, authenticated;
revoke all on function public.guard_phase9_checkout_session_update() from public, anon, authenticated;
revoke all on function public.reject_phase9_history_mutation() from public, anon, authenticated;
grant execute on function public.requote_booking(uuid,text) to authenticated;
grant execute on function public.set_booking_deposit_policy(uuid,text,bigint,integer,timestamptz,timestamptz,text,text) to authenticated;
grant execute on function public.create_checkout_draft(uuid) to authenticated;
grant execute on function public.cancel_checkout_draft(uuid,text) to authenticated;
grant execute on function public.get_admin_checkout_readiness(uuid) to authenticated;

-- Re-run grants for the replaced Phase 8 safe-status RPC only. It still
-- authenticates by Booking code plus opaque-token hash and returns no PII.
revoke all on function public.get_public_booking_status(text,text) from public;
grant execute on function public.get_public_booking_status(text,text) to anon, authenticated;

do $$
declare booking_row record;
begin
  for booking_row in select id from public.bookings loop
    if not exists (select 1 from public.booking_quotes where booking_id = booking_row.id) then
      perform public.phase9_create_quote_version(booking_row.id, 'Báo giá chuyển tiếp từ snapshot Phase 8', 'system');
    end if;
  end loop;
end;
$$;

comment on table public.booking_quotes is 'Immutable versioned quote history. Lifecycle status may expire/supersede; historical financial facts never mutate.';
comment on table public.booking_deposit_policies is 'Provider-neutral, versioned deposit and cancellation-policy metadata. No payment state.';
comment on table public.checkout_sessions is 'Provider-neutral checkout preparation bound to one quote and policy version. Provider remains unconfigured; no paid state.';
comment on function public.phase9_resolve_checkout_readiness(uuid) is 'Deterministic phase9-checkout-readiness-v1 policy. Booking, confirmation, quote and checkout readiness remain separate.';
comment on function public.requote_booking(uuid,text) is 'Staff-only atomic requote that re-resolves authoritative sources, preserves history and invalidates stale sessions.';
