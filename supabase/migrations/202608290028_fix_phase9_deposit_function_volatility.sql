-- Migration 027 is remote-applied and immutable. Supabase linked DB lint
-- classifies the jsonb-returning expression in this pure calculator as STABLE.
-- The function is not used in an index or generated column, so matching that
-- volatility is the narrow, behavior-preserving correction.

alter function public.phase9_calculate_deposit(text, bigint, bigint, integer) stable;

comment on function public.phase9_calculate_deposit(text, bigint, bigint, integer) is
  'Deterministic provider-neutral VND deposit calculation. Marked STABLE to match PostgreSQL jsonb expression volatility; it reads no tables.';
