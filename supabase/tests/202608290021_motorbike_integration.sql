-- Rollback-only RLS/integration smoke for V2 Phase 5. Run after migrations 021–022.
-- No Supplier, external mapping, media, or offering fixture survives.

begin;

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';

create temporary table phase5_motorbike_results (
  test_name text primary key,
  outcome text not null
) on commit drop;

do $fixtures$
declare
  supplier_uuid uuid;
  ref_uuid uuid;
  media_uuid uuid;
  offering_uuid uuid;
  observed text;
begin
  insert into public.suppliers (supplier_code, supplier_type, display_name, status)
  values ('SUP-BIK-000001', 'motorbike', 'Phase 5 Biker source', 'active')
  returning id into supplier_uuid;

  insert into public.supplier_external_refs (
    supplier_id, system_key, external_reference, metadata, is_active
  ) values (
    supplier_uuid, 'taxua_biker', 'phase5-real-id-placeholder-for-rollback',
    '{"scope":"identity-only"}', true
  ) returning id into ref_uuid;

  insert into public.cms_media_assets (
    title, alt_text, role, external_url, mime_type
  ) values (
    'Phase 5 rollback image', 'Xe máy thử nghiệm rollback', 'card',
    'https://example.com/phase5-rollback.webp', 'image/webp'
  ) returning id into media_uuid;

  insert into public.motorbike_offerings (
    supplier_id, source_external_ref_id, slug, display_name,
    vehicle_category, transmission_type, engine_class_cc, helmet_status,
    image_media_id, availability_state, confirmation_mode,
    public_request_url, source_checked_at, publication_status
  ) values (
    supplier_uuid, ref_uuid, 'phase5-rollback-bike', 'Phase 5 rollback bike',
    'motorbike', 'semi_automatic', 110, 'unknown', media_uuid,
    'needs_confirmation', 'manual', 'https://example.com/confirm',
    now() - interval '1 hour', 'published'
  ) returning id into offering_uuid;
  insert into phase5_motorbike_results values ('valid_manual_projection', 'passed');

  if (select public_price_vnd from public.motorbike_offerings where id = offering_uuid) is not null then
    raise exception 'Missing public price did not remain null';
  end if;
  insert into phase5_motorbike_results values ('null_price_preserved', 'passed');

  begin
    update public.cms_media_assets set is_active = false where id = media_uuid;
    raise exception 'Referenced motorbike media archived unexpectedly';
  exception when others then
    observed := sqlerrm;
    if observed not like '%still referenced by a motorbike offering%' then
      raise exception 'Unexpected media guard result: %', observed;
    end if;
  end;
  insert into phase5_motorbike_results values ('referenced_media_archive_blocked', 'passed');

  begin
    insert into public.motorbike_offerings (
      supplier_id, source_external_ref_id, slug, display_name,
      vehicle_category, transmission_type, availability_state,
      public_request_url, source_checked_at, publication_status
    ) values (
      supplier_uuid, ref_uuid, 'phase5-future-source', 'Future source',
      'motorbike', 'semi_automatic', 'needs_confirmation',
      'https://example.com/confirm', now() + interval '1 minute', 'published'
    );
    raise exception 'Future source check unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed not like '%source check cannot be in the future%' then
      raise exception 'Unexpected future source result: %', observed;
    end if;
  end;
  insert into phase5_motorbike_results values ('future_source_check_rejected', 'passed');

  if has_column_privilege('anon', 'public.motorbike_offerings', 'supplier_id', 'select')
    or has_column_privilege('anon', 'public.motorbike_offerings', 'source_external_ref_id', 'select')
    or has_column_privilege('anon', 'public.motorbike_offerings', 'internal_notes', 'select')
  then
    raise exception 'Anonymous private-column grant regression';
  end if;
  if has_table_privilege('anon', 'public.suppliers', 'select')
    or has_table_privilege('anon', 'public.supplier_external_refs', 'select')
  then
    raise exception 'Anonymous Supplier boundary regression';
  end if;
  insert into phase5_motorbike_results values ('private_source_columns_denied', 'passed');
end
$fixtures$;

set local role anon;

do $anonymous_read$
declare public_count integer;
begin
  select count(*) into public_count
  from public.public_motorbike_offerings
  where slug = 'phase5-rollback-bike'
    and source_system_key = 'taxua_biker'
    and confirmation_mode = 'manual'
    and public_price_vnd is null;
  if public_count <> 1 then raise exception 'Anonymous safe projection was not visible'; end if;

  begin
    insert into public.motorbike_offerings (
      supplier_id, source_external_ref_id, slug, display_name,
      vehicle_category, transmission_type
    ) values (
      gen_random_uuid(), gen_random_uuid(), 'anon-write', 'Anon write',
      'motorbike', 'semi_automatic'
    );
    raise exception 'Anonymous write unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$anonymous_read$;

reset role;
insert into phase5_motorbike_results values ('anonymous_safe_read', 'passed');
insert into phase5_motorbike_results values ('anonymous_write_denied', 'passed');

set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"staff"}}';

do $staff_guard$
declare observed text;
begin
  begin
    perform public.save_motorbike_offering(
      null, '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222', 'staff-write', 'Staff write',
      'motorbike', 'semi_automatic', null, null, 'unknown', null, null, null,
      null, null, null, null, null, 'needs_confirmation', null, null,
      'draft', 0, null
    );
    raise exception 'Staff mutation unexpectedly succeeded';
  exception when others then
    observed := sqlerrm;
    if observed <> 'Motorbike offering changes require admin' then
      raise exception 'Unexpected staff guard result: %', observed;
    end if;
  end;
end
$staff_guard$;

reset role;
set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
insert into phase5_motorbike_results values ('admin_only_mutation_guard', 'passed');

do $archive$
declare supplier_uuid uuid;
begin
  select supplier_id into supplier_uuid
  from public.motorbike_offerings
  where slug = 'phase5-rollback-bike';
  perform public.archive_supplier(supplier_uuid);
  if (select publication_status from public.motorbike_offerings where slug = 'phase5-rollback-bike') <> 'archived'
    or (select status from public.suppliers where id = supplier_uuid) <> 'archived'
  then raise exception 'Supplier archive did not close the motorbike projection'; end if;
end
$archive$;

insert into phase5_motorbike_results values ('supplier_archive_closes_projection', 'passed');

select test_name, outcome
from phase5_motorbike_results
order by test_name;

rollback;
