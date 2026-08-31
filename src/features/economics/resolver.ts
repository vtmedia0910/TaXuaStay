import {
  ECONOMICS_POLICY_VERSION,
  commercialPriority,
  resolveCommercialFreshness,
  vietnamBusinessDate,
} from "@/features/economics/policy";
import type {
  CommercialPlanStatus,
  CommercialResolverRule,
  EconomicsNightLine,
  EconomicsQuote,
  EconomicsWarningCode,
  SupplierRelationshipRange,
} from "@/features/economics/types";
import type { PriceNightLine, PriceQuote } from "@/features/pricing/types";
import { enumerateStayNights } from "@/features/pricing/resolver";

function isWithin(date: string, from: string | null, until: string | null) {
  return (!from || date >= from) && (!until || date <= until);
}

function isoWeekday(date: string) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function relationshipCoversNight(ranges: SupplierRelationshipRange[], night: string) {
  return ranges.some((range) => isWithin(night, range.valid_from, range.valid_until));
}

export function isCommercialRuleApplicable(
  rule: CommercialResolverRule,
  night: string,
  eligiblePlanStatuses: readonly CommercialPlanStatus[] = ["active"],
) {
  if (!rule.is_active || rule.supplier_status === "archived" || !eligiblePlanStatuses.includes(rule.plan_status)) return false;
  if (!isWithin(night, rule.plan_valid_from, rule.plan_valid_until)) return false;
  if (!isWithin(night, rule.effective_from, rule.effective_until)) return false;
  if (!relationshipCoversNight(rule.relationship_ranges, night)) return false;

  const weekday = isoWeekday(night);
  if (rule.iso_weekdays?.length) return rule.iso_weekdays.includes(weekday);
  if (rule.rate_type === "weekday") return weekday >= 1 && weekday <= 4;
  if (rule.rate_type === "weekend") return weekday >= 5 && weekday <= 7;
  return true;
}

function appliesBeforeRelationship(
  rule: CommercialResolverRule,
  night: string,
  eligiblePlanStatuses: readonly CommercialPlanStatus[],
) {
  return isCommercialRuleApplicable({ ...rule, relationship_ranges: [{ valid_from: null, valid_until: null }] }, night, eligiblePlanStatuses);
}

function compareRules(left: CommercialResolverRule, right: CommercialResolverRule) {
  const a = commercialPriority(left.rate_type, left.priority, left.plan_priority);
  const b = commercialPriority(right.rate_type, right.priority, right.plan_priority);
  return b[0] - a[0] || b[1] - a[1] || b[2] - a[2];
}

function samePriority(left: CommercialResolverRule, right: CommercialResolverRule) {
  const a = commercialPriority(left.rate_type, left.priority, left.plan_priority);
  const b = commercialPriority(right.rate_type, right.priority, right.plan_priority);
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function missingSellLine(date: string): PriceNightLine {
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

function uniqueWarnings(values: EconomicsWarningCode[]) {
  return [...new Set(values)];
}

function resolveNight(input: {
  date: string;
  sellLine: PriceNightLine;
  rules: CommercialResolverRule[];
  eligiblePlanStatuses: readonly CommercialPlanStatus[];
  now: Date;
}): EconomicsNightLine {
  const warnings: EconomicsWarningCode[] = [];
  if (input.sellLine.state === "missing") warnings.push("sell-missing");
  if (input.sellLine.state === "conflict") warnings.push("sell-conflict");

  const relationshipCandidates = input.rules.filter((rule) =>
    appliesBeforeRelationship(rule, input.date, input.eligiblePlanStatuses),
  );
  const matches = relationshipCandidates
    .filter((rule) => relationshipCoversNight(rule.relationship_ranges, input.date))
    .sort(compareRules);

  if (!matches.length) {
    warnings.push("cost-missing", "market-missing");
    if (relationshipCandidates.length) warnings.push("supplier-relationship-inactive");
    return {
      date: input.date,
      state: input.sellLine.state === "conflict" ? "conflict" : "incomplete",
      sell_state: input.sellLine.state,
      sell_price_vnd: input.sellLine.base_price_vnd,
      sell_rule_id: input.sellLine.rule_id,
      sell_rate_plan_id: input.sellLine.rate_plan_id,
      net_cost_vnd: null,
      market_reference_vnd: null,
      gross_contribution_vnd: null,
      commercial_rule_id: null,
      commercial_rate_plan_id: null,
      supplier_id: null,
      cost_source: null,
      commercial_freshness: "unknown",
      verified_at: null,
      valid_until: null,
      conflicting_commercial_rule_ids: [],
      warnings: uniqueWarnings(warnings),
    };
  }

  const winner = matches[0];
  const ties = matches.filter((rule) => samePriority(rule, winner));
  if (ties.length > 1) {
    warnings.push("commercial-conflict");
    return {
      date: input.date,
      state: "conflict",
      sell_state: input.sellLine.state,
      sell_price_vnd: input.sellLine.base_price_vnd,
      sell_rule_id: input.sellLine.rule_id,
      sell_rate_plan_id: input.sellLine.rate_plan_id,
      net_cost_vnd: null,
      market_reference_vnd: null,
      gross_contribution_vnd: null,
      commercial_rule_id: null,
      commercial_rate_plan_id: null,
      supplier_id: null,
      cost_source: null,
      commercial_freshness: "unknown",
      verified_at: null,
      valid_until: null,
      conflicting_commercial_rule_ids: ties.map((rule) => rule.id).sort(),
      warnings: uniqueWarnings(warnings),
    };
  }

  const freshness = resolveCommercialFreshness(winner, input.date, input.now);
  const requiredThrough = input.date > (vietnamBusinessDate(input.now) ?? "")
    ? input.date
    : (vietnamBusinessDate(input.now) ?? input.date);
  if (winner.net_cost_vnd === null) warnings.push("cost-missing");
  if (winner.market_reference_vnd === null) warnings.push("market-missing");
  if (winner.valid_until !== null && winner.valid_until < requiredThrough) warnings.push("commercial-expired");
  if (freshness === "reference" || freshness === "unknown") warnings.push("commercial-stale");
  if (winner.market_reference_vnd !== null && (freshness === "reference" || freshness === "unknown")) {
    warnings.push("market-stale");
  }
  const contribution = input.sellLine.state === "resolved" && input.sellLine.base_price_vnd !== null && winner.net_cost_vnd !== null
    ? input.sellLine.base_price_vnd - winner.net_cost_vnd
    : null;
  if (contribution !== null && contribution < 0) warnings.push("negative-contribution");
  const hasConflict = input.sellLine.state === "conflict";
  const complete = input.sellLine.state === "resolved" && winner.net_cost_vnd !== null;

  return {
    date: input.date,
    state: hasConflict ? "conflict" : complete ? "resolved" : "incomplete",
    sell_state: input.sellLine.state,
    sell_price_vnd: input.sellLine.base_price_vnd,
    sell_rule_id: input.sellLine.rule_id,
    sell_rate_plan_id: input.sellLine.rate_plan_id,
    net_cost_vnd: winner.net_cost_vnd,
    market_reference_vnd: winner.market_reference_vnd,
    gross_contribution_vnd: contribution,
    commercial_rule_id: winner.id,
    commercial_rate_plan_id: winner.commercial_rate_plan_id,
    supplier_id: winner.supplier_id,
    cost_source: winner.source,
    commercial_freshness: freshness,
    verified_at: winner.verified_at,
    valid_until: winner.valid_until,
    conflicting_commercial_rule_ids: [],
    warnings: uniqueWarnings(warnings),
  };
}

export function resolveRoomEconomics(input: {
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  sellQuote: PriceQuote;
  commercialRules: CommercialResolverRule[];
  eligiblePlanStatuses?: readonly CommercialPlanStatus[];
  now?: Date;
}): EconomicsQuote {
  const dates = enumerateStayNights(input.checkIn, input.checkOut);
  const sellLines = new Map(input.sellQuote.nightly_lines.map((line) => [line.date, line]));
  const eligiblePlanStatuses = input.eligiblePlanStatuses ?? ["active"];
  const now = input.now ?? new Date();
  const roomRules = input.commercialRules.filter((rule) => rule.room_type_id === input.roomTypeId);
  const nightlyLines = dates.map((date) => resolveNight({
    date,
    sellLine: sellLines.get(date) ?? missingSellLine(date),
    rules: roomRules,
    eligiblePlanStatuses,
    now,
  }));

  const hasConflict = nightlyLines.some((line) => line.state === "conflict");
  const sellComplete = dates.length > 0 && nightlyLines.every((line) => line.sell_state === "resolved" && line.sell_price_vnd !== null);
  const costComplete = dates.length > 0 && nightlyLines.every((line) => line.net_cost_vnd !== null && !line.conflicting_commercial_rule_ids.length);
  const marketComplete = dates.length > 0 && nightlyLines.every((line) => line.market_reference_vnd !== null && !line.conflicting_commercial_rule_ids.length);
  const sellSubtotal = sellComplete ? nightlyLines.reduce((sum, line) => sum + (line.sell_price_vnd ?? 0), 0) : null;
  const costTotal = costComplete ? nightlyLines.reduce((sum, line) => sum + (line.net_cost_vnd ?? 0), 0) : null;
  const marketTotal = marketComplete ? nightlyLines.reduce((sum, line) => sum + (line.market_reference_vnd ?? 0), 0) : null;
  const contribution = sellSubtotal !== null && costTotal !== null ? sellSubtotal - costTotal : null;
  const marginBps = contribution !== null && sellSubtotal !== null && sellSubtotal > 0
    ? Math.round(contribution * 10_000 / sellSubtotal)
    : null;
  const hasAnyData = nightlyLines.some((line) => line.sell_price_vnd !== null || line.net_cost_vnd !== null || line.market_reference_vnd !== null);

  return {
    room_type_id: input.roomTypeId,
    check_in: input.checkIn,
    check_out: input.checkOut,
    currency: "VND",
    nights: dates.length,
    sell_quote: input.sellQuote,
    nightly_lines: nightlyLines,
    sell_subtotal_vnd: sellSubtotal,
    net_cost_total_vnd: costTotal,
    market_reference_total_vnd: marketTotal,
    gross_contribution_vnd: contribution,
    gross_margin_bps: marginBps,
    status: hasConflict ? "conflict" : sellComplete && costComplete ? "complete" : hasAnyData ? "partial" : "unknown",
    missing_dates: nightlyLines.filter((line) => line.sell_price_vnd === null || line.net_cost_vnd === null).map((line) => line.date),
    conflict_dates: nightlyLines.filter((line) => line.state === "conflict").map((line) => line.date),
    policy_version: ECONOMICS_POLICY_VERSION,
  };
}
