-- Rollback-only RLS and resolver-source smoke for V2 Phase 6.
-- Uses the existing Tà Xùa destination and leaves no package fixture behind.

begin;

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';

create temporary table phase6_package_results (
  test_name text primary key,
  outcome text not null
) on commit drop;

do $fixtures$
declare
  destination_uuid uuid;
  package_uuid uuid;
  observed text;
begin
  select id into destination_uuid from public.destinations where slug = 'ta-xua';
  if destination_uuid is null then raise exception 'Tà Xùa destination fixture is missing'; end if;

  package_uuid := public.save_package_commerce(
    null, destination_uuid, 'phase6-rollback-package', 'phase6-rollback-package',
    'Gói Phase 6 rollback', 'Gói kiểm tra không tồn tại sau transaction',
    'Fixture kiểm tra source và RLS.', 'published', current_date,
    current_date + 30, 'manual', 'https://example.com/request', false, 0,
    null, 'private package note',
    jsonb_build_array(jsonb_build_object(
      'component_key', 'local-support', 'component_type', 'CUSTOM',
      'custom_code', 'local-support', 'custom_name', 'Hỗ trợ địa phương',
      'custom_description', 'Cần xác nhận', 'is_required', true,
      'quantity', 1, 'sort_order', 0, 'confirmation_mode', 'manual',
      'unit_cost_vnd', 100000, 'cost_source', 'owner_confirmation',
      'cost_verified_at', now() - interval '1 hour',
      'cost_valid_until', current_date + 30,
      'internal_notes', 'private component note'
    )),
    jsonb_build_array(jsonb_build_object(
      'rule_key', 'two-adults', 'price_vnd', 300000,
      'effective_from', current_date, 'effective_until', current_date + 30,
      'adults_min', 2, 'adults_max', 2, 'children_min', 0,
      'children_max', 0, 'rooms_min', 1, 'rooms_max', 1,
      'selected_optional_component_keys', '[]'::jsonb,
      'priority', 10, 'price_source', 'owner_confirmation',
      'verified_at', now() - interval '1 hour',
      'price_valid_until', current_date + 30, 'is_active', true,
      'internal_notes', 'private price note'
    ))
  );
  if not public.is_package_public(package_uuid) then raise exception 'Valid package was not public'; end if;
  insert into phase6_package_results values ('atomic_package_save', 'passed');

  begin
    perform public.save_package_commerce(
      package_uuid, destination_uuid, 'phase6-rollback-package', 'phase6-rollback-package',
      'Gói Phase 6 rollback', 'Gói kiểm tra không tồn tại sau transaction',
      null, 'published', current_date, current_date + 30, 'instant', null,
      false, 0, null, null, '[]'::jsonb, '[]'::jsonb
    );
    raise exception 'Instant package unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed not like '%cannot promise instant confirmation%' then
      raise exception 'Unexpected instant confirmation result: %', observed;
    end if;
  end;
  insert into phase6_package_results values ('instant_confirmation_denied', 'passed');

  if has_column_privilege('anon', 'public.package_components', 'unit_cost_vnd', 'select')
    or has_column_privilege('anon', 'public.package_components', 'internal_notes', 'select')
    or has_column_privilege('anon', 'public.package_price_rules', 'internal_notes', 'select')
  then raise exception 'Anonymous package economics grant regression'; end if;
  insert into phase6_package_results values ('private_economics_denied', 'passed');
end
$fixtures$;

set local role anon;

do $anonymous$
declare
  package_uuid uuid;
  public_count integer;
  component_count integer;
  price_count integer;
begin
  select id into package_uuid from public.public_packages where slug = 'phase6-rollback-package';
  if package_uuid is null then raise exception 'Published package projection was not visible'; end if;
  select count(*) into public_count from public.public_packages where id = package_uuid;
  select count(*) into component_count from public.get_public_package_components(array[package_uuid]);
  select count(*) into price_count from public.get_public_package_price_rules(array[package_uuid]);
  if public_count <> 1 or component_count <> 1 or price_count <> 1 then
    raise exception 'Anonymous safe projections returned unexpected counts';
  end if;
  begin
    insert into public.packages (destination_id, code, slug, name, proposition)
    values (gen_random_uuid(), 'anon-write', 'anon-write', 'Anon write', 'Anon write');
    raise exception 'Anonymous package mutation unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$anonymous$;

reset role;
insert into phase6_package_results values ('anonymous_safe_read', 'passed');
insert into phase6_package_results values ('anonymous_mutation_denied', 'passed');

set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"staff"}}';

do $staff$
declare destination_uuid uuid; observed text;
begin
  select id into destination_uuid from public.destinations where slug = 'ta-xua';
  begin
    perform public.save_package_commerce(
      null, destination_uuid, 'staff-package', 'staff-package', 'Staff package',
      'Staff must not mutate', null, 'draft', null, null, 'manual', null,
      false, 0, null, null, '[]'::jsonb, '[]'::jsonb
    );
    raise exception 'Staff package mutation unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed <> 'Package changes require admin' then
      raise exception 'Unexpected staff guard result: %', observed;
    end if;
  end;
end
$staff$;

reset role;
insert into phase6_package_results values ('admin_only_mutation_guard', 'passed');

select test_name, outcome from phase6_package_results order by test_name;

rollback;
