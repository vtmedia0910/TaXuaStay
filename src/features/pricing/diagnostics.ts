import { RATE_TYPE_PRECEDENCE, RECENT_PRICE_DAYS, vietnamDate } from "@/features/pricing/policy";
import { dateIntervalsOverlap, intersectDateIntervals } from "@/features/pricing/intervals";
import type { AdminPricingIssue, RatePlanDto, RoomRateRuleDto } from "@/features/pricing/types";

function daysOverlap(left: RoomRateRuleDto, right: RoomRateRuleDto) {
  const defaults = (rule: RoomRateRuleDto) => rule.days_of_week?.length
    ? rule.days_of_week
    : rule.rate_type === "weekday" ? [1, 2, 3, 4]
      : rule.rate_type === "weekend" ? [5, 6, 7] : [1, 2, 3, 4, 5, 6, 7];
  return defaults(left).some((day) => defaults(right).includes(day));
}

export function detectAdminPricingIssues(input: {
  plans: RatePlanDto[];
  rules: RoomRateRuleDto[];
  activeRoomIds: string[];
  now?: Date;
}): AdminPricingIssue[] {
  const now = input.now ?? new Date();
  const today = vietnamDate(now);
  const plans = new Map(input.plans.map((plan) => [plan.id, plan]));
  const issues: AdminPricingIssue[] = [];

  for (const plan of input.plans) {
    if (plan.is_active && plan.valid_until && plan.valid_until < today) {
      issues.push({ severity: "warning", code: "expired-plan", message: `Bảng giá “${plan.name}” đang hoạt động nhưng đã hết thời hạn.` });
    }
  }

  for (const rule of input.rules) {
    const plan = plans.get(rule.rate_plan_id);
    if (plan && !dateIntervalsOverlap(rule, plan)) {
      issues.push({
        severity: rule.is_active ? "error" : "warning",
        code: "disjoint-range",
        room_type_id: rule.room_type_id,
        rule_ids: [rule.id],
        message: `Quy tắc ${rule.id.slice(0, 8)} không giao ngày với bảng giá “${plan.name}” nên không thể áp dụng.`,
      });
    }
    if (!rule.is_active || !rule.price_verified_at) continue;
    const age = now.getTime() - new Date(rule.price_verified_at).getTime();
    if ((rule.price_valid_until && rule.price_valid_until < today) || age > RECENT_PRICE_DAYS * 86_400_000) {
      issues.push({ severity: "warning", code: "stale", room_type_id: rule.room_type_id, rule_ids: [rule.id], message: `Quy tắc ${rule.id.slice(0, 8)} cần rà soát lại nguồn và thời hạn giá.` });
    }
  }

  const activeRules = input.rules.filter((rule) => {
    const plan = plans.get(rule.rate_plan_id);
    return rule.is_active && plan?.is_active && dateIntervalsOverlap(rule, plan);
  });
  for (let index = 0; index < activeRules.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < activeRules.length; otherIndex += 1) {
      const left = activeRules[index];
      const right = activeRules[otherIndex];
      const leftPlan = plans.get(left.rate_plan_id);
      const rightPlan = plans.get(right.rate_plan_id);
      if (!leftPlan || !rightPlan || left.room_type_id !== right.room_type_id) continue;
      if (RATE_TYPE_PRECEDENCE[left.rate_type] !== RATE_TYPE_PRECEDENCE[right.rate_type]) continue;
      if (left.priority !== right.priority || leftPlan.priority !== rightPlan.priority) continue;
      const leftRange = intersectDateIntervals(left, leftPlan);
      const rightRange = intersectDateIntervals(right, rightPlan);
      if (!leftRange || !rightRange || !dateIntervalsOverlap(leftRange, rightRange)) continue;
      if (!daysOverlap(left, right)) continue;
      issues.push({
        severity: "error",
        code: "overlap",
        room_type_id: left.room_type_id,
        rule_ids: [left.id, right.id],
        message: `Hai quy tắc ${left.id.slice(0, 8)} và ${right.id.slice(0, 8)} có cùng ưu tiên hiệu lực và có thể gây xung đột.`,
      });
    }
  }

  for (const roomId of input.activeRoomIds) {
    if (!activeRules.some((rule) => rule.room_type_id === roomId && plans.get(rule.rate_plan_id)?.publish_status === "published")) {
      issues.push({ severity: "warning", code: "missing-rule", room_type_id: roomId, message: `Phòng ${roomId.slice(0, 8)} đang hoạt động nhưng chưa có quy tắc giá công khai hoạt động.` });
    }
  }
  return issues;
}
