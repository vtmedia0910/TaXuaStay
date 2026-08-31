-- Tà Xùa Trip V2 Phase 8: Unified Booking + Supplier Confirmation.
-- One traveler request becomes one Booking with many immutable Booking Items.
-- Booking lifecycle and supplier-confirmation lifecycle remain separate.
-- This migration adds no payment, deposit, checkout, refund, settlement or hold.

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  destination_id uuid not null references public.destinations(id) on delete restrict,
  lifecycle_status text not null default 'submitted',
  confirmation_status text not null default 'pending',
  channel text not null default 'public_web',
  check_in date not null,
  check_out date not null,
  adults integer not null,
  children integer not null default 0,
  rooms integer not null default 1,
  currency text not null default 'VND',
  quoted_sell_total_vnd bigint,
  price_status text not null,
  quoted_at timestamptz not null default now(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_zalo text,
  customer_note text,
  internal_note text,
  public_access_token_hash text not null,
  idempotency_key_hash text not null unique,
  request_fingerprint text not null,
  quote_policy_version text not null default 'phase8-booking-v1',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint bookings_code_format check (booking_code ~ '^TX-[0-9]{8}-[A-Z0-9]{6}$'),
  constraint bookings_lifecycle_allowed check (lifecycle_status in ('submitted', 'active', 'cancelled', 'completed', 'expired')),
  constraint bookings_confirmation_allowed check (confirmation_status in ('pending', 'partial', 'confirmed', 'failed', 'cancelled')),
  constraint bookings_channel_allowed check (channel in ('public_web', 'admin')),
  constraint bookings_dates_valid check (check_out > check_in and check_out <= check_in + 31),
  constraint bookings_party_valid check (adults between 1 and 100 and children between 0 and 100 and rooms between 1 and 100),
  constraint bookings_currency_vnd check (currency = 'VND'),
  constraint bookings_total_nonnegative check (quoted_sell_total_vnd is null or quoted_sell_total_vnd between 0 and 200000000000),
  constraint bookings_price_status_allowed check (price_status in ('quoted', 'partial', 'unknown', 'conflict')),
  constraint bookings_name_length check (char_length(btrim(customer_name)) between 2 and 160),
  constraint bookings_phone_length check (char_length(btrim(customer_phone)) between 6 and 30),
  constraint bookings_email_format check (customer_email is null or (char_length(customer_email) <= 254 and customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  constraint bookings_zalo_length check (customer_zalo is null or char_length(customer_zalo) between 3 and 160),
  constraint bookings_customer_note_length check (customer_note is null or char_length(customer_note) <= 3000),
  constraint bookings_internal_note_length check (internal_note is null or char_length(internal_note) <= 10000),
  constraint bookings_hashes_hex check (public_access_token_hash ~ '^[a-f0-9]{64}$' and idempotency_key_hash ~ '^[a-f0-9]{64}$' and request_fingerprint ~ '^[a-f0-9]{64}$')
);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  parent_booking_item_id uuid references public.booking_items(id) on delete restrict,
  item_key text not null,
  component_type text not null,
  source_room_type_id uuid references public.room_types(id) on delete restrict,
  source_motorbike_offering_id uuid references public.motorbike_offerings(id) on delete restrict,
  source_package_id uuid references public.packages(id) on delete restrict,
  source_package_component_id uuid references public.package_components(id) on delete restrict,
  source_custom_code text,
  service_from date not null,
  service_until date not null,
  quantity integer not null,
  is_required boolean not null default true,
  counts_toward_booking_total boolean not null default true,
  display_name_snapshot text not null,
  description_snapshot text,
  parent_name_snapshot text,
  confirmation_mode_snapshot text not null,
  sell_price_vnd bigint,
  net_cost_vnd bigint,
  price_status text not null,
  availability_status text not null,
  confirmation_status text not null default 'pending',
  source_snapshot jsonb not null,
  price_snapshot jsonb not null,
  availability_snapshot jsonb not null,
  verification_snapshot jsonb not null,
  confirmation_context_snapshot jsonb not null,
  policy_snapshot jsonb not null,
  quoted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint booking_items_key_unique unique (booking_id, item_key),
  constraint booking_items_key_format check (item_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(item_key) between 2 and 120),
  constraint booking_items_component_allowed check (component_type in ('ROOM', 'MOTORBIKE', 'PACKAGE', 'CUSTOM')),
  constraint booking_items_dates_valid check (service_until > service_from and service_until <= service_from + 31),
  constraint booking_items_quantity_valid check (quantity between 1 and 100),
  constraint booking_items_name_length check (char_length(btrim(display_name_snapshot)) between 2 and 200),
  constraint booking_items_description_length check (description_snapshot is null or char_length(description_snapshot) <= 5000),
  constraint booking_items_parent_name_length check (parent_name_snapshot is null or char_length(parent_name_snapshot) <= 200),
  constraint booking_items_confirmation_mode_allowed check (confirmation_mode_snapshot in ('supplier_manual', 'operator_manual', 'internal_manual', 'not_required')),
  constraint booking_items_sell_nonnegative check (sell_price_vnd is null or sell_price_vnd between 0 and 200000000000),
  constraint booking_items_cost_nonnegative check (net_cost_vnd is null or net_cost_vnd between 0 and 200000000000),
  constraint booking_items_price_status_allowed check (price_status in ('quoted', 'included_in_package', 'unknown', 'conflict')),
  constraint booking_items_availability_allowed check (availability_status in ('recorded_available', 'needs_confirmation', 'unknown', 'unavailable')),
  constraint booking_items_confirmation_allowed check (confirmation_status in ('pending', 'requested', 'partial', 'confirmed', 'declined', 'expired', 'cancelled', 'not_required')),
  constraint booking_items_source_shape check (
    (component_type = 'ROOM' and source_room_type_id is not null and source_motorbike_offering_id is null and source_package_id is null and source_custom_code is null)
    or (component_type = 'MOTORBIKE' and source_motorbike_offering_id is not null and source_room_type_id is null and source_package_id is null and source_custom_code is null)
    or (component_type = 'PACKAGE' and source_package_id is not null and source_room_type_id is null and source_motorbike_offering_id is null and source_custom_code is null)
    or (component_type = 'CUSTOM' and source_custom_code is not null and source_room_type_id is null and source_motorbike_offering_id is null)
  ),
  constraint booking_items_package_child_shape check ((parent_booking_item_id is null and source_package_component_id is null) or (parent_booking_item_id is not null and source_package_component_id is not null)),
  constraint booking_items_json_objects check (jsonb_typeof(source_snapshot) = 'object' and jsonb_typeof(price_snapshot) = 'object' and jsonb_typeof(availability_snapshot) = 'object' and jsonb_typeof(verification_snapshot) = 'object' and jsonb_typeof(confirmation_context_snapshot) = 'object' and jsonb_typeof(policy_snapshot) = 'object')
);

create table public.booking_item_confirmations (
  id uuid primary key default gen_random_uuid(),
  booking_item_id uuid not null unique references public.booking_items(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete restrict,
  supplier_contact_id uuid references public.supplier_contacts(id) on delete restrict,
  status text not null default 'pending',
  confirmation_mode text not null,
  requested_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,
  external_reference text,
  response_note_internal text,
  supplier_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint booking_confirmations_status_allowed check (status in ('pending', 'requested', 'confirmed', 'declined', 'expired', 'cancelled')),
  constraint booking_confirmations_mode_allowed check (confirmation_mode in ('supplier_manual', 'operator_manual', 'internal_manual')),
  constraint booking_confirmations_dates_valid check (expires_at is null or expires_at > coalesce(responded_at, requested_at, created_at)),
  constraint booking_confirmations_external_ref_length check (external_reference is null or char_length(external_reference) <= 500),
  constraint booking_confirmations_note_length check (response_note_internal is null or char_length(response_note_internal) <= 5000),
  constraint booking_confirmations_snapshot_object check (jsonb_typeof(supplier_snapshot) = 'object')
);

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  booking_item_id uuid references public.booking_items(id) on delete restrict,
  event_type text not null,
  public_message text,
  internal_detail jsonb not null default '{}'::jsonb,
  actor_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint booking_events_type_format check (event_type ~ '^[a-z0-9_]{2,80}$'),
  constraint booking_events_public_length check (public_message is null or char_length(public_message) <= 500),
  constraint booking_events_actor_allowed check (actor_type in ('customer', 'staff', 'admin', 'system')),
  constraint booking_events_detail_object check (jsonb_typeof(internal_detail) = 'object')
);

create index bookings_admin_index on public.bookings (submitted_at desc, lifecycle_status, confirmation_status);
create index bookings_status_code_index on public.bookings (booking_code, public_access_token_hash);
create index booking_items_booking_index on public.booking_items (booking_id, created_at, item_key);
create index booking_items_supplier_sources_index on public.booking_items (source_room_type_id, source_motorbike_offering_id, source_package_id);
create index booking_confirmations_supplier_index on public.booking_item_confirmations (supplier_id, status, updated_at desc);
create index booking_events_timeline_index on public.booking_events (booking_id, created_at, id);

create or replace function public.phase8_room_cost_snapshot(target_room_id uuid, target_check_in date, target_check_out date, target_quantity integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare night date; winning record; tie_count integer; total bigint:=0; complete boolean:=true; conflict boolean:=false; freshness text; required_through date; lines jsonb:='[]'::jsonb;
begin
  for night in select day::date from generate_series(target_check_in,target_check_out-1,interval '1 day') day loop
    select rule.*,plan.priority as plan_priority,
      case rule.rate_type when 'override' then 5 when 'holiday' then 4 when 'peak' then 3 when 'weekend' then 2 else 1 end as type_priority
    into winning from public.room_commercial_rules rule
    join public.commercial_rate_plans plan on plan.id=rule.commercial_rate_plan_id
    join public.suppliers supplier on supplier.id=rule.supplier_id
    where rule.room_type_id=target_room_id and rule.is_active and rule.net_cost_vnd is not null
      and plan.status='active' and supplier.status='active'
      and (plan.valid_from is null or plan.valid_from<=night) and (plan.valid_until is null or plan.valid_until>=night)
      and (rule.effective_from is null or rule.effective_from<=night) and (rule.effective_until is null or rule.effective_until>=night)
      and (rule.iso_weekdays is null or extract(isodow from night)::smallint=any(rule.iso_weekdays))
      and (rule.iso_weekdays is not null or rule.rate_type not in('weekday','weekend') or (rule.rate_type='weekday' and extract(isodow from night) between 1 and 4) or (rule.rate_type='weekend' and extract(isodow from night) between 5 and 7))
      and exists(select 1 from public.supplier_properties link where link.supplier_id=rule.supplier_id and link.property_id=rule.property_id and (link.valid_from is null or link.valid_from<=night) and (link.valid_until is null or link.valid_until>=night))
    order by type_priority desc,rule.priority desc,plan.priority desc limit 1;
    if not found then complete:=false; lines:=lines||jsonb_build_array(jsonb_build_object('date',night,'state','missing','net_cost_vnd',null));
    else
      select count(*) into tie_count from public.room_commercial_rules rule join public.commercial_rate_plans plan on plan.id=rule.commercial_rate_plan_id join public.suppliers supplier on supplier.id=rule.supplier_id
      where rule.room_type_id=target_room_id and rule.is_active and rule.net_cost_vnd is not null and plan.status='active' and supplier.status='active'
        and (plan.valid_from is null or plan.valid_from<=night) and (plan.valid_until is null or plan.valid_until>=night) and (rule.effective_from is null or rule.effective_from<=night) and (rule.effective_until is null or rule.effective_until>=night)
        and (rule.iso_weekdays is null or extract(isodow from night)::smallint=any(rule.iso_weekdays))
        and (rule.iso_weekdays is not null or rule.rate_type not in('weekday','weekend') or (rule.rate_type='weekday' and extract(isodow from night) between 1 and 4) or (rule.rate_type='weekend' and extract(isodow from night) between 5 and 7))
        and exists(select 1 from public.supplier_properties link where link.supplier_id=rule.supplier_id and link.property_id=rule.property_id and (link.valid_from is null or link.valid_from<=night) and (link.valid_until is null or link.valid_until>=night))
        and (case rule.rate_type when 'override' then 5 when 'holiday' then 4 when 'peak' then 3 when 'weekend' then 2 else 1 end)=winning.type_priority and rule.priority=winning.priority and plan.priority=winning.plan_priority;
      if tie_count>1 then complete:=false; conflict:=true; lines:=lines||jsonb_build_array(jsonb_build_object('date',night,'state','conflict','net_cost_vnd',null));
      else
        required_through:=greatest(night,(now() at time zone 'Asia/Ho_Chi_Minh')::date);
        freshness:=case
          when winning.verified_at is null or winning.verified_at>now() then 'unknown'
          when winning.source in ('partner','admin','contract') and winning.valid_until is not null and winning.valid_until>=required_through then 'verified'
          when winning.source in ('partner','admin','contract','import') and now()-winning.verified_at<=interval '30 days' then 'recent'
          else 'reference' end;
        if freshness in ('verified','recent') then total:=total+winning.net_cost_vnd; else complete:=false; end if;
        lines:=lines||jsonb_build_array(jsonb_build_object('date',night,'state',case when freshness in ('verified','recent') then 'resolved' else 'stale' end,'net_cost_vnd',winning.net_cost_vnd,'source',winning.source,'freshness',freshness,'verified_at',winning.verified_at,'valid_until',winning.valid_until,'supplier_id',winning.supplier_id));
      end if;
    end if;
  end loop;
  return jsonb_build_object('status',case when conflict then 'conflict' when complete then 'resolved' else 'unknown' end,'total_vnd',case when complete then total*target_quantity else null end,'currency','VND','nightly_lines',lines,'policy_version','phase4-economics-v1');
end; $$;

create or replace function public.phase8_room_snapshot(target_room_id uuid, target_check_in date, target_check_out date, target_rooms integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  room_row record;
  night date;
  winning record;
  tie_count integer;
  price_total bigint := 0;
  price_complete boolean := true;
  price_conflict boolean := false;
  price_lines jsonb := '[]'::jsonb;
  inventory_row record;
  availability_state text := 'recorded_available';
  availability_lines jsonb := '[]'::jsonb;
  night_state text;
  verification jsonb;
  supplier_context jsonb;
begin
  if target_check_out <= target_check_in or target_check_out > target_check_in + 31 then
    raise exception 'Invalid service dates';
  end if;
  select room.id, room.name, room.slug, room.short_description, room.property_id, property.name as property_name,
    property.slug as property_slug, property.destination_id
  into room_row
  from public.room_types room join public.properties property on property.id = room.property_id
  where room.id = target_room_id and public.is_room_public(room.id);
  if not found then raise exception 'Room source is not publicly requestable'; end if;

  for night in select day::date from generate_series(target_check_in, target_check_out - 1, interval '1 day') day loop
    select rule.id, plan.id as plan_id, rule.price_vnd, rule.source, rule.price_verified_at,
      rule.price_valid_until, rule.priority as rule_priority, plan.priority as plan_priority,
      case rule.rate_type when 'override' then 5 when 'holiday' then 4 when 'peak' then 3 when 'weekend' then 2 else 1 end as type_priority
    into winning
    from public.room_rate_rules rule join public.rate_plans plan on plan.id = rule.rate_plan_id
    where rule.room_type_id = target_room_id and rule.is_active and plan.is_active
      and plan.publish_status = 'published'
      and (plan.valid_from is null or plan.valid_from <= night) and (plan.valid_until is null or plan.valid_until >= night)
      and (rule.valid_from is null or rule.valid_from <= night) and (rule.valid_until is null or rule.valid_until >= night)
      and (rule.days_of_week is null or extract(isodow from night)::smallint = any(rule.days_of_week))
      and (rule.days_of_week is not null or rule.rate_type not in ('weekday','weekend')
        or (rule.rate_type = 'weekday' and extract(isodow from night) between 1 and 4)
        or (rule.rate_type = 'weekend' and extract(isodow from night) between 5 and 7))
    order by type_priority desc, rule.priority desc, plan.priority desc
    limit 1;
    if not found then
      price_complete := false;
      price_lines := price_lines || jsonb_build_array(jsonb_build_object('date', night, 'state', 'missing', 'price_vnd', null));
    else
      select count(*) into tie_count
      from public.room_rate_rules rule join public.rate_plans plan on plan.id = rule.rate_plan_id
      where rule.room_type_id = target_room_id and rule.is_active and plan.is_active and plan.publish_status = 'published'
        and (plan.valid_from is null or plan.valid_from <= night) and (plan.valid_until is null or plan.valid_until >= night)
        and (rule.valid_from is null or rule.valid_from <= night) and (rule.valid_until is null or rule.valid_until >= night)
        and (rule.days_of_week is null or extract(isodow from night)::smallint = any(rule.days_of_week))
        and (rule.days_of_week is not null or rule.rate_type not in ('weekday','weekend')
          or (rule.rate_type = 'weekday' and extract(isodow from night) between 1 and 4)
          or (rule.rate_type = 'weekend' and extract(isodow from night) between 5 and 7))
        and (case rule.rate_type when 'override' then 5 when 'holiday' then 4 when 'peak' then 3 when 'weekend' then 2 else 1 end) = winning.type_priority
        and rule.priority = winning.rule_priority and plan.priority = winning.plan_priority;
      if tie_count > 1 then
        price_complete := false; price_conflict := true;
        price_lines := price_lines || jsonb_build_array(jsonb_build_object('date', night, 'state', 'conflict', 'price_vnd', null));
      else
        price_total := price_total + winning.price_vnd;
        price_lines := price_lines || jsonb_build_array(jsonb_build_object('date', night, 'state', 'resolved', 'price_vnd', winning.price_vnd, 'source', winning.source, 'verified_at', winning.price_verified_at, 'valid_until', winning.price_valid_until));
      end if;
    end if;

    select available_quantity, source, verified_at into inventory_row from public.room_inventory where room_type_id = target_room_id and date = night;
    if not found or inventory_row.verified_at > now() then night_state := 'unknown';
    elsif inventory_row.available_quantity < target_rooms then night_state := 'unavailable';
    elsif now() - inventory_row.verified_at < interval '6 hours' then night_state := 'recorded_available';
    elsif now() - inventory_row.verified_at <= interval '24 hours' then night_state := 'recorded_available';
    else night_state := 'needs_confirmation'; end if;
    if night_state = 'unavailable' then availability_state := 'unavailable';
    elsif availability_state <> 'unavailable' and night_state = 'unknown' then availability_state := 'unknown';
    elsif availability_state not in ('unavailable','unknown') and night_state = 'needs_confirmation' then availability_state := 'needs_confirmation'; end if;
    availability_lines := availability_lines || jsonb_build_array(jsonb_build_object('date', night, 'state', night_state, 'available_quantity', case when found then inventory_row.available_quantity else null end, 'source', case when found then inventory_row.source else null end, 'verified_at', case when found then inventory_row.verified_at else null end));
  end loop;

  select jsonb_build_object(
    'room_verified', exists(select 1 from public.verification_records v where v.room_type_id = target_room_id and v.verification_type = 'room' and public.is_verification_public(v.id)),
    'cloud_view', coalesce((select jsonb_build_object('score_10', c.score_10, 'view_from_bed', c.view_from_bed, 'verified_at', v.verified_at, 'expires_at', v.expires_at) from public.verification_records v join public.cloud_view_verifications c on c.verification_id = v.id where v.room_type_id = target_room_id and v.verification_type = 'cloud_view' and public.is_verification_public(v.id) order by v.verified_at desc limit 1), 'null'::jsonb),
    'road', coalesce((select jsonb_build_object('grade', r.grade, 'car_access', r.car_access, 'motorbike_access', r.motorbike_access, 'parking', r.parking, 'verified_at', v.verified_at, 'expires_at', v.expires_at) from public.verification_records v join public.road_verifications r on r.verification_id = v.id where v.property_id = room_row.property_id and v.verification_type = 'road_access' and public.is_verification_public(v.id) order by v.verified_at desc limit 1), 'null'::jsonb)
  ) into verification;

  select jsonb_build_object('supplier_id', supplier.id, 'supplier_name', supplier.display_name,
    'contact_id', contact.id, 'contact_name', contact.contact_name, 'contact_type', contact.contact_type,
    'phone', contact.phone, 'email', contact.email, 'zalo', contact.zalo, 'relationship_type', link.relationship_type)
  into supplier_context
  from public.supplier_properties link join public.suppliers supplier on supplier.id = link.supplier_id
  left join lateral (select c.* from public.supplier_contacts c where c.supplier_id = supplier.id and c.is_active order by c.is_primary desc, c.updated_at desc limit 1) contact on true
  where link.property_id = room_row.property_id and supplier.status = 'active'
    and (link.valid_from is null or link.valid_from <= target_check_in) and (link.valid_until is null or link.valid_until >= target_check_out - 1)
  order by link.is_primary desc, case link.relationship_type when 'reservation_partner' then 1 when 'owner' then 2 when 'operator' then 3 when 'manager' then 4 when 'commercial_partner' then 5 else 6 end, link.updated_at desc
  limit 1;

  return jsonb_build_object(
    'source', jsonb_build_object('room_type_id', room_row.id, 'room_name', room_row.name, 'room_slug', room_row.slug, 'description', room_row.short_description, 'property_id', room_row.property_id, 'property_name', room_row.property_name, 'property_slug', room_row.property_slug, 'destination_id', room_row.destination_id),
    'price', jsonb_build_object('status', case when price_conflict then 'conflict' when price_complete then 'quoted' else 'unknown' end, 'total_vnd', case when price_complete then price_total * target_rooms else null end, 'currency', 'VND', 'nightly_lines', price_lines, 'policy_version', 'phase5-v1'),
    'availability', jsonb_build_object('status', availability_state, 'requested_rooms', target_rooms, 'nightly_lines', availability_lines, 'policy_version', 'phase6-v1'),
    'cost', public.phase8_room_cost_snapshot(target_room_id,target_check_in,target_check_out,target_rooms),
    'verification', verification,
    'confirmation', coalesce(supplier_context, '{}'::jsonb)
  );
end;
$$;

create or replace function public.phase8_package_price_snapshot(target_package_id uuid, target_check_in date, target_check_out date, target_adults integer, target_children integer, target_rooms integer, target_optional_keys text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  winner record;
  tie_count integer;
  normalized_keys text[];
  specificity integer;
begin
  normalized_keys := coalesce((select array_agg(distinct lower(btrim(value)) order by lower(btrim(value))) from unnest(coalesce(target_optional_keys, '{}'::text[])) value where btrim(value) <> ''), '{}'::text[]);
  select rule.*, (num_nonnulls(rule.effective_from, rule.effective_until, rule.adults_min, rule.adults_max, rule.children_min, rule.children_max, rule.rooms_min, rule.rooms_max) + cardinality(rule.selected_optional_component_keys)) as specificity
  into winner from public.package_price_rules rule
  where rule.package_id = target_package_id and rule.is_active
    and (rule.effective_from is null or rule.effective_from <= target_check_in)
    and (rule.effective_until is null or rule.effective_until >= target_check_out - 1)
    and (rule.adults_min is null or target_adults >= rule.adults_min) and (rule.adults_max is null or target_adults <= rule.adults_max)
    and (rule.children_min is null or target_children >= rule.children_min) and (rule.children_max is null or target_children <= rule.children_max)
    and (rule.rooms_min is null or target_rooms >= rule.rooms_min) and (rule.rooms_max is null or target_rooms <= rule.rooms_max)
    and rule.selected_optional_component_keys = normalized_keys
  order by rule.priority desc, specificity desc limit 1;
  if not found then return jsonb_build_object('status','unknown','total_vnd',null,'currency','VND','policy_version','phase6-package-v1'); end if;
  specificity := winner.specificity;
  select count(*) into tie_count from public.package_price_rules rule
  where rule.package_id = target_package_id and rule.is_active and rule.priority = winner.priority
    and (num_nonnulls(rule.effective_from, rule.effective_until, rule.adults_min, rule.adults_max, rule.children_min, rule.children_max, rule.rooms_min, rule.rooms_max) + cardinality(rule.selected_optional_component_keys)) = specificity
    and (rule.effective_from is null or rule.effective_from <= target_check_in) and (rule.effective_until is null or rule.effective_until >= target_check_out - 1)
    and (rule.adults_min is null or target_adults >= rule.adults_min) and (rule.adults_max is null or target_adults <= rule.adults_max)
    and (rule.children_min is null or target_children >= rule.children_min) and (rule.children_max is null or target_children <= rule.children_max)
    and (rule.rooms_min is null or target_rooms >= rule.rooms_min) and (rule.rooms_max is null or target_rooms <= rule.rooms_max)
    and rule.selected_optional_component_keys = normalized_keys;
  if tie_count > 1 then return jsonb_build_object('status','conflict','total_vnd',null,'currency','VND','policy_version','phase6-package-v1'); end if;
  if winner.verified_at > now() or now() - winner.verified_at > interval '30 days' or winner.price_valid_until < target_check_out - 1 then
    return jsonb_build_object('status','unknown','total_vnd',null,'currency','VND','policy_version','phase6-package-v1','reason','stale');
  end if;
  return jsonb_build_object('status','quoted','total_vnd',winner.price_vnd,'currency','VND','price_source',winner.price_source,'verified_at',winner.verified_at,'valid_until',winner.price_valid_until,'policy_version','phase6-package-v1');
end;
$$;

create or replace function public.phase8_recompute_confirmation(target_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare next_status text; previous_status text; actor text;
begin
  select confirmation_status into previous_status from public.bookings where id=target_booking_id;
  select case
    when lifecycle_status = 'cancelled' then 'cancelled'
    when not exists (select 1 from public.booking_items i where i.booking_id = target_booking_id and i.is_required and i.confirmation_status <> 'not_required') then 'pending'
    when exists (select 1 from public.booking_items i where i.booking_id = target_booking_id and i.is_required and i.confirmation_status in ('declined','expired','cancelled')) then 'failed'
    when not exists (select 1 from public.booking_items i where i.booking_id = target_booking_id and i.is_required and i.confirmation_status <> 'confirmed') then 'confirmed'
    when exists (select 1 from public.booking_items i where i.booking_id = target_booking_id and i.is_required and i.confirmation_status = 'confirmed') then 'partial'
    else 'pending' end
  into next_status from public.bookings where id = target_booking_id;
  update public.bookings set confirmation_status = next_status, updated_at = now(), updated_by = auth.uid() where id = target_booking_id and confirmation_status is distinct from next_status;
  if found then
    actor:=case when (select public.is_admin()) then 'admin' when (select public.is_staff_or_admin()) then 'staff' else 'system' end;
    insert into public.booking_events(booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
    values(target_booking_id,'booking_confirmation_changed',case next_status when 'confirmed' then 'Tất cả dịch vụ bắt buộc đã được xác nhận.' when 'partial' then 'Một phần dịch vụ đã được xác nhận.' when 'failed' then 'Có dịch vụ bắt buộc không thể xác nhận.' when 'cancelled' then 'Quy trình xác nhận đã được hủy.' else 'Đội ngũ đang kiểm tra từng dịch vụ.' end,jsonb_build_object('previous_status',previous_status,'next_status',next_status),actor,auth.uid());
  end if;
end;
$$;

create or replace function public.create_public_booking_request(target_request jsonb, target_token_hash text, target_request_fingerprint text)
returns table (booking_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_code text;
  existing_fingerprint text;
  saved_booking_id uuid;
  saved_code text;
  destination_uuid uuid;
  check_in_value date;
  check_out_value date;
  adults_value integer;
  children_value integer;
  rooms_value integer;
  selection jsonb;
  selection_index integer := 0;
  room_snapshot jsonb;
  package_price jsonb;
  source_row record;
  item_id uuid;
  parent_item_id uuid;
  component record;
  optional_keys text[];
  item_price bigint;
  booking_total bigint := 0;
  priced_items integer := 0;
  unknown_items integer := 0;
  conflict_items integer := 0;
  selection_count integer;
  supplier_uuid uuid;
  contact_uuid uuid;
  booking_price_status text;
  component_cost bigint;
  component_cost_snapshot jsonb;
begin
  if target_token_hash !~ '^[a-f0-9]{64}$' or target_request_fingerprint !~ '^[a-f0-9]{64}$' then raise exception 'Invalid request credential'; end if;
  perform pg_advisory_xact_lock(hashtext(target_token_hash));
  select b.booking_code,b.request_fingerprint into existing_code,existing_fingerprint from public.bookings b where b.idempotency_key_hash = target_token_hash;
  if found then
    if existing_fingerprint<>target_request_fingerprint then raise exception 'Idempotency key was already used for a different request'; end if;
    return query select existing_code; return;
  end if;
  if jsonb_typeof(target_request) <> 'object' or jsonb_typeof(target_request->'selections') <> 'array' then raise exception 'Invalid request payload'; end if;
  selection_count := jsonb_array_length(target_request->'selections');
  if selection_count < 1 or selection_count > 8 then raise exception 'Select between one and eight services'; end if;
  check_in_value := (target_request->>'check_in')::date; check_out_value := (target_request->>'check_out')::date;
  adults_value := (target_request->>'adults')::integer; children_value := coalesce((target_request->>'children')::integer,0); rooms_value := coalesce((target_request->>'rooms')::integer,1);
  if check_out_value <= check_in_value or check_out_value > check_in_value + 31 or adults_value not between 1 and 100 or children_value not between 0 and 100 or rooms_value not between 1 and 100 then raise exception 'Invalid dates or party size'; end if;
  select id into destination_uuid from public.destinations where slug = 'ta-xua' and is_active and publish_status = 'published';
  if not found then raise exception 'Destination is not requestable'; end if;
  if char_length(btrim(target_request#>>'{customer,name}')) not between 2 and 160 or char_length(btrim(target_request#>>'{customer,phone}')) not between 6 and 30 then raise exception 'Customer name and phone are required'; end if;
  if coalesce(target_request#>>'{customer,name}','') ~ '[<>]' or coalesce(target_request#>>'{customer,phone}','') ~ '[<>]' or coalesce(target_request#>>'{customer,note}','') ~ '[<>]' then raise exception 'Customer fields must be plain text'; end if;
  loop
    saved_code := 'TX-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh','YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,6));
    exit when not exists(select 1 from public.bookings where bookings.booking_code = saved_code);
  end loop;
  insert into public.bookings (booking_code,destination_id,lifecycle_status,confirmation_status,check_in,check_out,adults,children,rooms,price_status,customer_name,customer_phone,customer_email,customer_zalo,customer_note,public_access_token_hash,idempotency_key_hash,request_fingerprint)
  values (saved_code,destination_uuid,'submitted','pending',check_in_value,check_out_value,adults_value,children_value,rooms_value,'unknown',btrim(target_request#>>'{customer,name}'),btrim(target_request#>>'{customer,phone}'),nullif(lower(btrim(target_request#>>'{customer,email}')),''),nullif(btrim(target_request#>>'{customer,zalo}'),''),nullif(btrim(target_request#>>'{customer,note}'),''),target_token_hash,target_token_hash,target_request_fingerprint)
  returning id into saved_booking_id;

  for selection in select value from jsonb_array_elements(target_request->'selections') loop
    selection_index := selection_index + 1;
    if selection->>'type' = 'ROOM' then
      room_snapshot := public.phase8_room_snapshot((selection->>'source_id')::uuid,check_in_value,check_out_value,coalesce((selection->>'quantity')::integer,rooms_value));
      if room_snapshot#>>'{availability,status}' = 'unavailable' then raise exception 'Room source is unavailable for the requested dates'; end if;
      item_price := (room_snapshot#>>'{price,total_vnd}')::bigint;
      supplier_uuid := nullif(room_snapshot#>>'{confirmation,supplier_id}','')::uuid; contact_uuid := nullif(room_snapshot#>>'{confirmation,contact_id}','')::uuid;
      insert into public.booking_items (booking_id,item_key,component_type,source_room_type_id,service_from,service_until,quantity,display_name_snapshot,description_snapshot,parent_name_snapshot,confirmation_mode_snapshot,sell_price_vnd,net_cost_vnd,price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot,confirmation_context_snapshot,policy_snapshot)
      values (saved_booking_id,'room-'||selection_index,'ROOM',(selection->>'source_id')::uuid,check_in_value,check_out_value,coalesce((selection->>'quantity')::integer,rooms_value),room_snapshot#>>'{source,room_name}',nullif(room_snapshot#>>'{source,description}',''),room_snapshot#>>'{source,property_name}',case when supplier_uuid is null then 'internal_manual' else 'supplier_manual' end,item_price,(room_snapshot#>>'{cost,total_vnd}')::bigint,room_snapshot#>>'{price,status}',room_snapshot#>>'{availability,status}','pending',room_snapshot->'source',room_snapshot->'price',room_snapshot->'availability',room_snapshot->'verification',room_snapshot->'confirmation',jsonb_build_object('booking','phase8-booking-v1','cost_snapshot',room_snapshot->'cost')) returning id into item_id;
      insert into public.booking_item_confirmations (booking_item_id,supplier_id,supplier_contact_id,confirmation_mode,supplier_snapshot) values (item_id,supplier_uuid,contact_uuid,case when supplier_uuid is null then 'internal_manual' else 'supplier_manual' end,room_snapshot->'confirmation');
    elsif selection->>'type' = 'MOTORBIKE' then
      select offering.*, supplier.display_name as supplier_name,
        contact.id as contact_id, contact.contact_name, contact.phone, contact.email, contact.zalo
      into source_row from public.motorbike_offerings offering join public.suppliers supplier on supplier.id=offering.supplier_id
      left join lateral (select c.* from public.supplier_contacts c where c.supplier_id=supplier.id and c.is_active order by c.is_primary desc,c.updated_at desc limit 1) contact on true
      where offering.slug=lower(btrim(selection->>'source_slug')) and offering.publication_status='published' and offering.availability_state<>'unavailable' and public.is_current_motorbike_source(offering.supplier_id,offering.source_external_ref_id);
      if not found then raise exception 'Motorbike source is not publicly requestable'; end if;
      item_price := case when source_row.public_price_vnd is not null and source_row.price_checked_at <= now() and source_row.price_valid_until >= (now() at time zone 'Asia/Ho_Chi_Minh')::date then source_row.public_price_vnd * coalesce((selection->>'quantity')::integer,1) else null end;
      insert into public.booking_items (booking_id,item_key,component_type,source_motorbike_offering_id,service_from,service_until,quantity,display_name_snapshot,description_snapshot,confirmation_mode_snapshot,sell_price_vnd,price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot,confirmation_context_snapshot,policy_snapshot)
      values (saved_booking_id,'motorbike-'||selection_index,'MOTORBIKE',source_row.id,check_in_value,check_out_value,coalesce((selection->>'quantity')::integer,1),source_row.display_name,source_row.public_description,'operator_manual',item_price,case when item_price is null then 'unknown' else 'quoted' end,'needs_confirmation','pending',jsonb_build_object('offering_id',source_row.id,'slug',source_row.slug,'display_name',source_row.display_name,'source_system','taxua_biker_manual_reference'),jsonb_build_object('status',case when item_price is null then 'unknown' else 'quoted' end,'total_vnd',item_price,'listed_unit_vnd',case when item_price is null then null else source_row.public_price_vnd end,'currency','VND'),jsonb_build_object('status','needs_confirmation','source_state',source_row.availability_state),jsonb_build_object(),jsonb_build_object('supplier_id',source_row.supplier_id,'supplier_name',source_row.supplier_name,'contact_id',source_row.contact_id,'contact_name',source_row.contact_name,'phone',source_row.phone,'email',source_row.email,'zalo',source_row.zalo),jsonb_build_object('integration_mode','manual_reference','booking','phase8-booking-v1')) returning id into item_id;
      insert into public.booking_item_confirmations (booking_item_id,supplier_id,supplier_contact_id,confirmation_mode,supplier_snapshot) values (item_id,source_row.supplier_id,source_row.contact_id,'operator_manual',jsonb_build_object('supplier_id',source_row.supplier_id,'supplier_name',source_row.supplier_name,'contact_id',source_row.contact_id,'contact_name',source_row.contact_name,'phone',source_row.phone,'email',source_row.email,'zalo',source_row.zalo));
    elsif selection->>'type' = 'PACKAGE' then
      select package.* into source_row from public.packages package where package.id=(selection->>'source_id')::uuid and public.is_package_public(package.id);
      if not found then raise exception 'Package source is not publicly requestable'; end if;
      optional_keys := coalesce((select array_agg(distinct lower(btrim(value)) order by lower(btrim(value))) from jsonb_array_elements_text(coalesce(selection->'optional_component_keys','[]'::jsonb)) value where btrim(value)<>''),'{}'::text[]);
      if cardinality(optional_keys)>50 then raise exception 'Too many optional package components'; end if;
      if exists(select 1 from unnest(optional_keys) key where not exists(select 1 from public.package_components pc where pc.package_id=source_row.id and not pc.is_required and pc.component_key=key)) then raise exception 'Invalid optional package component'; end if;
      package_price := public.phase8_package_price_snapshot(source_row.id,check_in_value,check_out_value,adults_value,children_value,rooms_value,optional_keys);
      item_price := (package_price->>'total_vnd')::bigint;
      insert into public.booking_items (booking_id,item_key,component_type,source_package_id,service_from,service_until,quantity,display_name_snapshot,description_snapshot,confirmation_mode_snapshot,sell_price_vnd,price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot,confirmation_context_snapshot,policy_snapshot)
      values (saved_booking_id,'package-'||selection_index,'PACKAGE',source_row.id,check_in_value,check_out_value,1,source_row.name,coalesce(source_row.proposition,source_row.description),'not_required',item_price,package_price->>'status','needs_confirmation','not_required',jsonb_build_object('package_id',source_row.id,'slug',source_row.slug,'name',source_row.name,'proposition',source_row.proposition,'description',source_row.description,'selected_optional_component_keys',to_jsonb(optional_keys)),package_price,jsonb_build_object('status','needs_confirmation'),jsonb_build_object(),jsonb_build_object('mode',source_row.confirmation_mode),jsonb_build_object('package_price_authority','explicit_total','component_double_counting',false,'booking','phase8-booking-v1')) returning id into parent_item_id;
      for component in select pc.* from public.package_components pc where pc.package_id=source_row.id and (pc.is_required or pc.component_key=any(optional_keys)) order by pc.sort_order,pc.component_key loop
        component_cost:=case when component.unit_cost_vnd is not null and component.cost_verified_at<=now() and now()-component.cost_verified_at<=interval '30 days' and component.cost_valid_until>=check_out_value-1 then component.unit_cost_vnd::bigint*component.quantity else null end;
        component_cost_snapshot:=jsonb_build_object('total_vnd',component_cost,'unit_cost_vnd',case when component_cost is null then null else component.unit_cost_vnd end,'cost_source',case when component_cost is null then null else component.cost_source end,'verified_at',component.cost_verified_at,'valid_until',component.cost_valid_until,'policy_version','phase6-package-v1');
        if component.component_type='ROOM' then
          room_snapshot:=public.phase8_room_snapshot(component.room_type_id,check_in_value,check_out_value,component.quantity*rooms_value);
          if component.is_required and room_snapshot#>>'{availability,status}' = 'unavailable' then raise exception 'Required package room is unavailable for the requested dates'; end if;
          supplier_uuid:=nullif(room_snapshot#>>'{confirmation,supplier_id}','')::uuid; contact_uuid:=nullif(room_snapshot#>>'{confirmation,contact_id}','')::uuid;
          insert into public.booking_items (booking_id,parent_booking_item_id,item_key,component_type,source_room_type_id,source_package_component_id,service_from,service_until,quantity,is_required,counts_toward_booking_total,display_name_snapshot,description_snapshot,parent_name_snapshot,confirmation_mode_snapshot,net_cost_vnd,price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot,confirmation_context_snapshot,policy_snapshot)
          values(saved_booking_id,parent_item_id,'package-'||selection_index||'-'||component.component_key,'ROOM',component.room_type_id,component.id,check_in_value,check_out_value,component.quantity*rooms_value,component.is_required,false,room_snapshot#>>'{source,room_name}',coalesce(nullif(component.public_copy_override,''),nullif(room_snapshot#>>'{source,description}','')),room_snapshot#>>'{source,property_name}',case when supplier_uuid is null then 'internal_manual' else 'supplier_manual' end,(room_snapshot#>>'{cost,total_vnd}')::bigint,'included_in_package',room_snapshot#>>'{availability,status}','pending',room_snapshot->'source',jsonb_build_object('status','included_in_package','total_vnd',null,'standalone_reference',room_snapshot->'price'),room_snapshot->'availability',room_snapshot->'verification',room_snapshot->'confirmation',jsonb_build_object('parent_package_item_id',parent_item_id,'component_double_counting',false,'cost_snapshot',room_snapshot->'cost')) returning id into item_id;
        elsif component.component_type='MOTORBIKE' then
          select offering.*,supplier.display_name as supplier_name,contact.id as contact_id,contact.contact_name,contact.phone,contact.email,contact.zalo into source_row from public.motorbike_offerings offering join public.suppliers supplier on supplier.id=offering.supplier_id left join lateral(select c.* from public.supplier_contacts c where c.supplier_id=supplier.id and c.is_active order by c.is_primary desc,c.updated_at desc limit 1) contact on true where offering.id=component.motorbike_offering_id and offering.publication_status='published' and offering.availability_state<>'unavailable' and public.is_current_motorbike_source(offering.supplier_id,offering.source_external_ref_id);
          if not found then raise exception 'Selected package motorbike is not requestable'; end if;
          if found then
            insert into public.booking_items (booking_id,parent_booking_item_id,item_key,component_type,source_motorbike_offering_id,source_package_component_id,service_from,service_until,quantity,is_required,counts_toward_booking_total,display_name_snapshot,description_snapshot,confirmation_mode_snapshot,net_cost_vnd,price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot,confirmation_context_snapshot,policy_snapshot)
            values(saved_booking_id,parent_item_id,'package-'||selection_index||'-'||component.component_key,'MOTORBIKE',source_row.id,component.id,check_in_value,check_out_value,component.quantity,component.is_required,false,source_row.display_name,coalesce(component.public_copy_override,source_row.public_description),'operator_manual',component_cost,'included_in_package','needs_confirmation','pending',jsonb_build_object('offering_id',source_row.id,'slug',source_row.slug,'display_name',source_row.display_name,'source_system','taxua_biker_manual_reference'),jsonb_build_object('status','included_in_package','total_vnd',null),jsonb_build_object('status','needs_confirmation'),jsonb_build_object(),jsonb_build_object('supplier_id',source_row.supplier_id,'supplier_name',source_row.supplier_name,'contact_id',source_row.contact_id,'contact_name',source_row.contact_name,'phone',source_row.phone,'email',source_row.email,'zalo',source_row.zalo),jsonb_build_object('parent_package_item_id',parent_item_id,'integration_mode','manual_reference','component_double_counting',false,'cost_snapshot',component_cost_snapshot)) returning id into item_id;
            supplier_uuid:=source_row.supplier_id; contact_uuid:=source_row.contact_id;
          else continue; end if;
        elsif component.component_type='CUSTOM' then
          insert into public.booking_items (booking_id,parent_booking_item_id,item_key,component_type,source_package_id,source_package_component_id,source_custom_code,service_from,service_until,quantity,is_required,counts_toward_booking_total,display_name_snapshot,description_snapshot,confirmation_mode_snapshot,net_cost_vnd,price_status,availability_status,confirmation_status,source_snapshot,price_snapshot,availability_snapshot,verification_snapshot,confirmation_context_snapshot,policy_snapshot)
          values(saved_booking_id,parent_item_id,'package-'||selection_index||'-'||component.component_key,'CUSTOM',component.package_id,component.id,component.custom_code,check_in_value,check_out_value,component.quantity,component.is_required,false,component.custom_name,coalesce(component.public_copy_override,component.custom_description),'internal_manual',component_cost,'included_in_package','needs_confirmation','pending',jsonb_build_object('custom_code',component.custom_code,'name',component.custom_name,'description',component.custom_description),jsonb_build_object('status','included_in_package','total_vnd',null),jsonb_build_object('status','needs_confirmation'),jsonb_build_object(),jsonb_build_object('mode','internal_manual'),jsonb_build_object('parent_package_item_id',parent_item_id,'component_double_counting',false,'cost_snapshot',component_cost_snapshot)) returning id into item_id;
          supplier_uuid:=null; contact_uuid:=null;
        else raise exception 'Unsupported package component'; end if;
        insert into public.booking_item_confirmations (booking_item_id,supplier_id,supplier_contact_id,confirmation_mode,supplier_snapshot) values(item_id,supplier_uuid,contact_uuid,case when supplier_uuid is null then 'internal_manual' when component.component_type='MOTORBIKE' then 'operator_manual' else 'supplier_manual' end,(select confirmation_context_snapshot from public.booking_items where id=item_id));
      end loop;
    else raise exception 'Unsupported booking selection'; end if;
    if item_price is not null then booking_total:=booking_total+item_price; priced_items:=priced_items+1; else unknown_items:=unknown_items+1; end if;
    if coalesce(room_snapshot#>>'{price,status}',package_price->>'status','')='conflict' then conflict_items:=conflict_items+1; end if;
    room_snapshot:=null; package_price:=null; item_price:=null;
  end loop;
  booking_price_status:=case when conflict_items>0 then 'conflict' when unknown_items=0 then 'quoted' when priced_items>0 then 'partial' else 'unknown' end;
  update public.bookings set quoted_sell_total_vnd=case when booking_price_status='quoted' then booking_total else null end,price_status=booking_price_status,updated_at=now() where id=saved_booking_id;
  perform public.phase8_recompute_confirmation(saved_booking_id);
  insert into public.booking_events(booking_id,event_type,public_message,internal_detail,actor_type) values(saved_booking_id,'booking_submitted','Đã nhận yêu cầu chuyến đi. Đội ngũ đang kiểm tra từng dịch vụ.',jsonb_build_object('channel','public_web','item_count',(select count(*) from public.booking_items where booking_id=saved_booking_id)),'customer');
  return query select saved_code;
end;
$$;

create or replace function public.get_public_booking_status(target_booking_code text,target_token_hash text)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'booking_code',b.booking_code,'lifecycle_status',b.lifecycle_status,'confirmation_status',b.confirmation_status,
    'check_in',b.check_in,'check_out',b.check_out,'adults',b.adults,'children',b.children,'rooms',b.rooms,
    'currency',b.currency,'quoted_sell_total_vnd',b.quoted_sell_total_vnd,'price_status',b.price_status,'quoted_at',b.quoted_at,'submitted_at',b.submitted_at,
    'items',coalesce((select jsonb_agg(jsonb_build_object('item_key',i.item_key,'component_type',i.component_type,'display_name',i.display_name_snapshot,'description',i.description_snapshot,'parent_name',i.parent_name_snapshot,'quantity',i.quantity,'is_required',i.is_required,'counts_toward_booking_total',i.counts_toward_booking_total,'sell_price_vnd',i.sell_price_vnd,'price_status',i.price_status,'availability_status',i.availability_status,'confirmation_status',i.confirmation_status,'confirmation_mode',i.confirmation_mode_snapshot,'quoted_at',i.quoted_at) order by i.created_at,i.item_key) from public.booking_items i where i.booking_id=b.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(jsonb_build_object('event_type',e.event_type,'message',e.public_message,'created_at',e.created_at) order by e.created_at,e.id) from public.booking_events e where e.booking_id=b.id and e.public_message is not null),'[]'::jsonb)
  ) from public.bookings b where b.booking_code=upper(btrim(target_booking_code)) and b.public_access_token_hash=target_token_hash;
$$;

create or replace function public.update_booking_lifecycle(target_booking_id uuid,target_status text,target_note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare current_status text; actor text;
begin
  if not (select public.is_staff_or_admin()) then raise exception 'Booking lifecycle requires staff'; end if;
  if target_status not in ('active','cancelled','completed','expired') then raise exception 'Invalid booking lifecycle'; end if;
  if target_status='cancelled' and not (select public.is_admin()) then raise exception 'Booking cancellation requires admin'; end if;
  select lifecycle_status into current_status from public.bookings where id=target_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if current_status in ('cancelled','completed','expired') then raise exception 'Terminal booking lifecycle is immutable'; end if;
  if target_status='completed' and current_status<>'active' then raise exception 'Only an active booking can be completed'; end if;
  actor:=case when (select public.is_admin()) then 'admin' else 'staff' end;
  update public.bookings set lifecycle_status=target_status,confirmation_status=case when target_status='cancelled' then 'cancelled' else confirmation_status end,internal_note=coalesce(nullif(btrim(target_note),''),internal_note),updated_at=now(),updated_by=auth.uid() where id=target_booking_id;
  if target_status='cancelled' then update public.booking_items set confirmation_status='cancelled' where booking_id=target_booking_id and confirmation_status not in ('confirmed','declined','expired','cancelled','not_required'); update public.booking_item_confirmations set status='cancelled',responded_at=now(),updated_at=now(),updated_by=auth.uid() where booking_item_id in(select id from public.booking_items where booking_id=target_booking_id) and status in('pending','requested'); end if;
  insert into public.booking_events(booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id) values(target_booking_id,'booking_'||target_status,case target_status when 'active' then 'Yêu cầu đang được đội ngũ xử lý.' when 'cancelled' then 'Yêu cầu đã được hủy.' when 'completed' then 'Yêu cầu đã hoàn tất.' else 'Yêu cầu đã hết hiệu lực.' end,jsonb_build_object('previous_status',current_status,'note',nullif(btrim(target_note),'')),actor,auth.uid());
end;
$$;

create or replace function public.update_booking_internal_note(target_booking_id uuid,target_note text)
returns void language plpgsql security definer set search_path='' as $$
declare actor text;
begin
  if not (select public.is_staff_or_admin()) then raise exception 'Booking note requires staff'; end if;
  if target_note is not null and char_length(target_note)>10000 then raise exception 'Booking note is too long'; end if;
  actor:=case when (select public.is_admin()) then 'admin' else 'staff' end;
  update public.bookings set internal_note=nullif(btrim(target_note),''),updated_at=now(),updated_by=auth.uid() where id=target_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  insert into public.booking_events(booking_id,event_type,public_message,internal_detail,actor_type,actor_user_id)
  values(target_booking_id,'booking_internal_note_updated',null,jsonb_build_object('has_note',nullif(btrim(target_note),'') is not null),actor,auth.uid());
end;
$$;

create or replace function public.update_supplier_confirmation(target_booking_item_id uuid,target_status text,target_note text default null,target_external_reference text default null,target_expires_at timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare confirmation_row record; booking_uuid uuid; actor text;
begin
  if not (select public.is_staff_or_admin()) then raise exception 'Supplier confirmation requires staff'; end if;
  if target_status not in ('requested','confirmed','declined','expired','cancelled') then raise exception 'Invalid confirmation status'; end if;
  select c.*,i.booking_id into confirmation_row from public.booking_item_confirmations c join public.booking_items i on i.id=c.booking_item_id where c.booking_item_id=target_booking_item_id for update;
  if not found then raise exception 'Confirmation not found'; end if;
  if confirmation_row.status in ('declined','expired','cancelled') then raise exception 'Terminal supplier response is immutable'; end if;
  if target_status='requested' and confirmation_row.status not in('pending','requested') then raise exception 'Confirmed response cannot return to requested'; end if;
  booking_uuid:=confirmation_row.booking_id; actor:=case when (select public.is_admin()) then 'admin' else 'staff' end;
  update public.booking_item_confirmations set status=target_status,requested_at=case when target_status='requested' then coalesce(requested_at,now()) else requested_at end,responded_at=case when target_status in('confirmed','declined','expired','cancelled') then now() else null end,expires_at=target_expires_at,external_reference=nullif(btrim(target_external_reference),''),response_note_internal=nullif(btrim(target_note),''),updated_at=now(),updated_by=auth.uid() where booking_item_id=target_booking_item_id;
  update public.booking_items set confirmation_status=target_status where id=target_booking_item_id;
  perform public.phase8_recompute_confirmation(booking_uuid);
  insert into public.booking_events(booking_id,booking_item_id,event_type,public_message,internal_detail,actor_type,actor_user_id) values(booking_uuid,target_booking_item_id,'supplier_confirmation_'||target_status,case target_status when 'requested' then 'Đang chờ nhà cung cấp phản hồi cho một dịch vụ.' when 'confirmed' then 'Một dịch vụ đã được xác nhận.' when 'declined' then 'Một dịch vụ không thể xác nhận.' when 'expired' then 'Một xác nhận dịch vụ đã hết hiệu lực.' else 'Một yêu cầu xác nhận dịch vụ đã được hủy.' end,jsonb_build_object('note',nullif(btrim(target_note),''),'external_reference',nullif(btrim(target_external_reference),'')),actor,auth.uid());
end;
$$;

create or replace function public.guard_phase8_booking_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if row(new.booking_code,new.destination_id,new.channel,new.check_in,new.check_out,new.adults,new.children,new.rooms,new.currency,new.quoted_at,new.customer_name,new.customer_phone,new.customer_email,new.customer_zalo,new.customer_note,new.public_access_token_hash,new.idempotency_key_hash,new.request_fingerprint,new.quote_policy_version,new.submitted_at,new.created_at)
    is distinct from row(old.booking_code,old.destination_id,old.channel,old.check_in,old.check_out,old.adults,old.children,old.rooms,old.currency,old.quoted_at,old.customer_name,old.customer_phone,old.customer_email,old.customer_zalo,old.customer_note,old.public_access_token_hash,old.idempotency_key_hash,old.request_fingerprint,old.quote_policy_version,old.submitted_at,old.created_at) then raise exception 'Booking submission snapshot is immutable'; end if;
  return new;
end; $$;
create trigger bookings_immutable_submission before update on public.bookings for each row execute function public.guard_phase8_booking_update();

create or replace function public.guard_phase8_item_update() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if row(new.booking_id,new.parent_booking_item_id,new.item_key,new.component_type,new.source_room_type_id,new.source_motorbike_offering_id,new.source_package_id,new.source_package_component_id,new.source_custom_code,new.service_from,new.service_until,new.quantity,new.is_required,new.counts_toward_booking_total,new.display_name_snapshot,new.description_snapshot,new.parent_name_snapshot,new.confirmation_mode_snapshot,new.sell_price_vnd,new.net_cost_vnd,new.price_status,new.availability_status,new.source_snapshot,new.price_snapshot,new.availability_snapshot,new.verification_snapshot,new.confirmation_context_snapshot,new.policy_snapshot,new.quoted_at,new.created_at)
    is distinct from row(old.booking_id,old.parent_booking_item_id,old.item_key,old.component_type,old.source_room_type_id,old.source_motorbike_offering_id,old.source_package_id,old.source_package_component_id,old.source_custom_code,old.service_from,old.service_until,old.quantity,old.is_required,old.counts_toward_booking_total,old.display_name_snapshot,old.description_snapshot,old.parent_name_snapshot,old.confirmation_mode_snapshot,old.sell_price_vnd,old.net_cost_vnd,old.price_status,old.availability_status,old.source_snapshot,old.price_snapshot,old.availability_snapshot,old.verification_snapshot,old.confirmation_context_snapshot,old.policy_snapshot,old.quoted_at,old.created_at) then raise exception 'Booking Item snapshot is immutable'; end if;
  return new;
end; $$;
create trigger booking_items_immutable_snapshot before update on public.booking_items for each row execute function public.guard_phase8_item_update();

create or replace function public.reject_booking_event_mutation() returns trigger language plpgsql security invoker set search_path='' as $$ begin raise exception 'Booking events are append-only'; end; $$;
create trigger booking_events_append_only before update or delete on public.booking_events for each row execute function public.reject_booking_event_mutation();

alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_item_confirmations enable row level security;
alter table public.booking_events enable row level security;
revoke all on table public.bookings,public.booking_items,public.booking_item_confirmations,public.booking_events from public,anon,authenticated;
grant select on table public.bookings,public.booking_items,public.booking_item_confirmations,public.booking_events to authenticated;
create policy "staff reads bookings" on public.bookings for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads booking items" on public.booking_items for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads booking confirmations" on public.booking_item_confirmations for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads booking events" on public.booking_events for select to authenticated using ((select public.is_staff_or_admin()));

revoke all on function public.phase8_room_snapshot(uuid,date,date,integer) from public;
revoke all on function public.phase8_room_cost_snapshot(uuid,date,date,integer) from public;
revoke all on function public.phase8_package_price_snapshot(uuid,date,date,integer,integer,integer,text[]) from public;
revoke all on function public.phase8_recompute_confirmation(uuid) from public;
revoke all on function public.create_public_booking_request(jsonb,text,text) from public;
revoke all on function public.get_public_booking_status(text,text) from public;
revoke all on function public.update_booking_lifecycle(uuid,text,text) from public;
revoke all on function public.update_booking_internal_note(uuid,text) from public;
revoke all on function public.update_supplier_confirmation(uuid,text,text,text,timestamptz) from public;
revoke all on function public.guard_phase8_booking_update() from public;
revoke all on function public.guard_phase8_item_update() from public;
revoke all on function public.reject_booking_event_mutation() from public;
grant execute on function public.create_public_booking_request(jsonb,text,text) to anon,authenticated;
grant execute on function public.get_public_booking_status(text,text) to anon,authenticated;
grant execute on function public.update_booking_lifecycle(uuid,text,text) to authenticated;
grant execute on function public.update_booking_internal_note(uuid,text) to authenticated;
grant execute on function public.update_supplier_confirmation(uuid,text,text,text,timestamptz) to authenticated;

comment on table public.bookings is 'Private Phase 8 traveler request. One trip equals one Booking; no Payment or hold semantics.';
comment on table public.booking_items is 'Immutable submission-time component, sell-price, availability, verification and confirmation-context snapshots. Package children never double-count the Package total.';
comment on table public.booking_item_confirmations is 'Supplier confirmation state machine, intentionally separate from Booking lifecycle.';
comment on table public.booking_events is 'Append-only Booking and supplier-confirmation audit timeline.';
comment on function public.create_public_booking_request(jsonb,text,text) is 'Atomic, idempotent public boundary that re-resolves all source facts server-side; browser-supplied price, availability and verification are ignored.';
