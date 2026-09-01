-- Tà Xùa Trip V2 Phase 12: Supplier Communication Automation + Telegram.
-- Telegram is a communication transport only. Existing Booking, Supplier
-- Confirmation and Phase 11 Operations state machines remain authoritative.
-- No bot token, webhook secret, payment state, Biker runtime data or customer
-- credentials are stored by this migration.

alter table public.booking_events
  drop constraint booking_events_actor_allowed,
  add constraint booking_events_actor_allowed
    check (actor_type in ('customer', 'staff', 'admin', 'supplier', 'system'));

alter table public.booking_confirmation_events
  drop constraint booking_confirmation_events_actor,
  add constraint booking_confirmation_events_actor
    check (actor_type in ('staff', 'admin', 'supplier', 'system'));

create table public.supplier_communication_channels (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  channel_type text not null default 'telegram',
  telegram_chat_id bigint not null,
  telegram_chat_type text not null,
  telegram_chat_title text,
  status text not null default 'active',
  is_primary boolean not null default true,
  connected_at timestamptz not null default now(),
  verified_at timestamptz not null default now(),
  disabled_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer not null default 0,
  last_error_code text,
  last_error_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint supplier_channels_type_telegram check (channel_type = 'telegram'),
  constraint supplier_channels_chat_type_group check (telegram_chat_type in ('group', 'supergroup')),
  constraint supplier_channels_chat_id_group check (telegram_chat_id < 0),
  constraint supplier_channels_status_allowed check (status in ('active', 'disabled', 'error')),
  constraint supplier_channels_title_length check (telegram_chat_title is null or char_length(telegram_chat_title) <= 255),
  constraint supplier_channels_failure_count check (consecutive_failures between 0 and 100000),
  constraint supplier_channels_error_length check (
    (last_error_code is null or char_length(last_error_code) <= 80)
    and (last_error_summary is null or char_length(last_error_summary) <= 500)
  ),
  constraint supplier_channels_disable_shape check (
    (status = 'disabled' and disabled_at is not null)
    or (status <> 'disabled' and disabled_at is null)
  )
);

create unique index supplier_channels_chat_unique
  on public.supplier_communication_channels (telegram_chat_id);
create unique index supplier_channels_one_primary
  on public.supplier_communication_channels (supplier_id, channel_type)
  where is_primary and status in ('active', 'error');
create index supplier_channels_health_index
  on public.supplier_communication_channels (status, last_failure_at desc, updated_at desc);

create table public.supplier_operations_assignments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  assignment_role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint supplier_ops_assignment_role_allowed check (assignment_role in ('primary', 'backup', 'observer')),
  constraint supplier_ops_assignment_unique unique (supplier_id, user_id)
);

create unique index supplier_ops_one_active_primary
  on public.supplier_operations_assignments (supplier_id)
  where is_active and assignment_role = 'primary';
create index supplier_ops_user_index
  on public.supplier_operations_assignments (user_id, is_active, supplier_id);

create table public.telegram_connection_codes (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  code_hash text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null,
  used_at timestamptz,
  used_channel_id uuid references public.supplier_communication_channels(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  constraint telegram_connection_code_hash check (code_hash ~ '^[a-f0-9]{64}$'),
  constraint telegram_connection_code_status check (status in ('pending', 'used', 'expired', 'revoked')),
  constraint telegram_connection_code_expiry check (expires_at > created_at and expires_at <= created_at + interval '2 hours'),
  constraint telegram_connection_code_state check (
    (status = 'pending' and used_at is null and used_channel_id is null and revoked_at is null)
    or (status = 'used' and used_at is not null and used_channel_id is not null and revoked_at is null)
    or (status = 'expired' and used_at is null and used_channel_id is null)
    or (status = 'revoked' and used_at is null and used_channel_id is null and revoked_at is not null)
  )
);

create unique index telegram_connection_one_pending
  on public.telegram_connection_codes (supplier_id)
  where status = 'pending';
create index telegram_connection_expiry_index
  on public.telegram_connection_codes (status, expires_at);

create table public.communication_outbox (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  channel_id uuid not null references public.supplier_communication_channels(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  booking_item_id uuid references public.booking_items(id) on delete restrict,
  confirmation_id uuid references public.booking_item_confirmations(id) on delete restrict,
  message_type text not null,
  dedupe_key text not null unique,
  payload jsonb not null,
  source_update_id bigint,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  claim_token uuid,
  claimed_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  telegram_message_id bigint,
  last_error_code text,
  last_error_summary text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint communication_outbox_message_type check (message_type in ('confirmation_request', 'confirmation_follow_up', 'connection_ack', 'command_reply', 'test')),
  constraint communication_outbox_dedupe_length check (char_length(dedupe_key) between 8 and 240),
  constraint communication_outbox_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint communication_outbox_status check (status in ('pending', 'processing', 'sent', 'retry', 'failed', 'cancelled')),
  constraint communication_outbox_attempts check (attempt_count between 0 and max_attempts and max_attempts between 1 and 5),
  constraint communication_outbox_claim_shape check (
    (status = 'processing' and claimed_at is not null and claim_token is not null)
    or (status <> 'processing')
  ),
  constraint communication_outbox_sent_shape check (
    (status = 'sent' and sent_at is not null and telegram_message_id is not null)
    or status <> 'sent'
  ),
  constraint communication_outbox_error_length check (
    (last_error_code is null or char_length(last_error_code) <= 80)
    and (last_error_summary is null or char_length(last_error_summary) <= 500)
  )
);

create unique index communication_outbox_source_update_unique
  on public.communication_outbox (source_update_id)
  where source_update_id is not null;
create index communication_outbox_worker_index
  on public.communication_outbox (status, next_attempt_at, created_at);
create index communication_outbox_supplier_index
  on public.communication_outbox (supplier_id, created_at desc);

create table public.telegram_update_receipts (
  id bigint generated always as identity primary key,
  update_id bigint not null unique,
  update_type text not null,
  telegram_chat_id bigint not null,
  payload_hash text,
  outcome text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now(),
  constraint telegram_receipts_type check (update_type in ('connect', 'command', 'callback')),
  constraint telegram_receipts_chat check (telegram_chat_id < 0),
  constraint telegram_receipts_hash check (payload_hash is null or payload_hash ~ '^[a-f0-9]{64}$'),
  constraint telegram_receipts_outcome check (outcome in ('processed', 'duplicate', 'stale', 'rejected'))
);

create index telegram_update_receipts_received_index
  on public.telegram_update_receipts (received_at desc);

create table public.telegram_actions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  channel_id uuid not null references public.supplier_communication_channels(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  booking_item_id uuid not null references public.booking_items(id) on delete restrict,
  confirmation_id uuid not null references public.booking_item_confirmations(id) on delete restrict,
  action_type text not null,
  status text not null default 'pending',
  expected_booking_revision bigint not null,
  expected_confirmation_updated_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_update_id bigint,
  response_snapshot jsonb not null default '{}'::jsonb,
  discussion_resolved_at timestamptz,
  discussion_resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint telegram_actions_token_hash check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint telegram_actions_type check (action_type in ('CONFIRM', 'DECLINE', 'NEED_DISCUSSION')),
  constraint telegram_actions_status check (status in ('pending', 'used', 'expired', 'rejected')),
  constraint telegram_actions_revision check (expected_booking_revision > 0),
  constraint telegram_actions_expiry check (expires_at > created_at and expires_at <= created_at + interval '24 hours'),
  constraint telegram_actions_usage check (
    (status = 'pending' and used_at is null and used_update_id is null)
    or (status <> 'pending')
  ),
  constraint telegram_actions_response_object check (jsonb_typeof(response_snapshot) = 'object'),
  constraint telegram_actions_discussion_shape check (
    discussion_resolved_at is null
    or (action_type = 'NEED_DISCUSSION' and status = 'used' and discussion_resolved_by is not null)
  )
);

create index telegram_actions_callback_index
  on public.telegram_actions (token_hash, status, expires_at);
create index telegram_actions_operations_index
  on public.telegram_actions (booking_id, action_type, status, discussion_resolved_at, created_at desc);

create table public.communication_delivery_logs (
  id bigint generated always as identity primary key,
  outbox_id uuid not null references public.communication_outbox(id) on delete restrict,
  channel_id uuid not null references public.supplier_communication_channels(id) on delete restrict,
  attempt_number integer not null,
  outcome text not null,
  telegram_response_code integer,
  error_code text,
  response_summary text,
  created_at timestamptz not null default now(),
  constraint delivery_logs_attempt check (attempt_number between 1 and 5),
  constraint delivery_logs_outcome check (outcome in ('accepted', 'retry', 'failed', 'cancelled')),
  constraint delivery_logs_response_code check (telegram_response_code is null or telegram_response_code between 100 and 599),
  constraint delivery_logs_text_length check (
    (error_code is null or char_length(error_code) <= 80)
    and (response_summary is null or char_length(response_summary) <= 500)
  ),
  constraint delivery_logs_attempt_unique unique (outbox_id, attempt_number)
);

create index delivery_logs_channel_index
  on public.communication_delivery_logs (channel_id, created_at desc);

alter table public.supplier_communication_channels enable row level security;
alter table public.supplier_operations_assignments enable row level security;
alter table public.telegram_connection_codes enable row level security;
alter table public.communication_outbox enable row level security;
alter table public.telegram_update_receipts enable row level security;
alter table public.telegram_actions enable row level security;
alter table public.communication_delivery_logs enable row level security;

revoke all on table public.supplier_communication_channels from public, anon, authenticated;
revoke all on table public.supplier_operations_assignments from public, anon, authenticated;
revoke all on table public.telegram_connection_codes from public, anon, authenticated;
revoke all on table public.communication_outbox from public, anon, authenticated;
revoke all on table public.telegram_update_receipts from public, anon, authenticated;
revoke all on table public.telegram_actions from public, anon, authenticated;
revoke all on table public.communication_delivery_logs from public, anon, authenticated;

grant select on table public.supplier_communication_channels to authenticated;
grant select on table public.supplier_operations_assignments to authenticated;
grant select (
  id, supplier_id, status, expires_at, used_at, used_channel_id, revoked_at, created_at, created_by
) on public.telegram_connection_codes to authenticated;
grant select (
  id, supplier_id, channel_id, booking_id, booking_item_id, confirmation_id, message_type,
  status, attempt_count, max_attempts, next_attempt_at, claimed_at, sent_at,
  telegram_message_id, last_error_code, last_error_summary, created_at, created_by
) on public.communication_outbox to authenticated;
grant select (
  id, update_id, update_type, telegram_chat_id, outcome, received_at, processed_at
) on public.telegram_update_receipts to authenticated;
grant select (
  id, supplier_id, channel_id, booking_id, booking_item_id, confirmation_id, action_type,
  status, expected_booking_revision, expected_confirmation_updated_at, expires_at, used_at,
  used_update_id, discussion_resolved_at, discussion_resolved_by, created_at, created_by
) on public.telegram_actions to authenticated;
grant select on table public.communication_delivery_logs to authenticated;

create policy "staff reads Telegram channels" on public.supplier_communication_channels
  for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads Telegram assignments" on public.supplier_operations_assignments
  for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads Telegram connection metadata" on public.telegram_connection_codes
  for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads communication outbox" on public.communication_outbox
  for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads Telegram receipts" on public.telegram_update_receipts
  for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads Telegram actions" on public.telegram_actions
  for select to authenticated using ((select public.is_staff_or_admin()));
create policy "staff reads communication delivery logs" on public.communication_delivery_logs
  for select to authenticated using ((select public.is_staff_or_admin()));

create or replace function public.phase12_hash_token(target_token text)
returns text
language sql
immutable
security definer
set search_path = 'pg_catalog', 'extensions'
as $$
  select encode(extensions.digest(target_token, 'sha256'), 'hex')
$$;

revoke all on function public.phase12_hash_token(text) from public, anon, authenticated;

create or replace function public.get_telegram_staff_options()
returns table (user_id uuid, email text, app_role text)
language sql
stable
security definer
set search_path = ''
as $$
  select saved.id, saved.email::text, saved.raw_app_meta_data->>'role'
  from auth.users saved
  where public.is_staff_or_admin()
    and saved.raw_app_meta_data->>'role' in ('admin', 'staff')
  order by saved.email, saved.id
$$;

create or replace function public.generate_telegram_connection_code(target_supplier_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplier_row record;
  active_channel_exists boolean;
  raw_code text;
  display_code text;
  code_expiry timestamptz := now() + interval '30 minutes';
  saved_id uuid;
begin
  if not public.is_staff_or_admin() then raise exception 'Telegram connection requires staff'; end if;
  select id, display_name, status into supplier_row
  from public.suppliers where id = target_supplier_id for update;
  if not found or supplier_row.status in ('inactive', 'archived') then
    raise exception 'Supplier is not eligible for Telegram connection';
  end if;
  select exists(
    select 1 from public.supplier_communication_channels
    where supplier_id = target_supplier_id and is_primary and status in ('active', 'error')
  ) into active_channel_exists;
  if active_channel_exists and not public.is_admin() then
    raise exception 'Only admin may reconnect an existing Supplier channel';
  end if;

  update public.telegram_connection_codes
  set status = case when expires_at <= now() then 'expired' else 'revoked' end,
      revoked_at = case when expires_at > now() then now() else revoked_at end
  where supplier_id = target_supplier_id and status = 'pending';

  raw_code := upper(encode(extensions.gen_random_bytes(8), 'hex'));
  display_code := 'TXC-' || substr(raw_code, 1, 4) || '-' || substr(raw_code, 5, 4)
    || '-' || substr(raw_code, 9, 4) || '-' || substr(raw_code, 13, 4);
  insert into public.telegram_connection_codes (supplier_id, code_hash, expires_at, created_by)
  values (target_supplier_id, public.phase12_hash_token(display_code), code_expiry, auth.uid())
  returning id into saved_id;
  return jsonb_build_object(
    'connection_code_id', saved_id,
    'supplier_id', target_supplier_id,
    'supplier_name', supplier_row.display_name,
    'code', display_code,
    'expires_at', code_expiry
  );
end;
$$;

create or replace function public.set_supplier_telegram_assignment(
  target_supplier_id uuid,
  target_user_id uuid,
  target_assignment_role text,
  target_is_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare saved_id uuid; target_role text;
begin
  if not public.is_admin() then raise exception 'Telegram assignment changes require admin'; end if;
  if target_assignment_role not in ('primary', 'backup', 'observer') then raise exception 'Invalid Telegram assignment role'; end if;
  if not exists(select 1 from public.suppliers where id = target_supplier_id and status <> 'archived') then raise exception 'Supplier not found'; end if;
  select raw_app_meta_data->>'role' into target_role from auth.users where id = target_user_id;
  if target_role not in ('admin', 'staff') then raise exception 'Assigned user must be staff or admin'; end if;
  if target_is_active and target_assignment_role = 'primary' then
    update public.supplier_operations_assignments
    set is_active = false, updated_at = now(), updated_by = auth.uid()
    where supplier_id = target_supplier_id and is_active and assignment_role = 'primary' and user_id <> target_user_id;
  end if;
  insert into public.supplier_operations_assignments (
    supplier_id, user_id, assignment_role, is_active, created_by, updated_by
  ) values (
    target_supplier_id, target_user_id, target_assignment_role, target_is_active, auth.uid(), auth.uid()
  )
  on conflict (supplier_id, user_id) do update set
    assignment_role = excluded.assignment_role,
    is_active = excluded.is_active,
    updated_at = now(),
    updated_by = auth.uid()
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.disable_supplier_telegram_channel(target_channel_id uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare saved_supplier_id uuid;
begin
  if not public.is_admin() then raise exception 'Disabling Telegram requires admin'; end if;
  if char_length(btrim(coalesce(target_reason, ''))) not between 2 and 500 then raise exception 'Disable reason is required'; end if;
  update public.supplier_communication_channels
  set status = 'disabled', is_primary = false, disabled_at = now(), updated_at = now(), updated_by = auth.uid(),
      last_error_code = 'disabled_by_admin', last_error_summary = btrim(target_reason)
  where id = target_channel_id and status <> 'disabled'
  returning supplier_id into saved_supplier_id;
  if saved_supplier_id is null then raise exception 'Active Telegram channel not found'; end if;
  update public.communication_outbox
  set status = 'cancelled', claimed_at = null, claim_token = null, claimed_by = null,
      last_error_code = 'channel_disabled', last_error_summary = 'Kênh đã được Admin tắt.'
  where channel_id = target_channel_id and status in ('pending', 'retry', 'processing');
end;
$$;

create or replace function public.phase12_enqueue_outbox(
  target_supplier_id uuid,
  target_channel_id uuid,
  target_booking_id uuid,
  target_booking_item_id uuid,
  target_confirmation_id uuid,
  target_message_type text,
  target_dedupe_key text,
  target_payload jsonb,
  target_source_update_id bigint default null,
  target_max_attempts integer default 3,
  target_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare saved_id uuid;
begin
  if target_message_type not in ('confirmation_request', 'confirmation_follow_up', 'connection_ack', 'command_reply', 'test')
    or jsonb_typeof(target_payload) <> 'object' then raise exception 'Invalid outbox payload'; end if;
  insert into public.communication_outbox (
    supplier_id, channel_id, booking_id, booking_item_id, confirmation_id,
    message_type, dedupe_key, payload, source_update_id, max_attempts, created_by
  ) values (
    target_supplier_id, target_channel_id, target_booking_id, target_booking_item_id, target_confirmation_id,
    target_message_type, target_dedupe_key, target_payload, target_source_update_id,
    least(greatest(target_max_attempts, 1), 5), target_created_by
  )
  on conflict (dedupe_key) do update set dedupe_key = excluded.dedupe_key
  returning id into saved_id;
  return saved_id;
end;
$$;

revoke all on function public.phase12_enqueue_outbox(uuid,uuid,uuid,uuid,uuid,text,text,jsonb,bigint,integer,uuid) from public, anon, authenticated;

create or replace function public.connect_supplier_telegram_group(
  target_code text,
  target_update_id bigint,
  target_chat_id bigint,
  target_chat_type text,
  target_chat_title text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text := upper(btrim(coalesce(target_code, '')));
  code_row record;
  existing_channel record;
  saved_channel_id uuid;
  saved_outbox_id uuid;
  supplier_name text;
begin
  if target_update_id < 1 or target_chat_id >= 0 or target_chat_type not in ('group', 'supergroup') then
    return jsonb_build_object('outcome', 'rejected', 'message', 'Nhóm Telegram không hợp lệ.');
  end if;
  if normalized_code !~ '^TXC-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$' then
    return jsonb_build_object('outcome', 'rejected', 'message', 'Mã kết nối không hợp lệ hoặc đã hết hạn.');
  end if;
  if exists(select 1 from public.telegram_update_receipts where update_id = target_update_id) then
    return jsonb_build_object('outcome', 'duplicate', 'message', 'Yêu cầu này đã được xử lý.');
  end if;
  select saved.*, supplier.display_name as supplier_name, supplier.status as supplier_status
  into code_row
  from public.telegram_connection_codes saved
  join public.suppliers supplier on supplier.id = saved.supplier_id
  where saved.code_hash = public.phase12_hash_token(normalized_code)
  for update of saved;
  if not found or code_row.status <> 'pending' or code_row.supplier_status in ('inactive', 'archived') then
    return jsonb_build_object('outcome', 'rejected', 'message', 'Mã kết nối không hợp lệ hoặc đã hết hạn.');
  end if;
  if code_row.expires_at <= now() then
    update public.telegram_connection_codes set status = 'expired' where id = code_row.id;
    return jsonb_build_object('outcome', 'stale', 'message', 'Mã kết nối đã hết hạn. Hãy tạo mã mới trong Admin.');
  end if;

  select * into existing_channel
  from public.supplier_communication_channels
  where telegram_chat_id = target_chat_id
  for update;
  if found and existing_channel.supplier_id <> code_row.supplier_id then
    return jsonb_build_object('outcome', 'rejected', 'message', 'Nhóm này đã thuộc một nhà cung cấp khác.');
  end if;

  update public.supplier_communication_channels
  set status = 'disabled', is_primary = false, disabled_at = now(), updated_at = now(),
      last_error_code = 'reconnected', last_error_summary = 'Được thay bởi một kết nối nhóm mới.'
  where supplier_id = code_row.supplier_id
    and is_primary and status in ('active', 'error')
    and telegram_chat_id <> target_chat_id;

  if existing_channel.id is not null then
    update public.supplier_communication_channels
    set telegram_chat_type = target_chat_type,
        telegram_chat_title = nullif(left(btrim(coalesce(target_chat_title, '')), 255), ''),
        status = 'active', is_primary = true, connected_at = now(), verified_at = now(), disabled_at = null,
        consecutive_failures = 0, last_error_code = null, last_error_summary = null, updated_at = now()
    where id = existing_channel.id
    returning id into saved_channel_id;
  else
    insert into public.supplier_communication_channels (
      supplier_id, telegram_chat_id, telegram_chat_type, telegram_chat_title, status, is_primary
    ) values (
      code_row.supplier_id, target_chat_id, target_chat_type,
      nullif(left(btrim(coalesce(target_chat_title, '')), 255), ''), 'active', true
    ) returning id into saved_channel_id;
  end if;

  update public.telegram_connection_codes
  set status = 'used', used_at = now(), used_channel_id = saved_channel_id
  where id = code_row.id;
  insert into public.telegram_update_receipts (update_id, update_type, telegram_chat_id, payload_hash, outcome)
  values (target_update_id, 'connect', target_chat_id, public.phase12_hash_token(normalized_code), 'processed');

  supplier_name := code_row.supplier_name;
  saved_outbox_id := public.phase12_enqueue_outbox(
    code_row.supplier_id, saved_channel_id, null, null, null,
    'connection_ack', 'telegram-connect-' || target_update_id::text,
    jsonb_build_object('supplier_name', supplier_name, 'command', 'connect_ack'),
    target_update_id, 1, null
  );
  return jsonb_build_object(
    'outcome', 'connected', 'message', 'Kết nối nhóm thành công.',
    'supplier_name', supplier_name, 'channel_id', saved_channel_id, 'outbox_id', saved_outbox_id
  );
exception when unique_violation then
  return jsonb_build_object('outcome', 'duplicate', 'message', 'Yêu cầu này đã được xử lý.');
end;
$$;

create or replace function public.queue_telegram_command_reply(
  target_update_id bigint,
  target_chat_id bigint,
  target_command text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare channel_row record; saved_outbox_id uuid;
begin
  if target_update_id < 1 or target_chat_id >= 0 or target_command not in ('status', 'help') then
    return jsonb_build_object('outcome', 'rejected');
  end if;
  if exists(select 1 from public.telegram_update_receipts where update_id = target_update_id) then
    return jsonb_build_object('outcome', 'duplicate');
  end if;
  select channel.*, supplier.display_name as supplier_name into channel_row
  from public.supplier_communication_channels channel
  join public.suppliers supplier on supplier.id = channel.supplier_id
  where channel.telegram_chat_id = target_chat_id and channel.status = 'active' and channel.is_primary
  for update of channel;
  if not found then return jsonb_build_object('outcome', 'not_connected'); end if;
  insert into public.telegram_update_receipts (update_id, update_type, telegram_chat_id, outcome)
  values (target_update_id, 'command', target_chat_id, 'processed');
  saved_outbox_id := public.phase12_enqueue_outbox(
    channel_row.supplier_id, channel_row.id, null, null, null,
    'command_reply', 'telegram-command-' || target_update_id::text,
    jsonb_build_object(
      'command', target_command,
      'supplier_name', channel_row.supplier_name,
      'channel_status', channel_row.status,
      'last_success_at', channel_row.last_success_at
    ), target_update_id, 1, null
  );
  return jsonb_build_object('outcome', 'queued', 'outbox_id', saved_outbox_id);
exception when unique_violation then
  return jsonb_build_object('outcome', 'duplicate');
end;
$$;

create or replace function public.claim_telegram_webhook_reply(
  target_outbox_id uuid,
  target_update_id bigint,
  target_chat_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare outbox_row record; saved_claim uuid := gen_random_uuid();
begin
  select outbox.*, channel.telegram_chat_id into outbox_row
  from public.communication_outbox outbox
  join public.supplier_communication_channels channel on channel.id = outbox.channel_id
  where outbox.id = target_outbox_id
    and outbox.source_update_id = target_update_id
    and channel.telegram_chat_id = target_chat_id
    and outbox.message_type in ('connection_ack', 'command_reply')
  for update of outbox;
  if not found or outbox_row.status not in ('pending', 'retry') or outbox_row.attempt_count >= outbox_row.max_attempts then
    return null;
  end if;
  update public.communication_outbox set
    status = 'processing', attempt_count = attempt_count + 1,
    claimed_at = now(), claim_token = saved_claim, claimed_by = null
  where id = target_outbox_id;
  return jsonb_build_object(
    'outbox_id', outbox_row.id, 'claim_token', saved_claim,
    'chat_id', target_chat_id, 'message_type', outbox_row.message_type, 'payload', outbox_row.payload
  );
end;
$$;

create or replace function public.complete_telegram_webhook_reply(
  target_outbox_id uuid,
  target_claim_token uuid,
  target_accepted boolean,
  target_telegram_message_id bigint,
  target_response_code integer,
  target_error_code text,
  target_response_summary text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare outbox_row record; next_status text;
begin
  select * into outbox_row from public.communication_outbox
  where id = target_outbox_id and status = 'processing' and claim_token = target_claim_token
    and source_update_id is not null and message_type in ('connection_ack', 'command_reply')
  for update;
  if not found then return; end if;
  next_status := case when target_accepted then 'sent' else 'failed' end;
  update public.communication_outbox set
    status = next_status, sent_at = case when target_accepted then now() else null end,
    telegram_message_id = case when target_accepted then target_telegram_message_id else null end,
    claimed_at = null, claim_token = null,
    last_error_code = case when target_accepted then null else left(nullif(btrim(target_error_code), ''), 80) end,
    last_error_summary = case when target_accepted then null else left(nullif(btrim(target_response_summary), ''), 500) end
  where id = outbox_row.id;
  insert into public.communication_delivery_logs (
    outbox_id, channel_id, attempt_number, outcome, telegram_response_code, error_code, response_summary
  ) values (
    outbox_row.id, outbox_row.channel_id, outbox_row.attempt_count,
    case when target_accepted then 'accepted' else 'failed' end,
    target_response_code, left(nullif(btrim(target_error_code), ''), 80), left(nullif(btrim(target_response_summary), ''), 500)
  ) on conflict (outbox_id, attempt_number) do nothing;
  update public.supplier_communication_channels set
    last_success_at = case when target_accepted then now() else last_success_at end,
    last_failure_at = case when target_accepted then last_failure_at else now() end,
    consecutive_failures = case when target_accepted then 0 else consecutive_failures + 1 end,
    last_error_code = case when target_accepted then null else left(nullif(btrim(target_error_code), ''), 80) end,
    last_error_summary = case when target_accepted then null else left(nullif(btrim(target_response_summary), ''), 500) end,
    updated_at = now()
  where id = outbox_row.channel_id;
end;
$$;

create or replace function public.phase12_apply_confirmation_transition(
  target_booking_item_id uuid,
  target_status text,
  target_note text,
  target_external_reference text,
  target_expires_at timestamptz,
  target_expected_updated_at timestamptz,
  target_actor_type text,
  target_actor_user_id uuid,
  target_source text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmation_row record;
  booking_uuid uuid;
  next_requested_at timestamptz;
  next_due_at timestamptz;
begin
  if target_actor_type not in ('staff', 'admin', 'supplier') then raise exception 'Invalid confirmation actor'; end if;
  if target_source not in ('admin', 'telegram') then raise exception 'Invalid confirmation source'; end if;
  if target_status not in ('requested', 'confirmed', 'declined', 'expired', 'cancelled') then raise exception 'Invalid confirmation status'; end if;
  if target_expected_updated_at is null then raise exception 'Confirmation revision is required'; end if;
  if target_note is not null and char_length(target_note) > 5000 then raise exception 'Confirmation note is too long'; end if;
  if target_external_reference is not null and char_length(target_external_reference) > 500 then raise exception 'Confirmation reference is too long'; end if;
  if target_expires_at is not null and target_expires_at <= now() and target_status not in ('expired', 'cancelled') then
    raise exception 'Confirmation expiry must be in the future';
  end if;
  select confirmation.*, item.booking_id, item.operational_status
  into confirmation_row
  from public.booking_item_confirmations confirmation
  join public.booking_items item on item.id = confirmation.booking_item_id
  where confirmation.booking_item_id = target_booking_item_id
  for update of confirmation;
  if not found then raise exception 'Confirmation not found'; end if;
  if confirmation_row.updated_at is distinct from target_expected_updated_at then raise exception 'Booking changed; reload before continuing'; end if;
  if confirmation_row.operational_status <> 'active' then raise exception 'Inactive Booking Item cannot be confirmed'; end if;
  if confirmation_row.status in ('declined', 'expired', 'cancelled') then raise exception 'Terminal supplier response is immutable'; end if;
  if target_status = 'requested' and confirmation_row.status not in ('pending', 'requested') then raise exception 'Confirmed response cannot return to requested'; end if;

  next_requested_at := case when target_status = 'requested' then coalesce(confirmation_row.requested_at, now()) else confirmation_row.requested_at end;
  next_due_at := case when target_status = 'requested' then coalesce(confirmation_row.due_at, next_requested_at + interval '4 hours') else confirmation_row.due_at end;
  if confirmation_row.status = target_status
    and confirmation_row.expires_at is not distinct from target_expires_at
    and confirmation_row.external_reference is not distinct from nullif(btrim(target_external_reference), '')
    and confirmation_row.response_note_internal is not distinct from nullif(btrim(target_note), '') then return; end if;

  booking_uuid := confirmation_row.booking_id;
  insert into public.booking_confirmation_events (
    booking_id, booking_item_id, confirmation_id, previous_status, next_status,
    requested_at_snapshot, due_at_snapshot, responded_at_snapshot, expires_at_snapshot,
    reminder_count_snapshot, external_reference_snapshot, response_note_snapshot,
    supplier_snapshot, reason, actor_type, actor_user_id
  ) values (
    booking_uuid, target_booking_item_id, confirmation_row.id, confirmation_row.status, target_status,
    confirmation_row.requested_at, confirmation_row.due_at, confirmation_row.responded_at, confirmation_row.expires_at,
    confirmation_row.reminder_count, confirmation_row.external_reference, confirmation_row.response_note_internal,
    confirmation_row.supplier_snapshot, nullif(btrim(target_note), ''), target_actor_type, target_actor_user_id
  );
  update public.booking_item_confirmations set
    status = target_status,
    requested_at = next_requested_at,
    due_at = next_due_at,
    responded_at = case when target_status in ('confirmed', 'declined', 'expired', 'cancelled') then now() else null end,
    expires_at = target_expires_at,
    external_reference = nullif(btrim(target_external_reference), ''),
    response_note_internal = nullif(btrim(target_note), ''),
    updated_at = now(),
    updated_by = target_actor_user_id
  where id = confirmation_row.id;
  update public.booking_items set confirmation_status = target_status where id = target_booking_item_id;
  perform public.phase8_recompute_confirmation(booking_uuid);
  perform public.phase9_sync_checkout_state(booking_uuid);
  insert into public.booking_events (
    booking_id, booking_item_id, event_type, public_message, internal_detail, actor_type, actor_user_id
  ) values (
    booking_uuid, target_booking_item_id, 'supplier_confirmation_' || target_status,
    case target_status
      when 'requested' then 'Đang chờ nhà cung cấp phản hồi cho một dịch vụ.'
      when 'confirmed' then 'Một dịch vụ đã được xác nhận.'
      when 'declined' then 'Một dịch vụ không thể xác nhận.'
      when 'expired' then 'Một xác nhận dịch vụ đã hết hiệu lực.'
      else 'Một yêu cầu xác nhận dịch vụ đã được hủy.'
    end,
    jsonb_build_object(
      'external_reference', nullif(btrim(target_external_reference), ''),
      'due_at', next_due_at,
      'operations_policy_version', 'phase11-operations-v1',
      'communication_source', target_source
    ), target_actor_type, target_actor_user_id
  );
end;
$$;

revoke all on function public.phase12_apply_confirmation_transition(uuid,text,text,text,timestamptz,timestamptz,text,uuid,text) from public, anon, authenticated;

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
declare actor text;
begin
  if not public.is_staff_or_admin() then raise exception 'Supplier confirmation requires staff'; end if;
  actor := case when public.is_admin() then 'admin' else 'staff' end;
  perform public.phase12_apply_confirmation_transition(
    target_booking_item_id, target_status, target_note, target_external_reference,
    target_expires_at, target_expected_updated_at, actor, auth.uid(), 'admin'
  );
end;
$$;

create or replace function public.dispatch_supplier_confirmation_telegram(
  target_confirmation_id uuid,
  target_expected_confirmation_updated_at timestamptz,
  target_expected_booking_revision bigint,
  target_dispatch_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmation_row record;
  channel_row record;
  refreshed_confirmation record;
  refreshed_revision bigint;
  action_expiry timestamptz := now() + interval '4 hours';
  confirm_token text := encode(extensions.gen_random_bytes(24), 'hex');
  decline_token text := encode(extensions.gen_random_bytes(24), 'hex');
  discuss_token text := encode(extensions.gen_random_bytes(24), 'hex');
  saved_outbox_id uuid;
  saved_message_type text;
begin
  if not public.is_staff_or_admin() then raise exception 'Telegram dispatch requires staff'; end if;
  if target_dispatch_mode not in ('initial', 'follow_up') then raise exception 'Invalid Telegram dispatch mode'; end if;
  select confirmation.*, item.booking_id, item.id as item_id, item.operational_status,
    item.display_name_snapshot, item.parent_name_snapshot, item.service_from, item.service_until, item.quantity,
    booking.booking_code, booking.adults, booking.children, booking.rooms, booking.lifecycle_status,
    booking.operations_revision
  into confirmation_row
  from public.booking_item_confirmations confirmation
  join public.booking_items item on item.id = confirmation.booking_item_id
  join public.bookings booking on booking.id = item.booking_id
  where confirmation.id = target_confirmation_id
  for update of confirmation, booking;
  if not found then raise exception 'Supplier confirmation not found'; end if;
  if confirmation_row.operations_revision <> target_expected_booking_revision
    or confirmation_row.updated_at is distinct from target_expected_confirmation_updated_at then
    raise exception 'Booking changed; reload before continuing';
  end if;
  if confirmation_row.operational_status <> 'active' or confirmation_row.lifecycle_status not in ('submitted', 'active') then
    raise exception 'Only an active Booking Item can be dispatched';
  end if;
  if confirmation_row.supplier_id is null then raise exception 'Supplier mapping is required before Telegram dispatch'; end if;
  select * into channel_row from public.supplier_communication_channels
  where supplier_id = confirmation_row.supplier_id and is_primary and status = 'active'
  for update;
  if not found then raise exception 'Active Supplier Telegram group is required'; end if;

  if target_dispatch_mode = 'initial' then
    if confirmation_row.status <> 'pending' then raise exception 'Only a pending confirmation can be initially dispatched'; end if;
    perform public.update_supplier_confirmation_v2(
      confirmation_row.item_id, 'requested', confirmation_row.response_note_internal,
      confirmation_row.external_reference, confirmation_row.expires_at, confirmation_row.updated_at
    );
    saved_message_type := 'confirmation_request';
  else
    if confirmation_row.status <> 'requested' then raise exception 'Only a requested confirmation can be followed up'; end if;
    perform public.follow_up_supplier_confirmation(
      confirmation_row.id, confirmation_row.updated_at, 'Nhắc lại qua nhóm Telegram của Supplier.'
    );
    saved_message_type := 'confirmation_follow_up';
  end if;

  select confirmation.*, booking.operations_revision into refreshed_confirmation
  from public.booking_item_confirmations confirmation
  join public.booking_items item on item.id = confirmation.booking_item_id
  join public.bookings booking on booking.id = item.booking_id
  where confirmation.id = target_confirmation_id;
  refreshed_revision := refreshed_confirmation.operations_revision;
  if refreshed_confirmation.expires_at is not null and refreshed_confirmation.expires_at > now()
    and refreshed_confirmation.expires_at < action_expiry then action_expiry := refreshed_confirmation.expires_at; end if;
  if action_expiry <= now() + interval '5 minutes' then action_expiry := now() + interval '5 minutes'; end if;

  update public.telegram_actions set status = 'rejected', response_snapshot = jsonb_build_object('reason', 'superseded_by_new_dispatch')
  where confirmation_id = target_confirmation_id and status = 'pending';
  insert into public.telegram_actions (
    token_hash, supplier_id, channel_id, booking_id, booking_item_id, confirmation_id,
    action_type, expected_booking_revision, expected_confirmation_updated_at, expires_at, created_by
  ) values
    (public.phase12_hash_token(confirm_token), confirmation_row.supplier_id, channel_row.id, confirmation_row.booking_id,
      confirmation_row.item_id, confirmation_row.id, 'CONFIRM', refreshed_revision, refreshed_confirmation.updated_at, action_expiry, auth.uid()),
    (public.phase12_hash_token(decline_token), confirmation_row.supplier_id, channel_row.id, confirmation_row.booking_id,
      confirmation_row.item_id, confirmation_row.id, 'DECLINE', refreshed_revision, refreshed_confirmation.updated_at, action_expiry, auth.uid()),
    (public.phase12_hash_token(discuss_token), confirmation_row.supplier_id, channel_row.id, confirmation_row.booking_id,
      confirmation_row.item_id, confirmation_row.id, 'NEED_DISCUSSION', refreshed_revision, refreshed_confirmation.updated_at, action_expiry, auth.uid());

  saved_outbox_id := public.phase12_enqueue_outbox(
    confirmation_row.supplier_id, channel_row.id, confirmation_row.booking_id, confirmation_row.item_id,
    confirmation_row.id, saved_message_type,
    'telegram-confirmation-' || confirmation_row.id::text || '-' || target_dispatch_mode || '-'
      || extract(epoch from refreshed_confirmation.updated_at)::text,
    jsonb_build_object(
      'booking_code', confirmation_row.booking_code,
      'item_name', confirmation_row.display_name_snapshot,
      'parent_name', confirmation_row.parent_name_snapshot,
      'service_from', confirmation_row.service_from,
      'service_until', confirmation_row.service_until,
      'quantity', confirmation_row.quantity,
      'party', jsonb_build_object('adults', confirmation_row.adults, 'children', confirmation_row.children, 'rooms', confirmation_row.rooms),
      'dispatch_mode', target_dispatch_mode,
      'action_expires_at', action_expiry,
      'callback_tokens', jsonb_build_object('CONFIRM', confirm_token, 'DECLINE', decline_token, 'NEED_DISCUSSION', discuss_token)
    ), null, 3, auth.uid()
  );
  return jsonb_build_object('outbox_id', saved_outbox_id, 'status', 'queued', 'action_expires_at', action_expiry);
end;
$$;

create or replace function public.queue_supplier_telegram_test(
  target_channel_id uuid,
  target_owner_authorization text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare channel_row record;
begin
  if not public.is_admin() then raise exception 'Telegram test messages require admin'; end if;
  if target_owner_authorization <> 'OWNER_AUTHORIZED_TELEGRAM_TEST' then raise exception 'Explicit owner authorization is required'; end if;
  select channel.*, supplier.display_name as supplier_name into channel_row
  from public.supplier_communication_channels channel
  join public.suppliers supplier on supplier.id = channel.supplier_id
  where channel.id = target_channel_id and channel.status = 'active' and channel.is_primary
  for update of channel;
  if not found then raise exception 'Active Telegram channel not found'; end if;
  return public.phase12_enqueue_outbox(
    channel_row.supplier_id, channel_row.id, null, null, null, 'test',
    'telegram-test-' || gen_random_uuid()::text,
    jsonb_build_object('supplier_name', channel_row.supplier_name, 'requested_at', now()),
    null, 1, auth.uid()
  );
end;
$$;

create or replace function public.resolve_telegram_supplier_discussion(
  target_action_id uuid,
  target_expected_booking_revision bigint,
  target_resolution_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare action_row record; actor text;
begin
  if not public.is_staff_or_admin() then raise exception 'Telegram discussion resolution requires staff'; end if;
  if char_length(btrim(coalesce(target_resolution_note, ''))) not between 2 and 500 then raise exception 'Resolution note is required'; end if;
  select telegram_action.*, booking.operations_revision into action_row
  from public.telegram_actions telegram_action
  join public.bookings booking on booking.id = telegram_action.booking_id
  where telegram_action.id = target_action_id for update of telegram_action, booking;
  if not found or action_row.action_type <> 'NEED_DISCUSSION' or action_row.status <> 'used'
    or action_row.discussion_resolved_at is not null then raise exception 'Open Telegram discussion not found'; end if;
  if action_row.operations_revision <> target_expected_booking_revision then raise exception 'Booking changed; reload before continuing'; end if;
  actor := case when public.is_admin() then 'admin' else 'staff' end;
  update public.telegram_actions set discussion_resolved_at = now(), discussion_resolved_by = auth.uid(),
    response_snapshot = response_snapshot || jsonb_build_object('resolution_note', btrim(target_resolution_note))
  where id = target_action_id;
  insert into public.booking_events (booking_id, booking_item_id, event_type, public_message, internal_detail, actor_type, actor_user_id)
  values (action_row.booking_id, action_row.booking_item_id, 'supplier_discussion_resolved', null,
    jsonb_build_object('telegram_action_id', target_action_id, 'note', btrim(target_resolution_note)), actor, auth.uid());
end;
$$;

create or replace function public.process_telegram_supplier_callback(
  target_update_id bigint,
  target_chat_id bigint,
  target_callback_query_hash text,
  target_action_token text,
  target_message_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_row record;
  confirmation_row record;
  booking_revision bigint;
  item_status text;
  booking_status text;
begin
  if target_update_id < 1 or target_chat_id >= 0
    or target_callback_query_hash !~ '^[a-f0-9]{64}$'
    or target_action_token !~ '^[a-f0-9]{48}$' then
    return jsonb_build_object('outcome', 'rejected', 'message', 'Thao tác không còn hợp lệ.');
  end if;
  select telegram_action.*, channel.telegram_chat_id, channel.status as channel_status,
    channel.is_primary, confirmation.supplier_id as confirmation_supplier_id,
    confirmation.updated_at as confirmation_updated_at, confirmation.status as confirmation_status,
    item.operational_status, booking.lifecycle_status, booking.operations_revision
  into action_row
  from public.telegram_actions telegram_action
  join public.supplier_communication_channels channel on channel.id = telegram_action.channel_id
  join public.booking_item_confirmations confirmation on confirmation.id = telegram_action.confirmation_id
  join public.booking_items item on item.id = telegram_action.booking_item_id
  join public.bookings booking on booking.id = telegram_action.booking_id
  where telegram_action.token_hash = public.phase12_hash_token(target_action_token)
  for update of telegram_action, confirmation, booking;
  if not found or action_row.telegram_chat_id <> target_chat_id
    or action_row.channel_status <> 'active' or not action_row.is_primary
    or action_row.confirmation_supplier_id is distinct from action_row.supplier_id then
    return jsonb_build_object('outcome', 'rejected', 'message', 'Thao tác không còn hợp lệ.');
  end if;
  if exists(select 1 from public.telegram_update_receipts where update_id = target_update_id) then
    return jsonb_build_object('outcome', 'duplicate', 'message', 'Phản hồi này đã được ghi nhận.');
  end if;
  if action_row.status = 'used' then
    insert into public.telegram_update_receipts (update_id, update_type, telegram_chat_id, payload_hash, outcome)
    values (target_update_id, 'callback', target_chat_id, target_callback_query_hash, 'duplicate');
    return jsonb_build_object('outcome', 'duplicate', 'message', 'Phản hồi này đã được ghi nhận.');
  end if;
  if action_row.status <> 'pending' or action_row.expires_at <= now() then
    update public.telegram_actions set status = case when action_row.expires_at <= now() then 'expired' else 'rejected' end,
      response_snapshot = jsonb_build_object('reason', 'action_expired_or_superseded') where id = action_row.id;
    insert into public.telegram_update_receipts (update_id, update_type, telegram_chat_id, payload_hash, outcome)
    values (target_update_id, 'callback', target_chat_id, target_callback_query_hash, 'stale');
    return jsonb_build_object('outcome', 'stale', 'message', 'Yêu cầu đã thay đổi hoặc hết hạn. Vui lòng liên hệ nhân viên phụ trách.');
  end if;
  if action_row.operations_revision <> action_row.expected_booking_revision
    or action_row.confirmation_updated_at is distinct from action_row.expected_confirmation_updated_at
    or action_row.operational_status <> 'active'
    or action_row.lifecycle_status not in ('submitted', 'active')
    or action_row.confirmation_status <> 'requested'
    or (select expires_at from public.booking_item_confirmations where id = action_row.confirmation_id) <= now() then
    update public.telegram_actions set status = 'rejected',
      response_snapshot = jsonb_build_object('reason', 'stale_booking_or_confirmation') where id = action_row.id;
    insert into public.telegram_update_receipts (update_id, update_type, telegram_chat_id, payload_hash, outcome)
    values (target_update_id, 'callback', target_chat_id, target_callback_query_hash, 'stale');
    return jsonb_build_object('outcome', 'stale', 'message', 'Yêu cầu đã thay đổi hoặc hết hạn. Vui lòng liên hệ nhân viên phụ trách.');
  end if;

  select * into confirmation_row from public.booking_item_confirmations
  where id = action_row.confirmation_id for update;
  select operations_revision, lifecycle_status into booking_revision, booking_status
  from public.bookings where id = action_row.booking_id for update;
  select operational_status into item_status from public.booking_items where id = action_row.booking_item_id;
  if booking_revision <> action_row.expected_booking_revision or booking_status not in ('submitted', 'active')
    or item_status <> 'active' or confirmation_row.updated_at is distinct from action_row.expected_confirmation_updated_at
    or confirmation_row.status <> 'requested' then
    update public.telegram_actions set status = 'rejected',
      response_snapshot = jsonb_build_object('reason', 'stale_after_lock') where id = action_row.id;
    insert into public.telegram_update_receipts (update_id, update_type, telegram_chat_id, payload_hash, outcome)
    values (target_update_id, 'callback', target_chat_id, target_callback_query_hash, 'stale');
    return jsonb_build_object('outcome', 'stale', 'message', 'Yêu cầu đã thay đổi hoặc hết hạn. Vui lòng liên hệ nhân viên phụ trách.');
  end if;

  if action_row.action_type in ('CONFIRM', 'DECLINE') then
    perform public.phase12_apply_confirmation_transition(
      action_row.booking_item_id,
      case when action_row.action_type = 'CONFIRM' then 'confirmed' else 'declined' end,
      case when action_row.action_type = 'CONFIRM'
        then 'Nhà cung cấp xác nhận qua Telegram.' else 'Nhà cung cấp từ chối qua Telegram.' end,
      confirmation_row.external_reference, confirmation_row.expires_at,
      confirmation_row.updated_at, 'supplier', null, 'telegram'
    );
  else
    insert into public.booking_confirmation_events (
      booking_id, booking_item_id, confirmation_id, previous_status, next_status,
      requested_at_snapshot, due_at_snapshot, responded_at_snapshot, expires_at_snapshot,
      reminder_count_snapshot, external_reference_snapshot, response_note_snapshot,
      supplier_snapshot, reason, actor_type
    ) values (
      action_row.booking_id, action_row.booking_item_id, action_row.confirmation_id, 'requested', 'requested',
      confirmation_row.requested_at, confirmation_row.due_at, confirmation_row.responded_at, confirmation_row.expires_at,
      confirmation_row.reminder_count, confirmation_row.external_reference, confirmation_row.response_note_internal,
      confirmation_row.supplier_snapshot, 'Nhà cung cấp cần trao đổi thêm qua Telegram.', 'supplier'
    );
    insert into public.booking_events (
      booking_id, booking_item_id, event_type, public_message, internal_detail, actor_type
    ) values (
      action_row.booking_id, action_row.booking_item_id, 'supplier_needs_discussion', null,
      jsonb_build_object('telegram_action_id', action_row.id, 'communication_source', 'telegram'), 'supplier'
    );
  end if;

  update public.telegram_actions set status = 'rejected',
    response_snapshot = jsonb_build_object('reason', 'sibling_action_completed')
  where confirmation_id = action_row.confirmation_id and status = 'pending' and id <> action_row.id;
  update public.telegram_actions set status = 'used', used_at = now(), used_update_id = target_update_id,
    response_snapshot = jsonb_build_object(
      'action', action_row.action_type,
      'telegram_message_id', target_message_id,
      'source', 'telegram_callback'
    ) where id = action_row.id;
  insert into public.telegram_update_receipts (update_id, update_type, telegram_chat_id, payload_hash, outcome)
  values (target_update_id, 'callback', target_chat_id, target_callback_query_hash, 'processed');
  return jsonb_build_object(
    'outcome', 'processed',
    'action', action_row.action_type,
    'message', case action_row.action_type
      when 'CONFIRM' then 'Đã ghi nhận xác nhận.'
      when 'DECLINE' then 'Đã ghi nhận từ chối.'
      else 'Đã báo đội Tà Xùa Trip liên hệ trao đổi.' end
  );
exception when unique_violation then
  return jsonb_build_object('outcome', 'duplicate', 'message', 'Phản hồi này đã được ghi nhận.');
end;
$$;

create or replace function public.claim_telegram_outbox(target_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare outbox_row record; saved_claim uuid; result jsonb := '[]'::jsonb; bounded_limit integer;
begin
  if not public.is_staff_or_admin() then raise exception 'Telegram outbox worker requires staff'; end if;
  bounded_limit := least(greatest(coalesce(target_limit, 10), 1), 25);
  for outbox_row in
    select outbox.*, channel.telegram_chat_id, channel.telegram_chat_type, channel.status as channel_status
    from public.communication_outbox outbox
    join public.supplier_communication_channels channel on channel.id = outbox.channel_id
    where (
      (outbox.status in ('pending', 'retry') and outbox.next_attempt_at <= now())
      or (outbox.status = 'processing' and outbox.claimed_at <= now() - interval '5 minutes')
    )
      and outbox.attempt_count < outbox.max_attempts
      and channel.status = 'active'
      and outbox.source_update_id is null
    order by outbox.next_attempt_at, outbox.created_at, outbox.id
    for update of outbox skip locked
    limit bounded_limit
  loop
    saved_claim := gen_random_uuid();
    update public.communication_outbox set
      status = 'processing', attempt_count = attempt_count + 1,
      claimed_at = now(), claim_token = saved_claim, claimed_by = auth.uid()
    where id = outbox_row.id;
    result := result || jsonb_build_array(jsonb_build_object(
      'outbox_id', outbox_row.id, 'claim_token', saved_claim,
      'supplier_id', outbox_row.supplier_id, 'channel_id', outbox_row.channel_id,
      'chat_id', outbox_row.telegram_chat_id, 'chat_type', outbox_row.telegram_chat_type,
      'message_type', outbox_row.message_type, 'payload', outbox_row.payload,
      'attempt_number', outbox_row.attempt_count + 1, 'max_attempts', outbox_row.max_attempts
    ));
  end loop;
  return result;
end;
$$;

create or replace function public.complete_telegram_outbox(
  target_outbox_id uuid,
  target_claim_token uuid,
  target_accepted boolean,
  target_telegram_message_id bigint,
  target_response_code integer,
  target_error_code text,
  target_response_summary text,
  target_retryable boolean,
  target_retry_after_seconds integer default null,
  target_migrate_to_chat_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare outbox_row record; next_status text; retry_seconds integer; channel_failures integer;
begin
  if not public.is_staff_or_admin() then raise exception 'Telegram outbox completion requires staff'; end if;
  select * into outbox_row from public.communication_outbox
  where id = target_outbox_id and status = 'processing' and claim_token = target_claim_token and claimed_by = auth.uid()
  for update;
  if not found then return jsonb_build_object('outcome', 'stale_claim'); end if;
  if target_accepted and (target_telegram_message_id is null or target_telegram_message_id < 1) then
    raise exception 'Accepted Telegram delivery requires a message id';
  end if;
  if target_migrate_to_chat_id is not null then
    if target_migrate_to_chat_id >= 0 then raise exception 'Migrated Telegram chat must be a group'; end if;
    if exists(select 1 from public.supplier_communication_channels where telegram_chat_id = target_migrate_to_chat_id and id <> outbox_row.channel_id) then
      raise exception 'Migrated Telegram chat is already mapped';
    end if;
    update public.supplier_communication_channels
    set telegram_chat_id = target_migrate_to_chat_id, telegram_chat_type = 'supergroup', updated_at = now(), updated_by = auth.uid()
    where id = outbox_row.channel_id;
  end if;
  retry_seconds := least(greatest(coalesce(target_retry_after_seconds, 30 * (2 ^ greatest(outbox_row.attempt_count - 1, 0))::integer), 15), 3600);
  next_status := case
    when target_accepted then 'sent'
    when target_retryable and outbox_row.attempt_count < outbox_row.max_attempts then 'retry'
    else 'failed' end;
  update public.communication_outbox set
    status = next_status,
    next_attempt_at = case when next_status = 'retry' then now() + make_interval(secs => retry_seconds) else next_attempt_at end,
    sent_at = case when target_accepted then now() else null end,
    telegram_message_id = case when target_accepted then target_telegram_message_id else null end,
    payload = case when next_status in ('sent', 'failed') then payload - 'callback_tokens' else payload end,
    claimed_at = null, claim_token = null, claimed_by = null,
    last_error_code = case when target_accepted then null else left(nullif(btrim(target_error_code), ''), 80) end,
    last_error_summary = case when target_accepted then null else left(nullif(btrim(target_response_summary), ''), 500) end
  where id = outbox_row.id;
  insert into public.communication_delivery_logs (
    outbox_id, channel_id, attempt_number, outcome, telegram_response_code, error_code, response_summary
  ) values (
    outbox_row.id, outbox_row.channel_id, outbox_row.attempt_count,
    case when target_accepted then 'accepted' when next_status = 'retry' then 'retry' else 'failed' end,
    target_response_code, left(nullif(btrim(target_error_code), ''), 80), left(nullif(btrim(target_response_summary), ''), 500)
  ) on conflict (outbox_id, attempt_number) do nothing;
  update public.supplier_communication_channels set
    last_success_at = case when target_accepted then now() else last_success_at end,
    last_failure_at = case when target_accepted then last_failure_at else now() end,
    consecutive_failures = case when target_accepted then 0 else consecutive_failures + 1 end,
    last_error_code = case when target_accepted then null else left(nullif(btrim(target_error_code), ''), 80) end,
    last_error_summary = case when target_accepted then null else left(nullif(btrim(target_response_summary), ''), 500) end,
    updated_at = now(), updated_by = auth.uid()
  where id = outbox_row.channel_id returning consecutive_failures into channel_failures;
  if not target_accepted and next_status = 'failed' and channel_failures >= 3 then
    update public.supplier_communication_channels set status = 'error', updated_at = now(), updated_by = auth.uid()
    where id = outbox_row.channel_id and status = 'active';
  end if;
  return jsonb_build_object('outcome', next_status, 'retry_after_seconds', case when next_status = 'retry' then retry_seconds else null end);
end;
$$;

revoke all on function public.get_telegram_staff_options() from public, anon, authenticated;
revoke all on function public.generate_telegram_connection_code(uuid) from public, anon, authenticated;
revoke all on function public.set_supplier_telegram_assignment(uuid,uuid,text,boolean) from public, anon, authenticated;
revoke all on function public.disable_supplier_telegram_channel(uuid,text) from public, anon, authenticated;
revoke all on function public.connect_supplier_telegram_group(text,bigint,bigint,text,text) from public, anon, authenticated;
revoke all on function public.queue_telegram_command_reply(bigint,bigint,text) from public, anon, authenticated;
revoke all on function public.claim_telegram_webhook_reply(uuid,bigint,bigint) from public, anon, authenticated;
revoke all on function public.complete_telegram_webhook_reply(uuid,uuid,boolean,bigint,integer,text,text) from public, anon, authenticated;
revoke all on function public.update_supplier_confirmation_v2(uuid,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.dispatch_supplier_confirmation_telegram(uuid,timestamptz,bigint,text) from public, anon, authenticated;
revoke all on function public.queue_supplier_telegram_test(uuid,text) from public, anon, authenticated;
revoke all on function public.resolve_telegram_supplier_discussion(uuid,bigint,text) from public, anon, authenticated;
revoke all on function public.process_telegram_supplier_callback(bigint,bigint,text,text,bigint) from public, anon, authenticated;
revoke all on function public.claim_telegram_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_telegram_outbox(uuid,uuid,boolean,bigint,integer,text,text,boolean,integer,bigint) from public, anon, authenticated;

grant execute on function public.get_telegram_staff_options() to authenticated;
grant execute on function public.generate_telegram_connection_code(uuid) to authenticated;
grant execute on function public.set_supplier_telegram_assignment(uuid,uuid,text,boolean) to authenticated;
grant execute on function public.disable_supplier_telegram_channel(uuid,text) to authenticated;
grant execute on function public.update_supplier_confirmation_v2(uuid,text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.dispatch_supplier_confirmation_telegram(uuid,timestamptz,bigint,text) to authenticated;
grant execute on function public.queue_supplier_telegram_test(uuid,text) to authenticated;
grant execute on function public.resolve_telegram_supplier_discussion(uuid,bigint,text) to authenticated;
grant execute on function public.claim_telegram_outbox(integer) to authenticated;
grant execute on function public.complete_telegram_outbox(uuid,uuid,boolean,bigint,integer,text,text,boolean,integer,bigint) to authenticated;

grant execute on function public.connect_supplier_telegram_group(text,bigint,bigint,text,text) to anon, authenticated;
grant execute on function public.queue_telegram_command_reply(bigint,bigint,text) to anon, authenticated;
grant execute on function public.claim_telegram_webhook_reply(uuid,bigint,bigint) to anon, authenticated;
grant execute on function public.complete_telegram_webhook_reply(uuid,uuid,boolean,bigint,integer,text,text) to anon, authenticated;
grant execute on function public.process_telegram_supplier_callback(bigint,bigint,text,text,bigint) to anon, authenticated;

comment on table public.supplier_communication_channels is
  'Private Supplier-to-Telegram group mapping and connection health. Contains no bot token or webhook secret.';
comment on table public.supplier_operations_assignments is
  'Private assignment of existing admin/staff Auth users to Supplier operations teams.';
comment on table public.telegram_connection_codes is
  'Hashed, one-time, short-lived Telegram group onboarding capabilities. Plaintext codes are never stored.';
comment on table public.communication_outbox is
  'Private transactional Telegram outbox. Callback capabilities are redacted after terminal delivery.';
comment on table public.telegram_update_receipts is
  'Minimal Telegram update_id dedupe receipts; no raw Telegram update or message body is stored.';
comment on table public.telegram_actions is
  'Opaque callback capabilities bound to Supplier, chat, Booking Item, Confirmation revision and expiry.';
comment on table public.communication_delivery_logs is
  'Append-only sanitized Telegram delivery attempts. Raw Telegram responses and credentials are excluded.';
comment on function public.connect_supplier_telegram_group(text,bigint,bigint,text,text) is
  'Capability-scoped anonymous onboarding RPC. Requires a valid unused code and group/supergroup chat.';
comment on function public.process_telegram_supplier_callback(bigint,bigint,text,text,bigint) is
  'Capability-scoped Telegram callback RPC with update dedupe, chat ownership, expiry and stale-revision validation.';
comment on function public.dispatch_supplier_confirmation_telegram(uuid,timestamptz,bigint,text) is
  'Authenticated atomic dispatch: reuses Supplier Confirmation truth and enqueues one Supplier-scoped Telegram message.';
comment on function public.claim_telegram_outbox(integer) is
  'Authenticated bounded SKIP LOCKED worker claim. No network call occurs inside the database transaction.';
