import type { EconomicsQuote } from "@/features/economics/types";
import { resolveMotorbikePublicTruth } from "@/features/motorbike/policy";
import {
  PACKAGE_COST_FRESH_MS,
  PACKAGE_POLICY_VERSION,
  PACKAGE_PRICE_FRESH_MS,
} from "@/features/packages/policy";
import type {
  AdminPackageComponent,
  PackageAvailabilityState,
  PackageComponentResolution,
  PackageQuoteInput,
  PackageSourceContext,
  PackageWarningCode,
  PrivatePackageComponentEconomics,
  PrivatePackageResolution,
  PublicPackage,
  PublicPackageComponent,
  PublicPackagePriceRule,
  PublicPackageQuote,
} from "@/features/packages/types";
import { enumerateStayNights } from "@/features/pricing/resolver";

function isWithin(value: number, minimum: number | null, maximum: number | null) {
  return (minimum === null || value >= minimum) && (maximum === null || value <= maximum);
}

function sameKeys(left: string[], right: string[]) {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

function normalizedKeys(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function validPastTimestamp(value: string, now: Date) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time <= now.getTime() ? time : null;
}

function priceSpecificity(rule: PublicPackagePriceRule) {
  return [
    rule.effective_from, rule.effective_until,
    rule.adults_min, rule.adults_max,
    rule.children_min, rule.children_max,
    rule.rooms_min, rule.rooms_max,
  ].filter((value) => value !== null).length + rule.selected_optional_component_keys.length;
}

function resolveSellPrice(input: {
  packageId: string;
  quoteInput: PackageQuoteInput;
  rules: PublicPackagePriceRule[];
  nights: string[];
  now: Date;
}) {
  if (!input.nights.length) {
    return { public: { status: "invalid" as const, currency: "VND" as const, total_vnd: null, price_source: null, verified_at: null, price_valid_until: null }, selectedRuleId: null, conflictIds: [] };
  }
  const selected = normalizedKeys(input.quoteInput.selected_optional_component_keys);
  const firstNight = input.nights[0];
  const lastNight = input.nights.at(-1) as string;
  const candidates = input.rules.filter((rule) =>
    rule.package_id === input.packageId
    && (!rule.effective_from || rule.effective_from <= firstNight)
    && (!rule.effective_until || rule.effective_until >= lastNight)
    && isWithin(input.quoteInput.adults, rule.adults_min, rule.adults_max)
    && isWithin(input.quoteInput.children, rule.children_min, rule.children_max)
    && isWithin(input.quoteInput.rooms, rule.rooms_min, rule.rooms_max)
    && sameKeys(normalizedKeys(rule.selected_optional_component_keys), selected),
  ).sort((left, right) => right.priority - left.priority || priceSpecificity(right) - priceSpecificity(left));

  if (!candidates.length) {
    return { public: { status: "unknown" as const, currency: "VND" as const, total_vnd: null, price_source: null, verified_at: null, price_valid_until: null }, selectedRuleId: null, conflictIds: [] };
  }
  const winner = candidates[0];
  const specificity = priceSpecificity(winner);
  const ties = candidates.filter((rule) => rule.priority === winner.priority && priceSpecificity(rule) === specificity);
  if (ties.length > 1) {
    return {
      public: { status: "conflict" as const, currency: "VND" as const, total_vnd: null, price_source: null, verified_at: null, price_valid_until: null },
      selectedRuleId: null,
      conflictIds: ties.flatMap((rule) => rule.rule_id ? [rule.rule_id] : []),
    };
  }
  const verifiedTime = validPastTimestamp(winner.verified_at, input.now);
  const current = verifiedTime !== null
    && input.now.getTime() - verifiedTime <= PACKAGE_PRICE_FRESH_MS
    && winner.price_valid_until >= lastNight;
  return {
    public: {
      status: current ? "quoted" as const : "stale" as const,
      currency: "VND" as const,
      total_vnd: current ? winner.price_vnd : null,
      price_source: current ? winner.price_source : null,
      verified_at: current ? winner.verified_at : null,
      price_valid_until: current ? winner.price_valid_until : null,
    },
    selectedRuleId: current ? winner.rule_id ?? null : null,
    conflictIds: [],
  };
}

function roomAvailability(state: string | undefined): PackageAvailabilityState {
  if (state === "sold_out") return "unavailable";
  if (state === "live" || state === "verified_today") return "recorded_available";
  if (state === "needs_confirmation") return "needs_confirmation";
  return "unknown";
}

function resolveComponent(
  component: PublicPackageComponent,
  selected: Set<string>,
  context: PackageSourceContext,
  now: Date,
): PackageComponentResolution {
  const isSelected = component.is_required || selected.has(component.component_key);
  if (component.component_type === "ROOM") {
    const sourceState = component.room_type_id
      ? context.roomAvailabilityQuotes.get(component.room_type_id)?.state ?? "unknown"
      : "unknown";
    return {
      component_key: component.component_key,
      component_type: component.component_type,
      name: component.source_name,
      parent_name: component.source_parent_name,
      path: component.source_path,
      quantity: component.quantity,
      is_required: component.is_required,
      is_selected: isSelected,
      confirmation_mode: component.confirmation_mode,
      availability_state: roomAvailability(sourceState),
      source_availability_state: sourceState,
      public_copy: component.public_copy_override,
      caveat: "Tình trạng phòng là dữ liệu tham khảo theo ngày, chưa phải giữ chỗ.",
    };
  }
  if (component.component_type === "MOTORBIKE") {
    const offering = component.motorbike_offering_slug
      ? context.motorbikeOfferings.get(component.motorbike_offering_slug)
      : undefined;
    const truth = offering ? resolveMotorbikePublicTruth(offering, now) : null;
    const unavailable = offering?.availability_state === "unavailable";
    return {
      component_key: component.component_key,
      component_type: component.component_type,
      name: component.source_name,
      parent_name: null,
      path: component.source_path,
      quantity: component.quantity,
      is_required: component.is_required,
      is_selected: isSelected,
      confirmation_mode: "manual",
      availability_state: unavailable ? "unavailable" : truth?.sourceIsStale ? "unknown" : "needs_confirmation",
      source_availability_state: unavailable ? "unavailable" : truth ? "manual" : "unknown",
      public_copy: component.public_copy_override,
      caveat: "Xe máy luôn được xác nhận thủ công với nhà vận hành; website không giữ xe.",
    };
  }
  return {
    component_key: component.component_key,
    component_type: "CUSTOM",
    name: component.custom_name ?? component.source_name,
    parent_name: null,
    path: null,
    quantity: component.quantity,
    is_required: component.is_required,
    is_selected: isSelected,
    confirmation_mode: component.confirmation_mode,
    availability_state: component.confirmation_mode === "unknown" ? "unknown" : "needs_confirmation",
    source_availability_state: "unknown",
    public_copy: component.public_copy_override ?? component.custom_description,
    caveat: "Nội dung này cần được đội ngũ xác nhận trước chuyến đi.",
  };
}

function aggregateAvailability(components: PackageComponentResolution[]) {
  const included = components.filter((component) => component.is_selected);
  if (!included.length) return "unknown" as const;
  if (included.some((component) => component.availability_state === "unavailable")) return "unavailable" as const;
  if (included.some((component) => component.availability_state === "unknown")) return "unknown" as const;
  if (included.some((component) => component.availability_state === "needs_confirmation")) return "needs_confirmation" as const;
  return "recorded_available" as const;
}

function validateInput(input: PackageQuoteInput, components: PublicPackageComponent[]) {
  if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 100) return false;
  if (!Number.isInteger(input.children) || input.children < 0 || input.children > 100) return false;
  if (!Number.isInteger(input.rooms) || input.rooms < 1 || input.rooms > 100) return false;
  const optional = new Set(components.filter((component) => !component.is_required).map((component) => component.component_key));
  return normalizedKeys(input.selected_optional_component_keys).every((key) => optional.has(key));
}

export function resolvePublicPackage(input: {
  package: PublicPackage;
  components: PublicPackageComponent[];
  priceRules: PublicPackagePriceRule[];
  quoteInput: PackageQuoteInput;
  sources: PackageSourceContext;
  now?: Date;
}): PublicPackageQuote {
  const now = input.now ?? new Date();
  const nights = enumerateStayNights(input.quoteInput.check_in, input.quoteInput.check_out);
  const selected = new Set(normalizedKeys(input.quoteInput.selected_optional_component_keys));
  const components = input.components
    .filter((component) => component.package_id === input.package.id)
    .sort((left, right) => left.sort_order - right.sort_order || left.component_key.localeCompare(right.component_key))
    .map((component) => resolveComponent(component, selected, input.sources, now));
  const firstNight = nights[0];
  const lastNight = nights.at(-1);
  const withinPackageValidity = firstNight !== undefined && lastNight !== undefined
    && (!input.package.valid_from || input.package.valid_from <= firstNight)
    && (!input.package.valid_until || input.package.valid_until >= lastNight);
  const valid = nights.length > 0 && withinPackageValidity && validateInput(input.quoteInput, input.components);
  const price = resolveSellPrice({ packageId: input.package.id, quoteInput: input.quoteInput, rules: input.priceRules, nights, now });
  const availability = valid ? aggregateAvailability(components) : "unknown";
  const confirmationMode = input.package.confirmation_mode === "external_request"
    ? "external_request" as const
    : input.package.confirmation_mode === "unknown" ? "unknown" as const : "manual" as const;
  const caveats = [
    "Giá gói không đồng nghĩa các dịch vụ còn chỗ.",
    "Mọi thành phần phải được kiểm tra lại trước khi đội ngũ xác nhận chuyến đi.",
  ];
  if (price.public.status === "unknown") caveats.push("Chưa có quy tắc giá gói phù hợp; cần xác nhận giá.");
  if (price.public.status === "stale") caveats.push("Giá gói đã quá mốc kiểm tra hoặc hết hiệu lực; không dùng như giá hiện hành.");
  if (price.public.status === "conflict") caveats.push("Có nhiều quy tắc giá cùng ưu tiên; cần xử lý trước khi báo giá.");
  if (nights.length && !withinPackageValidity) caveats.push("Ngày đã chọn nằm ngoài thời gian áp dụng của gói.");
  if (!valid) caveats.push("Ngày đi, số khách, số phòng hoặc lựa chọn thêm chưa hợp lệ.");
  const unavailable = availability === "unavailable";
  return {
    package: input.package,
    input: input.quoteInput,
    nights: nights.length,
    components,
    sell_price: valid ? price.public : { ...price.public, status: "invalid", total_vnd: null },
    availability_state: availability,
    confirmation_mode: confirmationMode,
    confirmation_label: confirmationMode === "external_request"
      ? "Gửi yêu cầu để đối tác xác nhận"
      : confirmationMode === "unknown" ? "Cần làm rõ cách xác nhận" : "Đội ngũ xác nhận thủ công",
    can_request: valid && !unavailable && confirmationMode !== "unknown" && Boolean(input.package.public_request_url),
    request_url: valid && !unavailable ? input.package.public_request_url : null,
    caveats,
    status: !valid ? "invalid" : unavailable ? "unavailable" : availability === "recorded_available" && price.public.status === "quoted" ? "ready" : "needs_confirmation",
    policy_version: PACKAGE_POLICY_VERSION,
  };
}

function economicsFromRoom(component: AdminPackageComponent, quote: EconomicsQuote | undefined) {
  const stale = quote?.nightly_lines.some((line) => line.commercial_freshness === "unknown" || line.commercial_freshness === "reference") ?? false;
  const recordedTotal = quote?.net_cost_total_vnd === null || quote?.net_cost_total_vnd === undefined
    ? null
    : quote.net_cost_total_vnd * component.quantity;
  const total = stale ? null : recordedTotal;
  return {
    total,
    source: total === null ? null : "room_commercial_economics" as const,
    ruleIds: quote?.nightly_lines.flatMap((line) => line.commercial_rule_id ? [line.commercial_rule_id] : []) ?? [],
    stale,
  };
}

function economicsFromSnapshot(component: AdminPackageComponent, lastNight: string | undefined, now: Date) {
  const verified = component.cost_verified_at ? validPastTimestamp(component.cost_verified_at, now) : null;
  const current = component.unit_cost_vnd !== null && component.cost_source !== null && verified !== null
    && now.getTime() - verified <= PACKAGE_COST_FRESH_MS
    && Boolean(lastNight && component.cost_valid_until && component.cost_valid_until >= lastNight);
  return {
    total: current ? (component.unit_cost_vnd as number) * component.quantity : null,
    source: current ? component.cost_source : null,
    ruleIds: [] as string[],
    stale: component.unit_cost_vnd !== null && !current,
  };
}

export function resolvePrivatePackage(input: {
  publicQuote: PublicPackageQuote;
  components: AdminPackageComponent[];
  priceRules: PublicPackagePriceRule[];
  roomEconomicsQuotes: Map<string, EconomicsQuote>;
  now?: Date;
}): PrivatePackageResolution {
  const now = input.now ?? new Date();
  const nights = enumerateStayNights(input.publicQuote.input.check_in, input.publicQuote.input.check_out);
  const selected = new Set(normalizedKeys(input.publicQuote.input.selected_optional_component_keys));
  const included = input.components.filter((component) => component.is_required || selected.has(component.component_key));
  const lines: PrivatePackageComponentEconomics[] = included.map((component) => {
    const resolved = component.component_type === "ROOM" && component.room_type_id
      ? economicsFromRoom(component, input.roomEconomicsQuotes.get(component.room_type_id))
      : economicsFromSnapshot(component, nights.at(-1), now);
    return {
      component_key: component.component_key,
      component_type: component.component_type === "ROOM" || component.component_type === "MOTORBIKE" ? component.component_type : "CUSTOM",
      quantity: component.quantity,
      total_cost_vnd: resolved.total,
      cost_source: resolved.source,
      commercial_rule_ids: [...new Set(resolved.ruleIds)].sort(),
      missing_cost: resolved.total === null,
      stale_cost: resolved.stale,
    };
  });
  const completeCost = lines.length > 0 && lines.every((line) => line.total_cost_vnd !== null);
  const packageCost = completeCost ? lines.reduce((total, line) => total + (line.total_cost_vnd ?? 0), 0) : null;
  const sell = input.publicQuote.sell_price.total_vnd;
  const contribution = sell !== null && packageCost !== null ? sell - packageCost : null;
  const margin = contribution !== null && sell !== null && sell > 0 ? Math.round(contribution * 10_000 / sell) : null;
  const price = resolveSellPrice({
    packageId: input.publicQuote.package.id,
    quoteInput: input.publicQuote.input,
    rules: input.priceRules,
    nights,
    now,
  });
  const warnings: PackageWarningCode[] = [];
  if (!nights.length || input.publicQuote.status === "invalid") warnings.push("dates-invalid");
  if (input.publicQuote.sell_price.status === "unknown") warnings.push("package-price-missing");
  if (input.publicQuote.sell_price.status === "stale") warnings.push("package-price-stale");
  if (input.publicQuote.sell_price.status === "conflict") warnings.push("price-conflict");
  if (lines.some((line) => line.missing_cost)) warnings.push("component-cost-missing");
  if (contribution !== null && contribution < 0) warnings.push("negative-contribution");
  if (input.publicQuote.components.some((component) => component.is_required && component.availability_state === "unknown")) warnings.push("required-availability-unknown");
  return {
    public_quote: input.publicQuote,
    selected_price_rule_id: price.selectedRuleId,
    conflicting_price_rule_ids: price.conflictIds,
    component_economics: lines,
    package_cost_vnd: packageCost,
    gross_contribution_vnd: contribution,
    gross_margin_bps: margin,
    warnings: [...new Set(warnings)],
    policy_version: PACKAGE_POLICY_VERSION,
  };
}
