"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/features/admin/auth";
import { dateIntervalsOverlap } from "@/features/pricing/intervals";
import { ratePlanSchema, roomRateRuleSchema } from "@/features/pricing/schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function vietnamLocalDateTime(value: string | null) {
  if (!value) return null;
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}+07:00`;
}

function revalidatePricing() {
  revalidatePath("/admin/rates");
  revalidatePath("/tim-phong");
  revalidatePath("/stay");
  revalidatePath("/homestay/[slug]", "page");
  revalidatePath("/homestay/[slug]/phong/[roomSlug]", "page");
  revalidatePath("/stay/[slug]", "page");
  revalidatePath("/stay/[slug]/[roomSlug]", "page");
}

export async function saveRatePlanAction(formData: FormData) {
  await requireAdminUser();
  const parsed = ratePlanSchema.safeParse({
    id: formData.get("id"),
    property_id: formData.get("property_id"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    valid_from: formData.get("valid_from"),
    valid_until: formData.get("valid_until"),
    priority: formData.get("priority"),
    is_active: formData.get("is_active"),
    publish_status: formData.get("publish_status"),
  });
  if (!parsed.success) redirect("/admin/rates?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/rates?error=config");
  const { id, ...value } = parsed.data;
  if (id) {
    const { data: activeRules, error: activeRulesError } = await supabase
      .from("room_rate_rules")
      .select("valid_from,valid_until")
      .eq("rate_plan_id", id)
      .eq("is_active", true)
      .overrideTypes<Array<{ valid_from: string | null; valid_until: string | null }>, { merge: false }>();
    if (activeRulesError) redirect("/admin/rates?error=rate-plan-save");
    if ((activeRules ?? []).some((rule) => !dateIntervalsOverlap(value, rule))) {
      redirect("/admin/rates?error=rate-plan-range");
    }
  }
  const mutation = id
    ? supabase.from("rate_plans").update({ ...value, currency: "VND" }).eq("id", id).select("id").single()
    : supabase.from("rate_plans").insert({ ...value, currency: "VND" }).select("id").single();
  const { data, error } = await mutation.overrideTypes<{ id: string }, { merge: false }>();
  if (error || !data) redirect("/admin/rates?error=rate-plan-save");
  revalidatePricing();
  redirect(`/admin/rates/plans/${data.id}/edit?saved=1`);
}

export async function saveRoomRateRuleAction(formData: FormData) {
  await requireAdminUser();
  const parsed = roomRateRuleSchema.safeParse({
    id: formData.get("id"),
    rate_plan_id: formData.get("rate_plan_id"),
    room_type_id: formData.get("room_type_id"),
    rate_type: formData.get("rate_type"),
    price_vnd: formData.get("price_vnd"),
    extra_adult_vnd: formData.get("extra_adult_vnd"),
    extra_child_vnd: formData.get("extra_child_vnd"),
    valid_from: formData.get("valid_from"),
    valid_until: formData.get("valid_until"),
    days_of_week: formData.getAll("days_of_week"),
    priority: formData.get("priority"),
    source: formData.get("source"),
    price_verified_at: formData.get("price_verified_at"),
    price_valid_until: formData.get("price_valid_until"),
    is_active: formData.get("is_active"),
    internal_notes: formData.get("internal_notes"),
  });
  if (!parsed.success) redirect("/admin/rates?error=invalid");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/rates?error=config");
  const { id, price_verified_at, ...rest } = parsed.data;
  const value = { ...rest, price_verified_at: vietnamLocalDateTime(price_verified_at) };
  const { data: plan, error: planError } = await supabase
    .from("rate_plans")
    .select("valid_from,valid_until")
    .eq("id", value.rate_plan_id)
    .maybeSingle()
    .overrideTypes<{ valid_from: string | null; valid_until: string | null }, { merge: false }>();
  if (planError || !plan) redirect("/admin/rates?error=rate-rule-save");
  if (value.is_active && !dateIntervalsOverlap(value, plan)) {
    redirect("/admin/rates?error=rate-rule-range");
  }
  const mutation = id
    ? supabase.from("room_rate_rules").update(value).eq("id", id).select("id").single()
    : supabase.from("room_rate_rules").insert(value).select("id").single();
  const { data, error } = await mutation.overrideTypes<{ id: string }, { merge: false }>();
  if (error || !data) redirect("/admin/rates?error=rate-rule-save");
  revalidatePricing();
  redirect(`/admin/rates/rules/${data.id}/edit?saved=1`);
}
