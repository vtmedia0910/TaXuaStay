import "server-only";

import { requireAdminUser } from "@/features/admin/auth";
import { ADMIN_RATE_PLAN_QUERY, ADMIN_RATE_RULE_QUERY, PUBLIC_RATE_RULE_QUERY } from "@/features/pricing/columns";
import { enumerateStayNights, resolveRoomPrices } from "@/features/pricing/resolver";
import type {
  AdminRatePlanOption,
  PriceQuote,
  PublicRateRuleDto,
  RatePlanDto,
  RoomRateRuleDto,
} from "@/features/pricing/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPublicPriceQuotes(input: {
  roomTypeIds: string[];
  checkIn?: string;
  checkOut?: string;
}): Promise<Map<string, PriceQuote>> {
  if (!input.roomTypeIds.length || !input.checkIn || !input.checkOut) return new Map();
  if (!enumerateStayNights(input.checkIn, input.checkOut).length) {
    return resolveRoomPrices({
      roomTypeIds: input.roomTypeIds,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rules: [],
    });
  }
  const supabase = createPublicSupabaseClient();
  if (!supabase) return new Map();

  const { data, error } = await supabase
    .from("public_room_rate_rules")
    .select(PUBLIC_RATE_RULE_QUERY)
    .in("room_type_id", input.roomTypeIds)
    .or(`rule_valid_from.is.null,rule_valid_from.lt.${input.checkOut}`)
    .or(`rule_valid_until.is.null,rule_valid_until.gte.${input.checkIn}`)
    .or(`plan_valid_from.is.null,plan_valid_from.lt.${input.checkOut}`)
    .or(`plan_valid_until.is.null,plan_valid_until.gte.${input.checkIn}`)
    .limit(5000)
    .overrideTypes<PublicRateRuleDto[], { merge: false }>();

  if (error) return new Map();
  return resolveRoomPrices({
    roomTypeIds: input.roomTypeIds,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rules: data ?? [],
  });
}

export async function getAdminRatePlans(): Promise<RatePlanDto[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("rate_plans")
    .select(ADMIN_RATE_PLAN_QUERY)
    .order("updated_at", { ascending: false })
    .limit(1000)
    .overrideTypes<RatePlanDto[], { merge: false }>();
  return error ? [] : (data ?? []);
}

export async function getAdminRatePlan(id: string): Promise<RatePlanDto | null> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("rate_plans")
    .select(ADMIN_RATE_PLAN_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RatePlanDto, { merge: false }>();
  return error ? null : data;
}

export async function getAdminRatePlanOptions(): Promise<AdminRatePlanOption[]> {
  const plans = await getAdminRatePlans();
  return plans.map(({ id, property_id, name, code, publish_status, is_active, priority }) => ({
    id,
    property_id,
    name,
    code,
    publish_status,
    is_active,
    priority,
  }));
}

export async function getAdminRateRules(): Promise<RoomRateRuleDto[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_rate_rules")
    .select(ADMIN_RATE_RULE_QUERY)
    .order("updated_at", { ascending: false })
    .limit(5000)
    .overrideTypes<RoomRateRuleDto[], { merge: false }>();
  return error ? [] : (data ?? []);
}

export async function getAdminRateRule(id: string): Promise<RoomRateRuleDto | null> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("room_rate_rules")
    .select(ADMIN_RATE_RULE_QUERY)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RoomRateRuleDto, { merge: false }>();
  return error ? null : data;
}

export async function getAdminPreviewRules(roomTypeId: string): Promise<PublicRateRuleDto[]> {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const [plansResult, rulesResult] = await Promise.all([
    supabase
      .from("rate_plans")
      .select(ADMIN_RATE_PLAN_QUERY)
      .overrideTypes<RatePlanDto[], { merge: false }>(),
    supabase
      .from("room_rate_rules")
      .select(ADMIN_RATE_RULE_QUERY)
      .eq("room_type_id", roomTypeId)
      .overrideTypes<RoomRateRuleDto[], { merge: false }>(),
  ]);
  if (plansResult.error || rulesResult.error) return [];
  const plans = new Map((plansResult.data ?? []).map((plan) => [plan.id, plan]));
  return (rulesResult.data ?? []).flatMap((rule) => {
    const plan = plans.get(rule.rate_plan_id);
    if (!plan || !plan.is_active || plan.publish_status === "archived" || !rule.is_active) return [];
    return [{
      rule_id: rule.id,
      rate_plan_id: plan.id,
      property_id: plan.property_id,
      room_type_id: rule.room_type_id,
      rate_type: rule.rate_type,
      price_vnd: rule.price_vnd,
      extra_adult_vnd: rule.extra_adult_vnd,
      extra_child_vnd: rule.extra_child_vnd,
      rule_valid_from: rule.valid_from,
      rule_valid_until: rule.valid_until,
      days_of_week: rule.days_of_week,
      rule_priority: rule.priority,
      plan_priority: plan.priority,
      source: rule.source,
      price_verified_at: rule.price_verified_at,
      price_valid_until: rule.price_valid_until,
      plan_valid_from: plan.valid_from,
      plan_valid_until: plan.valid_until,
    }];
  });
}
