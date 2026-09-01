-- Tà Xùa Trip V2 Phase 13B: versioned AI runtime/profile metadata only.
-- Provider credentials remain server-only environment variables. This migration
-- deliberately creates no ACTIVE runtime and performs no provider inference.

create table public.ai_assistant_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_key uuid not null default gen_random_uuid(),
  revision integer not null,
  name text not null,
  status text not null default 'DRAFT',
  role_description text not null,
  persona text not null,
  tone text not null,
  verbosity text not null,
  answer_style text not null,
  language_policy text not null,
  sales_policy text not null,
  uncertainty_policy text not null,
  custom_instructions text not null default '',
  supersedes_id uuid references public.ai_assistant_profiles(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  archived_at timestamptz,
  constraint ai_profile_revision_positive check (revision > 0),
  constraint ai_profile_name_length check (char_length(btrim(name)) between 2 and 80),
  constraint ai_profile_role_length check (char_length(btrim(role_description)) between 10 and 600),
  constraint ai_profile_persona_length check (char_length(btrim(persona)) between 10 and 600),
  constraint ai_profile_tone_allowed check (tone in ('friendly', 'neutral', 'professional', 'warm')),
  constraint ai_profile_verbosity_allowed check (verbosity in ('short', 'medium', 'detailed')),
  constraint ai_profile_answer_style_allowed check (answer_style in ('direct', 'balanced', 'guided')),
  constraint ai_profile_language_allowed check (language_policy in ('vietnamese_first', 'match_customer')),
  constraint ai_profile_sales_allowed check (sales_policy in ('none', 'light', 'proactive')),
  constraint ai_profile_uncertainty_allowed check (uncertainty_policy in ('explicit', 'clarify', 'support')),
  constraint ai_profile_custom_length check (char_length(custom_instructions) <= 2000),
  constraint ai_profile_status_allowed check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  constraint ai_profile_status_dates check (
    (status = 'DRAFT' and activated_at is null and archived_at is null)
    or (status = 'ACTIVE' and activated_at is not null and archived_at is null)
    or (status = 'ARCHIVED' and archived_at is not null)
  ),
  unique (profile_key, revision)
);

create unique index ai_assistant_profiles_one_active
  on public.ai_assistant_profiles ((status)) where status = 'ACTIVE';

create table public.ai_runtime_settings (
  revision bigint generated always as identity primary key,
  provider text not null,
  model text not null,
  profile_id uuid not null references public.ai_assistant_profiles(id) on delete restrict,
  profile_revision integer not null,
  enabled boolean not null default true,
  status text not null default 'DRAFT',
  test_status text not null default 'NOT_TESTED',
  tested_at timestamptz,
  tested_by uuid references auth.users(id) on delete set null,
  test_summary_code text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  supersedes_revision bigint references public.ai_runtime_settings(revision) on delete restrict,
  constraint ai_runtime_provider_length check (char_length(provider) between 2 and 30),
  constraint ai_runtime_model_length check (char_length(model) between 2 and 100),
  constraint ai_runtime_provider_model_allowlist check (
    (provider = 'gemini' and model = 'gemini-2.5-flash')
    or (provider = 'openai' and model = 'gpt-5-mini-2025-08-07')
    or (provider = 'deepseek' and model = 'deepseek-v4-flash')
  ),
  constraint ai_runtime_status_allowed check (status in ('DRAFT', 'ACTIVE', 'SUPERSEDED')),
  constraint ai_runtime_test_status_allowed check (test_status in ('NOT_TESTED', 'PASSED', 'FAILED')),
  constraint ai_runtime_test_shape check (
    (test_status = 'NOT_TESTED' and tested_at is null and tested_by is null and test_summary_code is null)
    or (test_status in ('PASSED', 'FAILED') and tested_at is not null and tested_by is not null and test_summary_code is not null)
  ),
  constraint ai_runtime_activation_shape check (
    (status = 'DRAFT' and activated_at is null)
    or (status in ('ACTIVE', 'SUPERSEDED') and activated_at is not null)
  )
);

create unique index ai_runtime_settings_one_active
  on public.ai_runtime_settings ((status)) where status = 'ACTIVE';

create table public.ai_provider_health_checks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  status text not null,
  latency_ms integer,
  checked_by uuid not null references auth.users(id) on delete restrict,
  checked_at timestamptz not null default now(),
  constraint ai_health_provider_length check (char_length(provider) between 2 and 30),
  constraint ai_health_model_length check (char_length(model) between 2 and 100),
  constraint ai_health_provider_model_allowlist check (
    (provider = 'gemini' and model = 'gemini-2.5-flash')
    or (provider = 'openai' and model = 'gpt-5-mini-2025-08-07')
    or (provider = 'deepseek' and model = 'deepseek-v4-flash')
  ),
  constraint ai_health_status_allowed check (status in (
    'NOT_CHECKED', 'CONNECTED', 'TIMEOUT', 'UNAVAILABLE', 'INVALID_CREDENTIAL',
    'UNSUPPORTED_MODEL', 'PROVIDER_ERROR', 'BLOCKED'
  )),
  constraint ai_health_latency_shape check (latency_ms is null or latency_ms between 0 and 60000)
);

create index ai_provider_health_latest
  on public.ai_provider_health_checks (provider, model, checked_at desc);

create table public.ai_runtime_audit_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  runtime_revision bigint references public.ai_runtime_settings(revision) on delete restrict,
  profile_id uuid references public.ai_assistant_profiles(id) on delete restrict,
  provider text,
  model text,
  actor_id uuid references auth.users(id) on delete set null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_audit_event_allowed check (event_type in (
    'AI_RUNTIME_DRAFT_UPDATED', 'AI_RUNTIME_TESTED', 'AI_RUNTIME_ACTIVATED',
    'AI_RUNTIME_ROLLED_BACK', 'AI_PROFILE_CREATED', 'AI_PROFILE_UPDATED',
    'AI_PROFILE_ARCHIVED', 'AI_PROVIDER_HEALTH_CHECKED', 'AI_RUNTIME_ENABLED_CHANGED'
  )),
  constraint ai_audit_metadata_object check (jsonb_typeof(event_metadata) = 'object')
);

create index ai_runtime_audit_events_created_at
  on public.ai_runtime_audit_events (created_at desc);

alter table public.ai_assistant_profiles enable row level security;
alter table public.ai_runtime_settings enable row level security;
alter table public.ai_provider_health_checks enable row level security;
alter table public.ai_runtime_audit_events enable row level security;

revoke all on table public.ai_assistant_profiles from anon, authenticated;
revoke all on table public.ai_runtime_settings from anon, authenticated;
revoke all on table public.ai_provider_health_checks from anon, authenticated;
revoke all on table public.ai_runtime_audit_events from anon, authenticated;

grant select on table public.ai_assistant_profiles to authenticated;
grant select on table public.ai_runtime_settings to authenticated;
grant select on table public.ai_provider_health_checks to authenticated;
grant select on table public.ai_runtime_audit_events to authenticated;

create policy "admins read AI profiles"
on public.ai_assistant_profiles for select to authenticated
using ((select public.is_admin()));

create policy "admins read AI runtimes"
on public.ai_runtime_settings for select to authenticated
using ((select public.is_admin()));

create policy "admins read AI provider health"
on public.ai_provider_health_checks for select to authenticated
using ((select public.is_admin()));

create policy "admins read AI audit"
on public.ai_runtime_audit_events for select to authenticated
using ((select public.is_admin()));

create or replace function public.create_ai_behavior_profile_revision(
  target_profile_key uuid,
  target_name text,
  target_role_description text,
  target_persona text,
  target_tone text,
  target_verbosity text,
  target_answer_style text,
  target_language_policy text,
  target_sales_policy text,
  target_uncertainty_policy text,
  target_custom_instructions text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_key uuid := coalesce(target_profile_key, gen_random_uuid());
  previous_row public.ai_assistant_profiles%rowtype;
  next_revision integer;
  inserted_id uuid;
begin
  if not (select public.is_admin()) then raise exception 'AI profile mutation requires admin'; end if;
  perform pg_advisory_xact_lock(hashtextextended(chosen_key::text, 130034));
  select * into previous_row
  from public.ai_assistant_profiles
  where profile_key = chosen_key
  order by revision desc limit 1;
  next_revision := coalesce(previous_row.revision, 0) + 1;

  insert into public.ai_assistant_profiles (
    profile_key, revision, name, status, role_description, persona, tone, verbosity,
    answer_style, language_policy, sales_policy, uncertainty_policy,
    custom_instructions, supersedes_id, created_by
  ) values (
    chosen_key, next_revision, btrim(target_name), 'DRAFT', btrim(target_role_description),
    btrim(target_persona), target_tone, target_verbosity, target_answer_style,
    target_language_policy, target_sales_policy, target_uncertainty_policy,
    coalesce(target_custom_instructions, ''), previous_row.id, auth.uid()
  ) returning id into inserted_id;

  insert into public.ai_runtime_audit_events (event_type, profile_id, actor_id, event_metadata)
  values (
    case when previous_row.id is null then 'AI_PROFILE_CREATED' else 'AI_PROFILE_UPDATED' end,
    inserted_id, auth.uid(), jsonb_build_object('profile_revision', next_revision)
  );
  return inserted_id;
end;
$$;

create or replace function public.archive_ai_behavior_profile(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare saved public.ai_assistant_profiles%rowtype;
begin
  if not (select public.is_admin()) then raise exception 'AI profile archive requires admin'; end if;
  select * into saved from public.ai_assistant_profiles where id = target_profile_id for update;
  if saved.id is null then raise exception 'AI profile not found'; end if;
  if saved.status = 'ACTIVE' or exists (
    select 1 from public.ai_runtime_settings where status = 'ACTIVE' and profile_id = saved.id
  ) then raise exception 'Active AI profile cannot be archived'; end if;
  if saved.status <> 'ARCHIVED' then
    update public.ai_assistant_profiles set status = 'ARCHIVED', archived_at = now() where id = saved.id;
    insert into public.ai_runtime_audit_events (event_type, profile_id, actor_id, event_metadata)
    values ('AI_PROFILE_ARCHIVED', saved.id, auth.uid(), jsonb_build_object('profile_revision', saved.revision));
  end if;
end;
$$;

create or replace function public.create_ai_runtime_draft(
  target_provider text,
  target_model text,
  target_profile_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_row public.ai_assistant_profiles%rowtype;
  previous_revision bigint;
  inserted_revision bigint;
begin
  if not (select public.is_admin()) then raise exception 'AI runtime mutation requires admin'; end if;
  perform pg_advisory_xact_lock(130034);
  select * into profile_row from public.ai_assistant_profiles where id = target_profile_id;
  if profile_row.id is null or profile_row.status = 'ARCHIVED' then raise exception 'AI profile is unavailable'; end if;
  select revision into previous_revision from public.ai_runtime_settings order by revision desc limit 1;
  insert into public.ai_runtime_settings (
    provider, model, profile_id, profile_revision, enabled, status, created_by, supersedes_revision
  ) values (
    btrim(target_provider), btrim(target_model), profile_row.id, profile_row.revision,
    true, 'DRAFT', auth.uid(), previous_revision
  ) returning revision into inserted_revision;
  insert into public.ai_runtime_audit_events (
    event_type, runtime_revision, profile_id, provider, model, actor_id,
    event_metadata
  ) values (
    'AI_RUNTIME_DRAFT_UPDATED', inserted_revision, profile_row.id, btrim(target_provider),
    btrim(target_model), auth.uid(), jsonb_build_object('profile_revision', profile_row.revision)
  );
  return inserted_revision;
end;
$$;

create or replace function public.record_ai_provider_health(
  target_provider text,
  target_model text,
  target_status text,
  target_latency_ms integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare inserted_id uuid;
begin
  if not (select public.is_admin()) then raise exception 'AI provider health requires admin'; end if;
  insert into public.ai_provider_health_checks (provider, model, status, latency_ms, checked_by)
  values (btrim(target_provider), btrim(target_model), target_status, target_latency_ms, auth.uid())
  returning id into inserted_id;
  insert into public.ai_runtime_audit_events (event_type, provider, model, actor_id, event_metadata)
  values (
    'AI_PROVIDER_HEALTH_CHECKED', btrim(target_provider), btrim(target_model), auth.uid(),
    jsonb_build_object('status', target_status, 'latency_ms', target_latency_ms)
  );
  return inserted_id;
end;
$$;

create or replace function public.record_ai_runtime_test(
  target_revision bigint,
  target_status text,
  target_summary_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare saved public.ai_runtime_settings%rowtype;
begin
  if not (select public.is_admin()) then raise exception 'AI runtime test requires admin'; end if;
  if target_status not in ('PASSED', 'FAILED') then raise exception 'Invalid AI runtime test status'; end if;
  select * into saved from public.ai_runtime_settings where revision = target_revision for update;
  if saved.revision is null or saved.status <> 'DRAFT' then raise exception 'Only a draft runtime may be tested'; end if;
  update public.ai_runtime_settings
  set test_status = target_status, tested_at = now(), tested_by = auth.uid(),
      test_summary_code = left(btrim(target_summary_code), 80)
  where revision = target_revision;
  insert into public.ai_runtime_audit_events (
    event_type, runtime_revision, profile_id, provider, model, actor_id, event_metadata
  ) values (
    'AI_RUNTIME_TESTED', saved.revision, saved.profile_id, saved.provider, saved.model,
    auth.uid(), jsonb_build_object('result', target_status, 'summary_code', left(btrim(target_summary_code), 80))
  );
end;
$$;

create or replace function public.activate_ai_runtime(target_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.ai_runtime_settings%rowtype;
  current_active public.ai_runtime_settings%rowtype;
  latest_health public.ai_provider_health_checks%rowtype;
begin
  if not (select public.is_admin()) then raise exception 'AI runtime activation requires admin'; end if;
  perform pg_advisory_xact_lock(130034);
  select * into target from public.ai_runtime_settings where revision = target_revision for update;
  if target.revision is null or target.status <> 'DRAFT' then raise exception 'Only a draft runtime may be activated'; end if;
  if not target.enabled or target.test_status <> 'PASSED' then raise exception 'AI runtime must pass Prompt Lab before activation'; end if;
  select * into latest_health from public.ai_provider_health_checks
  where provider = target.provider and model = target.model
  order by checked_at desc limit 1;
  if latest_health.id is null or latest_health.status <> 'CONNECTED'
     or latest_health.checked_at < now() - interval '24 hours' then
    raise exception 'A current connected provider health check is required';
  end if;
  select * into current_active from public.ai_runtime_settings where status = 'ACTIVE' for update;
  if current_active.revision is not null then
    update public.ai_runtime_settings set status = 'SUPERSEDED' where revision = current_active.revision;
  end if;
  update public.ai_assistant_profiles
  set status = 'ARCHIVED', archived_at = coalesce(archived_at, now())
  where status = 'ACTIVE' and id <> target.profile_id;
  update public.ai_assistant_profiles
  set status = 'ACTIVE', activated_at = coalesce(activated_at, now()), archived_at = null
  where id = target.profile_id;
  update public.ai_runtime_settings set status = 'ACTIVE', activated_at = now()
  where revision = target.revision;
  insert into public.ai_runtime_audit_events (
    event_type, runtime_revision, profile_id, provider, model, actor_id, event_metadata
  ) values (
    'AI_RUNTIME_ACTIVATED', target.revision, target.profile_id, target.provider, target.model,
    auth.uid(), jsonb_build_object('previous_runtime_revision', current_active.revision)
  );
  return target.revision;
end;
$$;

create or replace function public.rollback_ai_runtime(target_revision bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.ai_runtime_settings%rowtype;
  current_active public.ai_runtime_settings%rowtype;
  profile_row public.ai_assistant_profiles%rowtype;
  latest_health public.ai_provider_health_checks%rowtype;
  inserted_revision bigint;
begin
  if not (select public.is_admin()) then raise exception 'AI runtime rollback requires admin'; end if;
  perform pg_advisory_xact_lock(130034);
  select * into source from public.ai_runtime_settings where revision = target_revision;
  if source.revision is null or source.status = 'DRAFT' then raise exception 'Rollback source must be an activation revision'; end if;
  select * into profile_row from public.ai_assistant_profiles where id = source.profile_id;
  if profile_row.id is null then raise exception 'Rollback profile is unavailable'; end if;
  select * into latest_health from public.ai_provider_health_checks
  where provider = source.provider and model = source.model
  order by checked_at desc limit 1;
  if latest_health.id is null or latest_health.status <> 'CONNECTED'
     or latest_health.checked_at < now() - interval '24 hours' then
    raise exception 'A current connected provider health check is required';
  end if;
  select * into current_active from public.ai_runtime_settings where status = 'ACTIVE' for update;
  if current_active.revision is not null then
    update public.ai_runtime_settings set status = 'SUPERSEDED' where revision = current_active.revision;
  end if;
  update public.ai_assistant_profiles
  set status = 'ARCHIVED', archived_at = coalesce(archived_at, now())
  where status = 'ACTIVE' and id <> profile_row.id;
  update public.ai_assistant_profiles
  set status = 'ACTIVE', activated_at = coalesce(activated_at, now()), archived_at = null
  where id = profile_row.id;
  insert into public.ai_runtime_settings (
    provider, model, profile_id, profile_revision, enabled, status, test_status,
    tested_at, tested_by, test_summary_code, created_by, activated_at, supersedes_revision
  ) values (
    source.provider, source.model, source.profile_id, source.profile_revision, true, 'ACTIVE',
    'PASSED', source.tested_at, source.tested_by, 'ROLLBACK_FROM_' || source.revision,
    auth.uid(), now(), current_active.revision
  ) returning revision into inserted_revision;
  insert into public.ai_runtime_audit_events (
    event_type, runtime_revision, profile_id, provider, model, actor_id, event_metadata
  ) values (
    'AI_RUNTIME_ROLLED_BACK', inserted_revision, source.profile_id, source.provider,
    source.model, auth.uid(), jsonb_build_object(
      'source_runtime_revision', source.revision,
      'previous_runtime_revision', current_active.revision
    )
  );
  return inserted_revision;
end;
$$;

create or replace function public.disable_ai_runtime()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_active public.ai_runtime_settings%rowtype;
  inserted_revision bigint;
begin
  if not (select public.is_admin()) then raise exception 'AI runtime disable requires admin'; end if;
  perform pg_advisory_xact_lock(130034);
  select * into current_active from public.ai_runtime_settings where status = 'ACTIVE' for update;
  if current_active.revision is null then return null; end if;
  if not current_active.enabled then return current_active.revision; end if;
  update public.ai_runtime_settings set status = 'SUPERSEDED' where revision = current_active.revision;
  insert into public.ai_runtime_settings (
    provider, model, profile_id, profile_revision, enabled, status, test_status,
    tested_at, tested_by, test_summary_code, created_by, activated_at, supersedes_revision
  ) values (
    current_active.provider, current_active.model, current_active.profile_id,
    current_active.profile_revision, false, 'ACTIVE', current_active.test_status,
    current_active.tested_at, current_active.tested_by, current_active.test_summary_code,
    auth.uid(), now(), current_active.revision
  ) returning revision into inserted_revision;
  insert into public.ai_runtime_audit_events (
    event_type, runtime_revision, profile_id, provider, model, actor_id, event_metadata
  ) values (
    'AI_RUNTIME_ENABLED_CHANGED', inserted_revision, current_active.profile_id,
    current_active.provider, current_active.model, auth.uid(),
    jsonb_build_object('enabled', false, 'previous_runtime_revision', current_active.revision)
  );
  return inserted_revision;
end;
$$;

create or replace function public.get_active_ai_runtime()
returns table (
  enabled boolean,
  provider text,
  model text,
  runtime_revision bigint,
  profile_revision integer,
  profile_name text,
  role_description text,
  persona text,
  tone text,
  verbosity text,
  answer_style text,
  language_policy text,
  sales_policy text,
  uncertainty_policy text,
  custom_instructions text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    runtime.enabled,
    runtime.provider,
    runtime.model,
    runtime.revision,
    runtime.profile_revision,
    profile.name,
    profile.role_description,
    profile.persona,
    profile.tone,
    profile.verbosity,
    profile.answer_style,
    profile.language_policy,
    profile.sales_policy,
    profile.uncertainty_policy,
    profile.custom_instructions
  from public.ai_runtime_settings runtime
  join public.ai_assistant_profiles profile on profile.id = runtime.profile_id
  where runtime.status = 'ACTIVE'
  limit 1
$$;

revoke all on function public.create_ai_behavior_profile_revision(uuid,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.archive_ai_behavior_profile(uuid) from public, anon, authenticated;
revoke all on function public.create_ai_runtime_draft(text,text,uuid) from public, anon, authenticated;
revoke all on function public.record_ai_provider_health(text,text,text,integer) from public, anon, authenticated;
revoke all on function public.record_ai_runtime_test(bigint,text,text) from public, anon, authenticated;
revoke all on function public.activate_ai_runtime(bigint) from public, anon, authenticated;
revoke all on function public.rollback_ai_runtime(bigint) from public, anon, authenticated;
revoke all on function public.disable_ai_runtime() from public, anon, authenticated;
revoke all on function public.get_active_ai_runtime() from public, anon, authenticated;

grant execute on function public.create_ai_behavior_profile_revision(uuid,text,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.archive_ai_behavior_profile(uuid) to authenticated;
grant execute on function public.create_ai_runtime_draft(text,text,uuid) to authenticated;
grant execute on function public.record_ai_provider_health(text,text,text,integer) to authenticated;
grant execute on function public.record_ai_runtime_test(bigint,text,text) to authenticated;
grant execute on function public.activate_ai_runtime(bigint) to authenticated;
grant execute on function public.rollback_ai_runtime(bigint) to authenticated;
grant execute on function public.disable_ai_runtime() to authenticated;
grant execute on function public.get_active_ai_runtime() to anon, authenticated;

insert into public.ai_assistant_profiles (
  id, profile_key, revision, name, status, role_description, persona, tone,
  verbosity, answer_style, language_policy, sales_policy, uncertainty_policy,
  custom_instructions
) values (
  '130b0000-0000-4000-8000-000000000001',
  '130b0000-0000-4000-8000-000000000000',
  1,
  'Tà Xùa Local Expert',
  'DRAFT',
  'Trợ lý du lịch Tà Xùa của TÀ XÙA TRIP, giúp khách hiểu trước nơi ở, giá, tình trạng phòng, thông tin xác minh, lịch trình và Booking bằng dữ liệu thực tế có trong hệ thống.',
  'Thân thiện, thực tế, tự nhiên, không robot, không khoa trương và không bán hàng quá mức.',
  'friendly',
  'short',
  'direct',
  'vietnamese_first',
  'light',
  'explicit',
  'Trả lời ngắn trước; giải thích thêm khi khách cần. Dùng số liệu khi tool trả số liệu và nói rõ khi chưa có dữ liệu.'
);

comment on table public.ai_assistant_profiles is
  'Versioned Admin-controlled behavior layer. Contains no provider secret and cannot override code-owned safety.';
comment on table public.ai_runtime_settings is
  'Immutable AI provider/model/profile runtime revisions. Migration 034 creates no ACTIVE row.';
comment on table public.ai_provider_health_checks is
  'Sanitized explicit Admin provider health metadata; no raw provider response or credential.';
comment on table public.ai_runtime_audit_events is
  'Append-only AI runtime/profile lifecycle audit without prompt, conversation, PII or credentials.';
comment on function public.get_active_ai_runtime() is
  'Fixed customer-server runtime projection only; no table grant, core prompt, credential or audit fields.';
