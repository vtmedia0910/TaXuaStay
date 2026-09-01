import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import type { AdminBookingQuote, AdminCheckoutBundle, AdminCheckoutSession, AdminDepositPolicy, CheckoutReadinessDto } from "@/features/checkout/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminCheckoutBundle(bookingId: string): Promise<AdminCheckoutBundle | null> {
  await requireAdminUser();
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const [readinessResult, quotesResult, policiesResult, sessionsResult] = await Promise.all([
    client.rpc("get_admin_checkout_readiness", { target_booking_id: bookingId }),
    client.from("booking_quotes").select("id,booking_id,quote_version,quote_status,price_status,currency,booking_total_vnd,quoted_at,quote_expires_at,is_current,reason,superseded_at,expired_at,created_at").eq("booking_id", bookingId).order("quote_version", { ascending: false }),
    client.from("booking_deposit_policies").select("id,booking_id,policy_version,status,policy_type,fixed_amount_vnd,percentage_bps,free_cancel_until,non_refundable_after,manual_policy,cancellation_terms,is_current,created_at,superseded_at").eq("booking_id", bookingId).order("policy_version", { ascending: false }),
    client.from("checkout_sessions").select("id,booking_id,quote_id,quote_version,deposit_policy_id,deposit_policy_version,status,booking_total_vnd,amount_due_vnd,planned_remaining_balance_vnd,currency,readiness_policy_version,provider_state,expires_at,invalidated_at,invalidation_reason,created_at,updated_at").eq("booking_id", bookingId).order("created_at", { ascending: false }),
  ]);
  if (readinessResult.error || !readinessResult.data || quotesResult.error || policiesResult.error || sessionsResult.error) return null;
  const sessions = (sessionsResult.data ?? []).map((row) => ({ ...row, checkout_session_id: row.id })) as unknown as AdminCheckoutSession[];
  return {
    readiness: readinessResult.data as unknown as CheckoutReadinessDto,
    quotes: (quotesResult.data ?? []) as unknown as AdminBookingQuote[],
    policies: (policiesResult.data ?? []) as unknown as AdminDepositPolicy[],
    sessions,
  };
}
