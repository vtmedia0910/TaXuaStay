-- The relationship predicate is called by SECURITY INVOKER validation triggers
-- during authenticated Admin/staff writes. Restore only that narrow execution
-- path after migration 019 removed default ACLs from every helper. RLS still
-- limits non-staff authenticated callers to a false result; anon stays denied.

grant execute on function public.has_current_supplier_property_relationship(uuid, uuid, date)
to authenticated;

comment on function public.has_current_supplier_property_relationship(uuid, uuid, date) is
  'Authenticated validation predicate protected by Supplier RLS; anonymous execution remains revoked.';
