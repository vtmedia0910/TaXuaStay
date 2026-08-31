-- Correct Phase 8 Booking-code generation after linked DB lint showed that
-- pgcrypto's gen_random_bytes is installed in the managed extensions schema.
-- Migration 024 is already remote-applied and remains immutable.

do $$
begin
  if has_schema_privilege('anon', 'extensions', 'CREATE')
    or has_schema_privilege('authenticated', 'extensions', 'CREATE') then
    raise exception 'Untrusted roles must not be able to create objects in the extensions schema';
  end if;
end;
$$;

alter function public.create_public_booking_request(jsonb, text, text)
  set search_path = pg_catalog, extensions;

comment on function public.create_public_booking_request(jsonb, text, text) is
  'Atomic, idempotent Phase 8 public boundary. Its restricted search path includes Supabase managed extensions only so pgcrypto can generate non-sequential Booking codes.';
