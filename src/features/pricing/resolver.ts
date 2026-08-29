import {
  MAX_PRICE_QUOTE_NIGHTS,
  PRICE_POLICY_VERSION,
  RATE_TYPE_PRECEDENCE,
  resolvePriceConfidence,
  worseConfidence,
} from "@/features/pricing/policy";
import type { PriceConfidence, PriceNightLine, PriceQuote, PublicRateRuleDto } from "@/features/pricing/types";
import { enumerateLodgingNights } from "@/lib/lodging-dates";

export function enumerateStayNights(checkIn: string, checkOut: string) {
  return enumerateLodgingNights(checkIn, checkOut, MAX_PRICE_QUOTE_NIGHTS);
}

function isWithin(date: string, from: string | null, until: string | null) {
  return (!from || date >= from) && (!until || date <= until);
}

function isoWeekday(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isRuleApplicable(rule: PublicRateRuleDto, night: string) {
  if (!isWithin(night, rule.plan_valid_from, rule.plan_valid_until)) return false;
  if (!isWithin(night, rule.rule_valid_from, rule.rule_valid_until)) return false;

  const weekday = isoWeekday(night);
  if (rule.days_of_week?.length) return rule.days_of_week.includes(weekday);
  if (rule.rate_type === "weekday") return weekday >= 1 && weekday <= 4;
  if (rule.rate_type === "weekend") return weekday >= 5 && weekday <= 7;
  return true;
}

function priorityKey(rule: PublicRateRuleDto) {
  return [RATE_TYPE_PRECEDENCE[rule.rate_type], rule.rule_priority, rule.plan_priority] as const;
}

function comparePriority(left: PublicRateRuleDto, right: PublicRateRuleDto) {
  const leftKey = priorityKey(left);
  const rightKey = priorityKey(right);
  return rightKey[0] - leftKey[0] || rightKey[1] - leftKey[1] || rightKey[2] - leftKey[2];
}

function sameEffectivePriority(left: PublicRateRuleDto, right: PublicRateRuleDto) {
  const leftKey = priorityKey(left);
  const rightKey = priorityKey(right);
  return leftKey[0] === rightKey[0] && leftKey[1] === rightKey[1] && leftKey[2] === rightKey[2];
}

function missingLine(date: string): PriceNightLine {
  return {
    date,
    state: "missing",
    base_price_vnd: null,
    rate_type: null,
    rule_id: null,
    rate_plan_id: null,
    source: null,
    confidence: "unknown",
    price_verified_at: null,
    price_valid_until: null,
    extra_adult_vnd: null,
    extra_child_vnd: null,
    extra_charges_applied: false,
    conflicting_rule_ids: [],
  };
}

export function resolveRoomPrice(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  rules: PublicRateRuleDto[];
  now?: Date;
}): PriceQuote {
  const now = input.now ?? new Date();
  const nights = enumerateStayNights(input.checkIn, input.checkOut);
  const roomRules = input.rules.filter((rule) => rule.room_type_id === input.roomTypeId);

  const lines = nights.map<PriceNightLine>((date) => {
    const matches = roomRules.filter((rule) => isRuleApplicable(rule, date)).sort(comparePriority);
    if (!matches.length) return missingLine(date);

    const winner = matches[0];
    const tied = matches.filter((rule) => sameEffectivePriority(rule, winner));
    if (tied.length > 1) {
      return {
        ...missingLine(date),
        state: "conflict",
        conflicting_rule_ids: tied.map((rule) => rule.rule_id).sort(),
      };
    }

    return {
      date,
      state: "resolved",
      base_price_vnd: winner.price_vnd,
      rate_type: winner.rate_type,
      rule_id: winner.rule_id,
      rate_plan_id: winner.rate_plan_id,
      source: winner.source,
      confidence: resolvePriceConfidence(winner, date, now),
      price_verified_at: winner.price_verified_at,
      price_valid_until: winner.price_valid_until,
      extra_adult_vnd: winner.extra_adult_vnd,
      extra_child_vnd: winner.extra_child_vnd,
      extra_charges_applied: false,
      conflicting_rule_ids: [],
    };
  });

  const hasConflict = lines.some((line) => line.state === "conflict");
  const hasMissing = !nights.length || lines.some((line) => line.state === "missing");
  const complete = nights.length > 0 && !hasConflict && !hasMissing;
  const subtotal = complete
    ? lines.reduce((sum, line) => sum + (line.base_price_vnd ?? 0), 0)
    : null;
  const confidence = complete
    ? lines.reduce<PriceConfidence>((value, line) => worseConfidence(value, line.confidence), "verified")
    : "unknown";

  return {
    room_type_id: input.roomTypeId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    currency: "VND",
    nights: nights.length,
    nightly_lines: lines,
    subtotal_vnd: subtotal,
    discount_vnd: 0,
    fees_vnd: 0,
    total_vnd: subtotal,
    confidence,
    status: hasConflict ? "conflict" : hasMissing ? (lines.some((line) => line.state === "resolved") ? "partial" : "unknown") : "quoted",
    has_conflict: hasConflict,
    conflict_dates: lines.filter((line) => line.state === "conflict").map((line) => line.date),
    policy_version: PRICE_POLICY_VERSION,
  };
}

export function resolveRoomPrices(input: {
  roomTypeIds: string[];
  checkIn: string;
  checkOut: string;
  rules: PublicRateRuleDto[];
  now?: Date;
}) {
  return new Map(input.roomTypeIds.map((roomTypeId) => [roomTypeId, resolveRoomPrice({
    roomTypeId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rules: input.rules,
    now: input.now,
  })]));
}
