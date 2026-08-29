-- Tà Xùa Stay V2 Phase 2: Verified Room Profile.
--
-- Pre-audit correction: migration 009 introduced the exact-room overload below
-- and revoked its default PUBLIC privilege, but did not restore EXECUTE for the
-- authenticated staff role used by the wrapper RPCs. Migration 009 is already
-- applied remotely and remains immutable, so the correction is additive here.

grant execute on function public.save_verification_core(
  uuid, text, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz, uuid[]
) to authenticated;
