import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import {
  ADMIN_COMMERCIAL_PLAN_QUERY,
  ADMIN_COMMERCIAL_RULE_QUERY,
  ADMIN_ECONOMICS_RELATIONSHIP_QUERY,
  ADMIN_ECONOMICS_SUPPLIER_QUERY,
} from "@/features/economics/columns";
import type {
  AdminCommercialPlanOption,
  AdminSupplierOption,
  CommercialRatePlanDto,
  CommercialResolverRule,
  RoomCommercialRuleDto,
  SupplierRelationshipRange,
} from "@/features/economics/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminCommercialPlans(): Promise<CommercialRatePlanDto[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("commercial_rate_plans")
    .select(ADMIN_COMMERCIAL_PLAN_QUERY)
    .order("updated_at", { ascending: false })
    .limit(1000)
    .overrideTypes<CommercialRatePlanDto[], { merge: false }>();
  return error ? [] : (data ?? []);
}

export async function getAdminCommercialPlan(id: string): Promise<CommercialRatePlanDto | null> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("commercial_rate_plans")
    .select(ADMIN_COMMERCIAL_PLAN_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<CommercialRatePlanDto, { merge: false }>();
  return error ? null : data;
}

export async function getAdminCommercialPlanOptions(): Promise<AdminCommercialPlanOption[]> {
  const plans = await getAdminCommercialPlans();
  return plans.map(({ id, supplier_id, property_id, name, code, status, priority }) => ({
    id,
    supplier_id,
    property_id,
    name,
    code,
    status,
    priority,
  }));
}

export async function getAdminCommercialRules(): Promise<RoomCommercialRuleDto[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_commercial_rules")
    .select(ADMIN_COMMERCIAL_RULE_QUERY)
    .order("updated_at", { ascending: false })
    .limit(5000)
    .overrideTypes<RoomCommercialRuleDto[], { merge: false }>();
  return error ? [] : (data ?? []);
}

export async function getAdminCommercialRule(id: string): Promise<RoomCommercialRuleDto | null> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("room_commercial_rules")
    .select(ADMIN_COMMERCIAL_RULE_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RoomCommercialRuleDto, { merge: false }>();
  return error ? null : data;
}

export async function getAdminEconomicsSupplierOptions(): Promise<AdminSupplierOption[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("suppliers")
    .select(ADMIN_ECONOMICS_SUPPLIER_QUERY)
    .order("display_name")
    .overrideTypes<AdminSupplierOption[], { merge: false }>();
  return error ? [] : (data ?? []);
}

export async function getAdminCommercialPreviewRules(roomTypeId: string): Promise<CommercialResolverRule[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const [{ data: rules, error: rulesError }, { data: plans, error: plansError }] = await Promise.all([
    supabase.from("room_commercial_rules").select(ADMIN_COMMERCIAL_RULE_QUERY).eq("room_type_id", roomTypeId)
      .overrideTypes<RoomCommercialRuleDto[], { merge: false }>(),
    supabase.from("commercial_rate_plans").select(ADMIN_COMMERCIAL_PLAN_QUERY)
      .overrideTypes<CommercialRatePlanDto[], { merge: false }>(),
  ]);
  if (rulesError || plansError || !rules?.length) return [];

  const supplierIds = [...new Set(rules.map((rule) => rule.supplier_id))];
  const propertyIds = [...new Set(rules.map((rule) => rule.property_id))];
  const [{ data: suppliers }, { data: links }] = await Promise.all([
    supabase.from("suppliers").select("id,status").in("id", supplierIds)
      .overrideTypes<Array<{ id: string; status: string }>, { merge: false }>(),
    supabase.from("supplier_properties").select(ADMIN_ECONOMICS_RELATIONSHIP_QUERY)
      .in("supplier_id", supplierIds).in("property_id", propertyIds)
      .overrideTypes<Array<{ supplier_id: string; property_id: string } & SupplierRelationshipRange>, { merge: false }>(),
  ]);
  const planMap = new Map((plans ?? []).map((plan) => [plan.id, plan]));
  const supplierMap = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier.status]));

  return rules.flatMap((rule) => {
    const plan = planMap.get(rule.commercial_rate_plan_id);
    if (!plan) return [];
    return [{
      ...rule,
      plan_priority: plan.priority,
      plan_status: plan.status,
      plan_valid_from: plan.valid_from,
      plan_valid_until: plan.valid_until,
      supplier_status: supplierMap.get(rule.supplier_id) ?? "archived",
      relationship_ranges: (links ?? [])
        .filter((link) => link.supplier_id === rule.supplier_id && link.property_id === rule.property_id)
        .map(({ valid_from, valid_until }) => ({ valid_from, valid_until })),
    }];
  });
}
