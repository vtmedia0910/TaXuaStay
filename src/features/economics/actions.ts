"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { commercialRatePlanSchema, roomCommercialRuleSchema } from "@/features/economics/schema";
import { dateIntervalsOverlap } from "@/features/pricing/intervals";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const economicsPath = "/admin/economics";

function vietnamLocalDateTime(value: string | null) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}+07:00`;
}

function revalidateEconomics() {
  revalidatePath(economicsPath);
  revalidatePath(`${economicsPath}/plans/[id]/edit`, "page");
  revalidatePath(`${economicsPath}/rules/[id]/edit`, "page");
}

export async function saveCommercialRatePlanAction(formData: FormData) {
  const user = await requireAdminUser(["admin", "staff"], `${economicsPath}?error=unauthorized`);
  const parsed = commercialRatePlanSchema.safeParse({
    id: formData.get("id"),
    supplier_id: formData.get("supplier_id"),
    property_id: formData.get("property_id"),
    code: formData.get("code"),
    name: formData.get("name"),
    valid_from: formData.get("valid_from"),
    valid_until: formData.get("valid_until"),
    priority: formData.get("priority"),
    status: formData.get("status"),
    source: formData.get("source"),
    contract_reference: formData.get("contract_reference"),
    notes_internal: formData.get("notes_internal"),
  });
  if (!parsed.success) redirect(`${economicsPath}?error=economics-plan-invalid`);
  const value = parsed.data;
  if (user.role !== "admin" && (value.status !== "draft" || value.contract_reference !== null)) {
    redirect(`${economicsPath}?error=economics-lifecycle-forbidden`);
  }
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${economicsPath}?error=config`);
  const { id, supplier_id, property_id, code, ...editablePayload } = value;
  const insertPayload = { ...editablePayload, supplier_id, property_id, code, currency: "VND" as const };
  if (id) {
    const { data: activeRules, error: activeRulesError } = await supabase
      .from("room_commercial_rules")
      .select("effective_from,effective_until")
      .eq("commercial_rate_plan_id", id)
      .eq("is_active", true)
      .overrideTypes<Array<{ effective_from: string | null; effective_until: string | null }>, { merge: false }>();
    if (activeRulesError) redirect(`${economicsPath}?error=economics-plan-save`);
    if ((activeRules ?? []).some((rule) => !dateIntervalsOverlap(
      { valid_from: editablePayload.valid_from, valid_until: editablePayload.valid_until },
      { valid_from: rule.effective_from, valid_until: rule.effective_until },
    ))) redirect(`${economicsPath}?error=economics-plan-range`);
  }
  const mutation = id
    ? supabase.from("commercial_rate_plans").update(editablePayload).eq("id", id).select("id").single()
    : supabase.from("commercial_rate_plans").insert(insertPayload).select("id").single();
  const { data, error } = await mutation.overrideTypes<{ id: string }, { merge: false }>();
  if (error || !data) redirect(`${economicsPath}?error=economics-plan-save`);
  revalidateEconomics();
  redirect(`${economicsPath}/plans/${data.id}/edit?saved=economics-plan`);
}

export async function saveRoomCommercialRuleAction(formData: FormData) {
  await requireAdminUser(["admin", "staff"], `${economicsPath}?error=unauthorized`);
  const parsed = roomCommercialRuleSchema.safeParse({
    id: formData.get("id"),
    commercial_rate_plan_id: formData.get("commercial_rate_plan_id"),
    supplier_id: formData.get("supplier_id"),
    property_id: formData.get("property_id"),
    room_type_id: formData.get("room_type_id"),
    rate_type: formData.get("rate_type"),
    net_cost_vnd: formData.get("net_cost_vnd"),
    market_reference_vnd: formData.get("market_reference_vnd"),
    effective_from: formData.get("effective_from"),
    effective_until: formData.get("effective_until"),
    iso_weekdays: formData.getAll("iso_weekdays"),
    priority: formData.get("priority"),
    source: formData.get("source"),
    verified_at: formData.get("verified_at"),
    valid_until: formData.get("valid_until"),
    is_active: formData.get("is_active"),
    notes_internal: formData.get("notes_internal"),
  });
  if (!parsed.success) redirect(`${economicsPath}?error=economics-rule-invalid`);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(`${economicsPath}?error=config`);
  const { id, verified_at, commercial_rate_plan_id, supplier_id, property_id, room_type_id, ...editableRule } = parsed.data;
  const value = {
    ...editableRule,
    commercial_rate_plan_id,
    supplier_id,
    property_id,
    room_type_id,
    verified_at: vietnamLocalDateTime(verified_at),
  };
  const { data: plan, error: planError } = await supabase
    .from("commercial_rate_plans")
    .select("supplier_id,property_id,valid_from,valid_until,status")
    .eq("id", value.commercial_rate_plan_id)
    .maybeSingle()
    .overrideTypes<{
      supplier_id: string;
      property_id: string;
      valid_from: string | null;
      valid_until: string | null;
      status: string;
    }, { merge: false }>();
  if (planError || !plan || plan.supplier_id !== value.supplier_id || plan.property_id !== value.property_id) {
    redirect(`${economicsPath}?error=economics-rule-owner`);
  }
  if (value.is_active && !dateIntervalsOverlap(
    { valid_from: value.effective_from, valid_until: value.effective_until },
    { valid_from: plan.valid_from, valid_until: plan.valid_until },
  )) redirect(`${economicsPath}?error=economics-rule-range`);
  const mutation = id
    ? supabase.from("room_commercial_rules").update({ ...editableRule, verified_at: value.verified_at }).eq("id", id).select("id").single()
    : supabase.from("room_commercial_rules").insert(value).select("id").single();
  const { data, error } = await mutation.overrideTypes<{ id: string }, { merge: false }>();
  if (error || !data) redirect(`${economicsPath}?error=economics-rule-save`);
  revalidateEconomics();
  redirect(`${economicsPath}/rules/${data.id}/edit?saved=economics-rule`);
}
