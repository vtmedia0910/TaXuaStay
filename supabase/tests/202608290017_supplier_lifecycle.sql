-- Transactional integration test for V2 Phase 3H. Run only against a schema
-- with migration 017 applied. Every fixture and temporary constraint rolls back.

begin;

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';

create temporary table phase3h_test_results (
  test_name text primary key,
  outcome text not null
) on commit drop;

do $phase3h$
declare
  supplier_uuid uuid;
  profile_supplier_uuid uuid;
  property_a uuid;
  property_b uuid;
  primary_contact_uuid uuid;
  replacement_contact_uuid uuid;
  contact_count integer;
  observed text;
begin
  insert into public.suppliers (
    supplier_code, supplier_type, display_name, status
  ) values (
    'SUP-H3T-000001', 'accommodation', 'Phase 3H full graph', 'active'
  ) returning id into supplier_uuid;

  insert into public.supplier_contacts (
    supplier_id, contact_name, contact_type, phone, is_primary, is_active
  ) values
    (supplier_uuid, 'Liên hệ chính thử nghiệm', 'owner', '0900000001', true, true),
    (supplier_uuid, 'Liên hệ phụ thử nghiệm', 'operations', '0900000002', false, true);

  insert into public.properties (
    destination_id, slug, name, property_type, area_name
  ) values (
    (select id from public.destinations where slug = 'ta-xua'),
    'phase3h-property-a', 'Phase 3H Property A', 'homestay', 'Tà Xùa'
  ) returning id into property_a;

  insert into public.properties (
    destination_id, slug, name, property_type, area_name
  ) values (
    (select id from public.destinations where slug = 'ta-xua'),
    'phase3h-property-b', 'Phase 3H Property B', 'homestay', 'Tà Xùa'
  ) returning id into property_b;

  insert into public.supplier_properties (
    supplier_id, property_id, relationship_type, is_primary, valid_from
  ) values
    (supplier_uuid, property_a, 'owner', true, current_date - 30),
    (supplier_uuid, property_b, 'operator', false, current_date - 10);

  insert into public.partner_relationships (
    supplier_id, status, tier, started_at, reviewed_at
  ) values (
    supplier_uuid, 'active', 'preferred', current_date - 60, current_date - 1
  );

  insert into public.supplier_external_refs (
    supplier_id, system_key, external_reference, metadata, is_active
  ) values (
    supplier_uuid, 'phase3h_test', 'full-graph-001', '{"scope":"identity-only"}', true
  );

  perform set_config('request.jwt.claims', '{"app_metadata":{"role":"staff"}}', true);
  begin
    perform public.archive_supplier(supplier_uuid);
    raise exception 'Staff archive unexpectedly succeeded';
  exception
    when others then
      observed := sqlerrm;
      if observed <> 'Supplier archive requires admin' then
        raise exception 'Unexpected staff archive result: %', observed;
      end if;
  end;
  perform set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"}}', true);

  begin
    update public.suppliers set status = 'archived' where id = supplier_uuid;
    raise exception 'Direct archive unexpectedly succeeded';
  exception
    when others then
      observed := sqlerrm;
      if observed <> 'Use archive_supplier to archive suppliers' then
        raise exception 'Unexpected direct archive result: %', observed;
      end if;
  end;
  insert into phase3h_test_results values ('direct_archive_blocked', 'passed');

  perform public.archive_supplier(supplier_uuid);

  if (select status from public.suppliers where id = supplier_uuid) <> 'archived' then
    raise exception 'Supplier did not archive';
  end if;
  if exists (
    select 1 from public.supplier_contacts
    where supplier_id = supplier_uuid and (is_active or is_primary)
  ) then
    raise exception 'Archive left an active or primary contact';
  end if;
  if exists (
    select 1 from public.supplier_properties
    where supplier_id = supplier_uuid
      and (is_primary or valid_until is distinct from current_date)
  ) then
    raise exception 'Archive did not close current Property links through today';
  end if;
  if exists (
    select 1 from public.partner_relationships
    where supplier_id = supplier_uuid
      and (status <> 'ended' or ended_at is distinct from current_date or valid_until is distinct from current_date)
  ) then
    raise exception 'Archive did not end the Partner relationship';
  end if;
  if exists (
    select 1 from public.supplier_external_refs
    where supplier_id = supplier_uuid and is_active
  ) then
    raise exception 'Archive left an active external reference';
  end if;
  insert into phase3h_test_results values ('archive_full_graph', 'passed');

  perform public.save_supplier_profile_v2(
    supplier_uuid, 'SUP-H3T-000001', 'accommodation', 'Phase 3H reactivated',
    null, 'active', null, null, null,
    null, null, null, null, null, null, null, null
  );
  if (select status from public.suppliers where id = supplier_uuid) <> 'active' then
    raise exception 'Supplier reactivation failed';
  end if;
  if exists (select 1 from public.supplier_contacts where supplier_id = supplier_uuid and is_active)
    or exists (select 1 from public.supplier_properties where supplier_id = supplier_uuid and valid_until is null)
    or exists (select 1 from public.partner_relationships where supplier_id = supplier_uuid and status <> 'ended')
    or exists (select 1 from public.supplier_external_refs where supplier_id = supplier_uuid and is_active)
  then
    raise exception 'Reactivation reopened historical children';
  end if;
  insert into phase3h_test_results values ('reactivation_keeps_history_closed', 'passed');

  select public.save_supplier_profile_v2(
    null, 'SUP-H3P-000001', 'guide', 'Phase 3H primary edit',
    null, 'active', null, null, null,
    null, 'Nguyễn Văn A', 'operations', 'Điều phối', '0911000001',
    'ops-a@example.com', null, 'Liên hệ chính ban đầu'
  ) into profile_supplier_uuid;

  select id into primary_contact_uuid
  from public.supplier_contacts
  where supplier_id = profile_supplier_uuid and is_primary and is_active;

  perform public.save_supplier_profile_v2(
    profile_supplier_uuid, 'SUP-H3P-000001', 'guide', 'Phase 3H primary edit 2',
    null, 'active', null, null, null,
    primary_contact_uuid, 'Nguyễn Văn A', 'operations', 'Điều phối chính',
    '0911000002', 'ops-updated@example.com', null, 'Đã cập nhật'
  );
  perform public.save_supplier_profile_v2(
    profile_supplier_uuid, 'SUP-H3P-000001', 'guide', 'Phase 3H primary edit 3',
    null, 'active', null, null, null,
    primary_contact_uuid, 'Nguyễn Văn A', 'operations', 'Điều phối chính',
    '0911000003', 'ops-final@example.com', null, 'Đã cập nhật lần hai'
  );

  select count(*) into contact_count
  from public.supplier_contacts
  where supplier_id = profile_supplier_uuid;
  if contact_count <> 1 then
    raise exception 'Repeated profile edits leaked contact rows: %', contact_count;
  end if;
  if not exists (
    select 1 from public.supplier_contacts
    where id = primary_contact_uuid
      and supplier_id = profile_supplier_uuid
      and phone = '0911000003'
      and email = 'ops-final@example.com'
      and is_primary
      and is_active
  ) then
    raise exception 'Primary-contact ID was not preserved during profile edits';
  end if;
  insert into phase3h_test_results values ('primary_contact_edit_preserves_id', 'passed');
  insert into phase3h_test_results values ('repeated_profile_edit_count_stable', 'passed');

  select public.save_supplier_contact(
    null, profile_supplier_uuid, 'Trần Văn B', 'owner', 'Chủ cơ sở',
    '0922000001', null, null, 'Thay người có chủ đích', true, true
  ) into replacement_contact_uuid;
  if replacement_contact_uuid = primary_contact_uuid
    or (select count(*) from public.supplier_contacts where supplier_id = profile_supplier_uuid) <> 2
    or (select count(*) from public.supplier_contacts where supplier_id = profile_supplier_uuid and is_primary and is_active) <> 1
    or (select is_primary from public.supplier_contacts where id = primary_contact_uuid)
    or not (select is_primary from public.supplier_contacts where id = replacement_contact_uuid)
  then
    raise exception 'Intentional primary-contact replacement did not preserve history correctly';
  end if;
  insert into phase3h_test_results values ('intentional_contact_replacement', 'passed');

  if has_table_privilege('anon', 'public.suppliers', 'select')
    or has_table_privilege('anon', 'public.supplier_contacts', 'select')
    or has_table_privilege('anon', 'public.supplier_properties', 'select')
    or has_table_privilege('anon', 'public.partner_relationships', 'select')
    or has_table_privilege('anon', 'public.supplier_external_refs', 'select')
  then
    raise exception 'Anonymous Supplier privilege regression';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.save_supplier_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)',
    'execute'
  ) then
    raise exception 'Legacy contact-inserting profile RPC is still executable';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.save_supplier_profile_v2(uuid,text,text,text,text,text,text,text,text,uuid,text,text,text,text,text,text,text)',
    'execute'
  ) then
    raise exception 'Authenticated role cannot execute the hardened profile RPC';
  end if;
  insert into phase3h_test_results values ('role_and_grant_regression', 'passed');
end
$phase3h$;

alter table public.supplier_external_refs
  add constraint phase3h_force_external_ref_active
  check (is_active) not valid;

do $atomicity$
declare
  supplier_uuid uuid;
  property_uuid uuid;
  observed text;
begin
  insert into public.suppliers (
    supplier_code, supplier_type, display_name, status
  ) values (
    'SUP-H3R-000001', 'accommodation', 'Phase 3H rollback graph', 'active'
  ) returning id into supplier_uuid;

  insert into public.supplier_contacts (
    supplier_id, contact_name, contact_type, phone, is_primary, is_active
  ) values (
    supplier_uuid, 'Rollback Contact', 'owner', '0933000001', true, true
  );

  insert into public.properties (
    destination_id, slug, name, property_type, area_name
  ) values (
    (select id from public.destinations where slug = 'ta-xua'),
    'phase3h-rollback-property', 'Phase 3H Rollback Property', 'homestay', 'Tà Xùa'
  ) returning id into property_uuid;

  insert into public.supplier_properties (
    supplier_id, property_id, relationship_type, is_primary, valid_from
  ) values (
    supplier_uuid, property_uuid, 'operator', true, current_date - 1
  );

  insert into public.partner_relationships (
    supplier_id, status, tier, started_at
  ) values (
    supplier_uuid, 'active', 'standard', current_date - 1
  );

  insert into public.supplier_external_refs (
    supplier_id, system_key, external_reference, is_active
  ) values (
    supplier_uuid, 'phase3h_test', 'rollback-001', true
  );

  begin
    perform public.archive_supplier(supplier_uuid);
    raise exception 'Forced child constraint did not fail archive';
  exception
    when check_violation then
      observed := sqlerrm;
      if observed not like '%phase3h_force_external_ref_active%' then
        raise exception 'Unexpected child constraint failure: %', observed;
      end if;
  end;

  if (select status from public.suppliers where id = supplier_uuid) <> 'active'
    or not (select is_active and is_primary from public.supplier_contacts where supplier_id = supplier_uuid)
    or not (select valid_until is null and is_primary from public.supplier_properties where supplier_id = supplier_uuid)
    or (select status from public.partner_relationships where supplier_id = supplier_uuid) <> 'active'
    or not (select is_active from public.supplier_external_refs where supplier_id = supplier_uuid)
  then
    raise exception 'Full-graph archive did not roll back atomically';
  end if;
  insert into phase3h_test_results values ('full_graph_constraint_rollback', 'passed');
end
$atomicity$;

alter table public.supplier_external_refs
  drop constraint phase3h_force_external_ref_active;

select test_name, outcome
from phase3h_test_results
order by test_name;

rollback;
