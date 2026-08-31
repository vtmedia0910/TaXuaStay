-- Rollback-only integration/security coverage for V2 Phase 4. Run only after
-- migration 018 is applied. No fixture survives this transaction.

begin;

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';

create temporary table phase4_test_results (
  test_name text primary key,
  outcome text not null
) on commit drop;

do $fixtures$
declare
  supplier_a uuid;
  supplier_b uuid;
  property_a uuid;
  property_b uuid;
  room_a uuid;
  room_b uuid;
  plan_a uuid;
  observed text;
begin
  insert into public.suppliers (supplier_code, supplier_type, display_name, status)
  values ('SUP-ECO-000001', 'accommodation', 'Economics Supplier A', 'active')
  returning id into supplier_a;
  insert into public.suppliers (supplier_code, supplier_type, display_name, status)
  values ('SUP-ECO-000002', 'accommodation', 'Economics Supplier B', 'active')
  returning id into supplier_b;

  insert into public.properties (destination_id, slug, name, property_type, area_name)
  values ((select id from public.destinations where slug = 'ta-xua'), 'phase4-economics-a', 'Phase 4 Economics A', 'homestay', 'Tà Xùa')
  returning id into property_a;
  insert into public.properties (destination_id, slug, name, property_type, area_name)
  values ((select id from public.destinations where slug = 'ta-xua'), 'phase4-economics-b', 'Phase 4 Economics B', 'homestay', 'Tà Xùa')
  returning id into property_b;

  insert into public.room_types (property_id, slug, name)
  values (property_a, 'phase4-room-a', 'Phase 4 Room A') returning id into room_a;
  insert into public.room_types (property_id, slug, name)
  values (property_b, 'phase4-room-b', 'Phase 4 Room B') returning id into room_b;

  insert into public.supplier_properties (supplier_id, property_id, relationship_type, is_primary, valid_from)
  values (supplier_a, property_a, 'commercial_partner', true, current_date - 30);
  insert into public.supplier_properties (supplier_id, property_id, relationship_type, is_primary, valid_from)
  values (supplier_b, property_b, 'commercial_partner', true, current_date - 30);

  insert into public.commercial_rate_plans (
    supplier_id, property_id, code, name, valid_from, valid_until, status, source
  ) values (
    supplier_a, property_a, 'phase4-active', 'Phase 4 Active', current_date - 10,
    current_date + 60, 'active', 'contract'
  ) returning id into plan_a;

  insert into public.room_commercial_rules (
    commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
    net_cost_vnd, market_reference_vnd, effective_from, effective_until,
    priority, source, verified_at, valid_until, is_active
  ) values (
    plan_a, supplier_a, property_a, room_a, 'weekday', 700000, 1000000,
    current_date - 10, current_date + 60, 0, 'contract', now() - interval '1 day',
    (timezone('Asia/Ho_Chi_Minh', now()))::date, true
  );
  insert into phase4_test_results values ('valid_plan_and_rule', 'passed');

  begin
    insert into public.room_commercial_rules (
      commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
      net_cost_vnd, source
    ) values (plan_a, supplier_a, property_a, room_b, 'weekday', 1, 'admin');
    raise exception 'Room/Property mismatch unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed not like '%ownership must match%' then raise exception 'Unexpected Room mismatch result: %', observed; end if;
  end;
  insert into phase4_test_results values ('room_property_mismatch_rejected', 'passed');

  begin
    insert into public.commercial_rate_plans (supplier_id, property_id, code, name, status, source)
    values (supplier_b, property_a, 'invalid-owner', 'Invalid owner', 'active', 'admin');
    raise exception 'Supplier/Property mismatch unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed not like '%current Supplier and Property relationship%' then raise exception 'Unexpected Supplier mismatch result: %', observed; end if;
  end;
  insert into phase4_test_results values ('supplier_property_mismatch_rejected', 'passed');

  begin
    insert into public.room_commercial_rules (
      commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
      net_cost_vnd, source
    ) values (plan_a, supplier_a, property_a, room_a, 'weekday', -1, 'admin');
    raise exception 'Negative money unexpectedly succeeded';
  exception when check_violation then null;
  end;
  insert into phase4_test_results values ('negative_money_rejected', 'passed');

  begin
    insert into public.room_commercial_rules (
      commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
      net_cost_vnd, source, verified_at
    ) values (plan_a, supplier_a, property_a, room_a, 'weekday', 1, 'admin', now() + interval '1 minute');
    raise exception 'Future verification unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed not like '%cannot be in the future%' then raise exception 'Unexpected future timestamp result: %', observed; end if;
  end;
  insert into phase4_test_results values ('future_verified_at_rejected', 'passed');

  begin
    insert into public.room_commercial_rules (
      commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
      net_cost_vnd, source, verified_at, valid_until
    ) values (plan_a, supplier_a, property_a, room_a, 'weekday', 1, 'admin', now() - interval '1 day', current_date - 2);
    raise exception 'Invalid verification boundary unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed not like '%cannot end before%' then raise exception 'Unexpected verification boundary result: %', observed; end if;
  end;
  insert into phase4_test_results values ('verified_valid_until_boundary', 'passed');

  begin
    insert into public.room_commercial_rules (
      commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
      net_cost_vnd, effective_from, effective_until, source
    ) values (plan_a, supplier_a, property_a, room_a, 'weekday', 1, current_date + 1, current_date, 'admin');
    raise exception 'Reversed range unexpectedly succeeded';
  exception when check_violation then null;
  end;
  insert into phase4_test_results values ('reversed_range_rejected', 'passed');

  -- Equal-priority rows are intentionally both retained so the pure resolver
  -- reports conflict; the database must not silently delete or pick one.
  insert into public.room_commercial_rules (
    commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type,
    net_cost_vnd, effective_from, effective_until, priority, source, is_active
  ) values
    (plan_a, supplier_a, property_a, room_a, 'override', 800000, current_date + 1, current_date + 1, 10, 'admin', true),
    (plan_a, supplier_a, property_a, room_a, 'override', 800000, current_date + 1, current_date + 1, 10, 'admin', true);
  if (select count(*) from public.room_commercial_rules where commercial_rate_plan_id = plan_a and rate_type = 'override') <> 2 then
    raise exception 'Equal-priority ambiguity was silently collapsed';
  end if;
  insert into phase4_test_results values ('equal_priority_rows_preserved_for_conflict', 'passed');

  if not exists (select 1 from public.room_commercial_rules where commercial_rate_plan_id = plan_a and rate_type = 'weekday')
    or not exists (select 1 from public.room_commercial_rules where commercial_rate_plan_id = plan_a and rate_type = 'override') then
    raise exception 'Calendar precedence fixtures missing';
  end if;
  insert into phase4_test_results values ('calendar_precedence_inputs', 'passed');

  if has_table_privilege('anon', 'public.commercial_rate_plans', 'select')
    or has_table_privilege('anon', 'public.room_commercial_rules', 'select')
    or has_table_privilege('anon', 'public.commercial_rate_plans', 'insert')
    or has_table_privilege('anon', 'public.room_commercial_rules', 'update') then
    raise exception 'Anonymous economics privilege regression';
  end if;
  if has_function_privilege('anon', 'public.has_current_supplier_property_relationship(uuid,uuid,date)', 'execute') then
    raise exception 'Anonymous economics helper execution regression';
  end if;
  insert into phase4_test_results values ('anonymous_read_and_mutation_denied', 'passed');

  if not has_any_column_privilege('anon', 'public.rate_plans', 'select')
    or not has_any_column_privilege('anon', 'public.room_rate_rules', 'select')
    or not has_table_privilege('anon', 'public.public_room_rate_rules', 'select') then
    raise exception 'Existing public sell pricing privileges changed';
  end if;
  insert into phase4_test_results values ('public_sell_pricing_unchanged', 'passed');
end
$fixtures$;

set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"staff"}}';

do $staff_boundary$
declare
  supplier_uuid uuid;
  property_uuid uuid;
  observed text;
begin
  select id into supplier_uuid from public.suppliers where supplier_code = 'SUP-ECO-000001';
  select id into property_uuid from public.properties where slug = 'phase4-economics-a';

  insert into public.commercial_rate_plans (supplier_id, property_id, code, name, status, source)
  values (supplier_uuid, property_uuid, 'staff-draft', 'Staff Draft', 'draft', 'admin');

  begin
    insert into public.commercial_rate_plans (supplier_id, property_id, code, name, status, source)
    values (supplier_uuid, property_uuid, 'staff-active', 'Staff Active', 'active', 'admin');
    raise exception 'Staff activation unexpectedly succeeded';
  exception when insufficient_privilege then null;
    when others then
      observed := sqlerrm;
      if observed not like '%row-level security%' then raise exception 'Unexpected staff lifecycle result: %', observed; end if;
  end;

  begin
    insert into public.commercial_rate_plans (
      supplier_id, property_id, code, name, status, source, contract_reference
    ) values (supplier_uuid, property_uuid, 'staff-contract', 'Staff Contract', 'draft', 'contract', 'private-ref');
    raise exception 'Staff contract reference unexpectedly succeeded';
  exception when insufficient_privilege then null;
    when others then
      observed := sqlerrm;
      if observed not like '%row-level security%' then raise exception 'Unexpected staff contract result: %', observed; end if;
  end;
end
$staff_boundary$;

reset role;
set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
insert into phase4_test_results values ('staff_admin_boundary', 'passed');

set local role authenticated;

do $authenticated_admin_path$
declare
  supplier_uuid uuid;
  property_uuid uuid;
  room_uuid uuid;
  plan_uuid uuid;
begin
  select id into supplier_uuid from public.suppliers where supplier_code = 'SUP-ECO-000001';
  select id into property_uuid from public.properties where slug = 'phase4-economics-a';
  select id into room_uuid from public.room_types where slug = 'phase4-room-a';

  insert into public.commercial_rate_plans (
    supplier_id, property_id, code, name, status, source, contract_reference
  ) values (
    supplier_uuid, property_uuid, 'admin-authenticated', 'Authenticated Admin',
    'active', 'contract', 'test-only-reference'
  ) returning id into plan_uuid;
  insert into public.room_commercial_rules (
    commercial_rate_plan_id, supplier_id, property_id, room_type_id,
    rate_type, net_cost_vnd, source, is_active
  ) values (
    plan_uuid, supplier_uuid, property_uuid, room_uuid,
    'weekday', 500000, 'contract', true
  );
end
$authenticated_admin_path$;

reset role;
insert into phase4_test_results values ('authenticated_admin_active_write', 'passed');

do $archive_and_rollback$
declare
  supplier_archive uuid;
  supplier_rollback uuid;
  property_archive uuid;
  property_rollback uuid;
  room_archive uuid;
  room_rollback uuid;
  plan_archive uuid;
  plan_rollback uuid;
  observed text;
begin
  insert into public.suppliers (supplier_code, supplier_type, display_name, status)
  values ('SUP-ECO-000003', 'accommodation', 'Archive Economics Supplier', 'active') returning id into supplier_archive;
  insert into public.properties (destination_id, slug, name, property_type, area_name)
  values ((select id from public.destinations where slug = 'ta-xua'), 'phase4-economics-archive', 'Phase 4 Archive', 'homestay', 'Tà Xùa') returning id into property_archive;
  insert into public.room_types (property_id, slug, name)
  values (property_archive, 'phase4-room-archive', 'Phase 4 Room Archive') returning id into room_archive;
  insert into public.supplier_properties (supplier_id, property_id, relationship_type, valid_from)
  values (supplier_archive, property_archive, 'commercial_partner', current_date - 1);
  insert into public.commercial_rate_plans (supplier_id, property_id, code, name, status, source)
  values (supplier_archive, property_archive, 'archive-plan', 'Archive Plan', 'active', 'admin') returning id into plan_archive;
  insert into public.room_commercial_rules (
    commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type, net_cost_vnd, source
  ) values (plan_archive, supplier_archive, property_archive, room_archive, 'weekday', 500000, 'admin');

  perform public.archive_supplier(supplier_archive);
  if (select status from public.commercial_rate_plans where id = plan_archive) <> 'expired'
    or (select is_active from public.room_commercial_rules where commercial_rate_plan_id = plan_archive)
    or (select status from public.suppliers where id = supplier_archive) <> 'archived' then
    raise exception 'Supplier archive did not retain and close economics';
  end if;

  begin
    insert into public.commercial_rate_plans (supplier_id, property_id, code, name, status, source)
    values (supplier_archive, property_archive, 'archived-active', 'Archived Active', 'active', 'admin');
    raise exception 'Archived Supplier accepted active economics';
  exception when others then
    observed := sqlerrm;
    if observed not like '%current Supplier and Property relationship%' then raise exception 'Unexpected archived Supplier result: %', observed; end if;
  end;
  insert into phase4_test_results values ('supplier_archive_closes_economics', 'passed');
  insert into phase4_test_results values ('archived_supplier_blocks_active_economics', 'passed');

  insert into public.suppliers (supplier_code, supplier_type, display_name, status)
  values ('SUP-ECO-000004', 'accommodation', 'Rollback Economics Supplier', 'active') returning id into supplier_rollback;
  insert into public.properties (destination_id, slug, name, property_type, area_name)
  values ((select id from public.destinations where slug = 'ta-xua'), 'phase4-economics-rollback', 'Phase 4 Rollback', 'homestay', 'Tà Xùa') returning id into property_rollback;
  insert into public.room_types (property_id, slug, name)
  values (property_rollback, 'phase4-room-rollback', 'Phase 4 Room Rollback') returning id into room_rollback;
  insert into public.supplier_properties (supplier_id, property_id, relationship_type, valid_from)
  values (supplier_rollback, property_rollback, 'commercial_partner', current_date - 1);
  insert into public.commercial_rate_plans (supplier_id, property_id, code, name, status, source)
  values (supplier_rollback, property_rollback, 'rollback-plan', 'Rollback Plan', 'active', 'admin') returning id into plan_rollback;
  insert into public.room_commercial_rules (
    commercial_rate_plan_id, supplier_id, property_id, room_type_id, rate_type, net_cost_vnd, source
  ) values (plan_rollback, supplier_rollback, property_rollback, room_rollback, 'weekday', 500000, 'admin');

  alter table public.room_commercial_rules
    add constraint phase4_force_active_rule check (is_active) not valid;
  begin
    perform public.archive_supplier(supplier_rollback);
    raise exception 'Forced economics failure did not stop archive';
  exception when check_violation then
    observed := sqlerrm;
    if observed not like '%phase4_force_active_rule%' then raise exception 'Unexpected rollback failure: %', observed; end if;
  end;
  if (select status from public.suppliers where id = supplier_rollback) <> 'active'
    or (select status from public.commercial_rate_plans where id = plan_rollback) <> 'active'
    or not (select is_active from public.room_commercial_rules where commercial_rate_plan_id = plan_rollback) then
    raise exception 'Supplier/economics archive did not roll back atomically';
  end if;
  alter table public.room_commercial_rules drop constraint phase4_force_active_rule;
  insert into phase4_test_results values ('forced_archive_rollback', 'passed');

  begin
    update public.supplier_properties
    set valid_until = current_date - 1
    where supplier_id = supplier_rollback and property_id = property_rollback;
    raise exception 'Active commercial relationship ended unexpectedly';
  exception when others then
    observed := sqlerrm;
    if observed not like '%Expire or pause active commercial plans%' then raise exception 'Unexpected relationship guard result: %', observed; end if;
  end;
  insert into phase4_test_results values ('active_relationship_end_guard', 'passed');
end
$archive_and_rollback$;

select test_name, outcome from phase4_test_results order by test_name;

rollback;
