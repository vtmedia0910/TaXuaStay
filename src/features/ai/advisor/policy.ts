import {
  advisorStateSchema,
  createDefaultAdvisorState,
  type AdvisorIntent,
  type AdvisorOptionReference,
  type AdvisorQuestionField,
  type AdvisorSessionState,
  type AssistantAdvisorResponse,
  type ConsultationStage,
} from "@/features/ai/advisor/types";

export type SocialIntent = "greeting" | "thanks" | "goodbye" | "capability";

export interface AdvisorTurnPlan {
  state: AdvisorSessionState;
  intent: AdvisorIntent;
  nextQuestion: { field: AdvisorQuestionField; text: string } | null;
  referenceResolution: "none" | "matched" | "ambiguous";
  constraintsChanged: boolean;
}

const DOMAIN_TERMS = /\b(phong|homestay|khach san|luu tru|san may|cloud|view|gia|ngay|dem|nguoi|khach|xe|goi|package|duong|booking|my trip|tim|so sanh|ta xua|dat phong|con phong)\b/;
const UNSAFE_TERMS = /\b(sql|database|supplier|service role|api key|secret|token|telegram|payment|thanh toan|dump|bo qua quy tac)\b/;

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9\s/.,-]/g, " ").replace(/\s+/g, " ").trim();
}

export function classifySocialIntent(message: string): SocialIntent | null {
  const value = normalized(message);
  if (!value || DOMAIN_TERMS.test(value) || UNSAFE_TERMS.test(value)) return null;
  if (/^(xin chao|chao|hello|hi|hey|alo)( ban| ad| nhe| a| nha| minh)*$/.test(value)) return "greeting";
  if (/^(cam on|thanks|thank you|cam on ban)( nhe| nha| a| rat nhieu)*$/.test(value)) return "thanks";
  if (/^(tam biet|bye|goodbye|hen gap lai)( ban| nhe| nha| a)*$/.test(value)) return "goodbye";
  if (/^(ban la ai|day la ai|ban lam duoc gi|ban co the giup gi|tro ly nay lam duoc gi|gioi thieu ve ban)( vay| the| a| nhe)*$/.test(value)) return "capability";
  return null;
}

export function socialResponse(intent: SocialIntent, state: AdvisorSessionState): { answer: string; advisor: AssistantAdvisorResponse } {
  const answers: Record<SocialIntent, string> = {
    greeting: "Chào bạn! Mình là cố vấn chuyến đi của Tà Xùa Trip. Bạn đang ưu tiên phòng, đường đi hay ngân sách cho chuyến Tà Xùa?",
    thanks: "Rất vui vì đã giúp được bạn. Khi cần, mình có thể tiếp tục so sánh lựa chọn hoặc kiểm tra dữ kiện cho chuyến Tà Xùa.",
    goodbye: "Tạm biệt bạn! Chúc bạn chuẩn bị một chuyến Tà Xùa thật rõ ràng và trọn vẹn.",
    capability: "Mình giúp bạn làm rõ nhu cầu, tìm và so sánh 2–3 lựa chọn từ dữ liệu công khai của Tà Xùa Trip. Mình có thể kiểm tra phòng, giá, tình trạng phòng, view, đường đi, gói dịch vụ và My Trip được cấp quyền; mình không tự đặt hay thanh toán thay bạn.",
  };
  const next = { ...state, consultation: { ...state.consultation, lastIntent: intent } };
  return {
    answer: answers[intent],
    advisor: {
      statePatch: advisorStateSchema.parse(next),
      stage: next.consultation.stage,
      suggestedReplies: intent === "goodbye" ? [] : ["Tìm phòng cho 2 người", "Ưu tiên săn mây", "Tôi đi ô tô"],
    },
  };
}

export function classifyAdvisorIntent(message: string): AdvisorIntent {
  const value = normalized(message);
  if (/\b(dat giup|dat phong|dat xe|dat goi|mua goi|giu cho|chot phong|gui yeu cau|thanh toan|huy booking|sua booking)\b/.test(value)) return "action";
  if (/\b(so sanh|khac nhau|cai nao|lua chon nao|cai re hon|thu 1|thu 2|thu 3|phong do|cai do)\b/.test(value)) return "comparison";
  if (/\b(con phong|trong phong|tinh trang phong|availability)\b/.test(value)) return "availability";
  if (/\b(gia|bao nhieu|ngan sach|chi phi)\b/.test(value)) return "price";
  if (/\b(duong|o to|de di|kho di|do xe)\b/.test(value)) return "road";
  if (/\b(package|combo|goi)\b/.test(value)) return "package";
  if (/\b(xe may|thue xe)\b/.test(value)) return "motorbike";
  if (/\b(my trip|booking|chuyen cua toi|trang thai chuyen)\b/.test(value)) return "booking_status";
  if (/\b(chinh sach|check in|check out|tre em|thu cung|huy doi)\b/.test(value)) return "policy";
  if (/\b(goi y|phu hop|nen chon|tim phong|tim noi|lan dau|tu van)\b/.test(value)) return "recommendation";
  return "general";
}

function parseDate(value: string, now: Date) {
  const [dayText, monthText, yearText] = value.split(/[/-]/);
  const day = Number(dayText);
  const month = Number(monthText);
  let year = yearText ? Number(yearText) : now.getUTCFullYear();
  if (!yearText && Date.UTC(year, month - 1, day) < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) year += 1;
  if (year < 2024 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function amountVnd(value: string, unit: string | undefined) {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0) return null;
  const multiplier = unit?.startsWith("tr") ? 1_000_000 : unit === "k" || unit?.startsWith("nghin") ? 1_000 : amount < 100 ? 1_000_000 : 1;
  const result = Math.round(amount * multiplier);
  return result <= 100_000_000 ? result : null;
}

function setPriority(state: AdvisorSessionState, tag: AdvisorSessionState["preferences"]["priorityTags"][number], enabled: boolean) {
  const without = state.preferences.priorityTags.filter((item) => item !== tag);
  state.preferences.priorityTags = enabled ? [...without, tag].slice(0, 5) : without;
}

function extractState(previous: AdvisorSessionState, message: string, now: Date) {
  const state = structuredClone(previous);
  const previousPriorityTags = JSON.stringify(previous.preferences.priorityTags);
  const value = normalized(message);
  const changedKeys = new Set<string>();
  const update = <K extends keyof AdvisorSessionState["trip"]>(key: K, next: AdvisorSessionState["trip"][K]) => {
    if (state.trip[key] !== next) changedKeys.add(`trip.${key}`);
    state.trip[key] = next;
  };

  const dates = [...message.matchAll(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{4})?)\b/g)].map((match) => parseDate(match[1], now)).filter((item): item is string => Boolean(item));
  if (dates[0]) update("checkIn", dates[0]);
  if (dates[1] && dates[1] > (dates[0] ?? state.trip.checkIn ?? "")) update("checkOut", dates[1]);
  else if (dates[0] && state.trip.checkOut && state.trip.checkOut <= dates[0]) update("checkOut", null);

  const guests = value.match(/\b(\d{1,2})\s*(?:nguoi|khach)\b/);
  if (guests && Number(guests[1]) >= 1 && Number(guests[1]) <= 20) update("guestCount", Number(guests[1]));
  const rooms = value.match(/\b(\d{1,2})\s*phong\b/);
  if (rooms && Number(rooms[1]) >= 1 && Number(rooms[1]) <= 10) update("roomCount", Number(rooms[1]));

  const range = value.match(/\b(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin)?\s*(?:-|den|toi)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin)\b/);
  const ceiling = value.match(/\b(?:duoi|toi da|max|tam|khoang)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin)?\b/);
  if (range) {
    const minVnd = amountVnd(range[1], range[2] || range[4]);
    const maxVnd = amountVnd(range[3], range[4]);
    if (minVnd !== null && maxVnd !== null && minVnd <= maxVnd) {
      if (state.budget.minVnd !== minVnd || state.budget.maxVnd !== maxVnd) changedKeys.add("budget");
      state.budget.minVnd = minVnd;
      state.budget.maxVnd = maxVnd;
    }
  } else if (ceiling) {
    const maxVnd = amountVnd(ceiling[1], ceiling[2]);
    if (maxVnd !== null && state.budget.maxVnd !== maxVnd) {
      changedKeys.add("budget");
      state.budget.maxVnd = maxVnd;
    }
  }
  if (/\b(moi dem|mot dem|\/dem|per night)\b/.test(value) && state.budget.unit !== "per_night") {
    changedKeys.add("budget.unit");
    state.budget.unit = "per_night";
  } else if (/\b(ca chuyen|tong chuyen|tron chuyen)\b/.test(value) && state.budget.unit !== "trip") {
    changedKeys.add("budget.unit");
    state.budget.unit = "trip";
  }
  if (/\b(ngan sach linh hoat|khong chot ngan sach|chua chot ngan sach)\b/.test(value)) {
    state.consultation.askedFields = [...new Set([...state.consultation.askedFields, "budget" as const])].slice(0, 7);
  }

  const transport = /\b(o to|xe hoi)\b/.test(value) ? "car" : /\b(xe may)\b/.test(value) ? "motorbike" : /\b(xe khach|bus)\b/.test(value) ? "bus" : null;
  if (transport && state.transport.mode !== transport) {
    changedKeys.add("transport.mode");
    state.transport.mode = transport;
  }
  const roadTolerance = /\b(khong ngai duong kho|duong kho cung duoc|tay lai tot)\b/.test(value) ? "high"
    : /\b(ngai duong kho|khong di duong kho|uu tien duong de|duong de)\b/.test(value) ? "low" : null;
  if (roadTolerance && state.transport.roadTolerance !== roadTolerance) {
    changedKeys.add("transport.roadTolerance");
    state.transport.roadTolerance = roadTolerance;
  }

  const preferenceRules: Array<[keyof Omit<AdvisorSessionState["preferences"], "priorityTags">, RegExp, RegExp, AdvisorSessionState["preferences"]["priorityTags"][number]]> = [
    ["cloudView", /\b(san may|view may|cloud view)\b/, /\b(khong can|khong uu tien|bo)\s*(san may|view may|cloud view)\b/, "cloud_view"],
    ["quiet", /\b(yen tinh|it on)\b/, /\b(khong can|khong uu tien)\s*(yen tinh|it on)\b/, "quiet"],
    ["privateRoom", /\b(phong rieng|rieng tu)\b/, /\b(khong can)\s*(phong rieng|rieng tu)\b/, "private_room"],
    ["coupleTrip", /\b(couple|cap doi|trang mat)\b/, /\b(khong phai)\s*(couple|cap doi)\b/, "couple"],
  ];
  for (const [key, positive, negative, tag] of preferenceRules) {
    const next = negative.test(value) ? false : positive.test(value) ? true : null;
    if (next !== null) {
      if (state.preferences[key] !== next) changedKeys.add(`preferences.${key}`);
      state.preferences[key] = next;
      setPriority(state, tag, next);
    }
  }
  if (/\b(uu tien duong de|de di|o to vao)\b/.test(value)) setPriority(state, "easy_access", true);
  if (/\b(da xac minh|tham dinh|verified)\b/.test(value)) setPriority(state, "verified", true);
  if (/\b(tiet kiem|gia re|ngan sach)\b/.test(value)) setPriority(state, "budget", true);

  if (JSON.stringify(state.preferences.priorityTags) !== previousPriorityTags) changedKeys.add("preferences.priorityTags");

  return { state, constraintsChanged: changedKeys.size > 0 && previous.lastPresentedOptions.length > 0 };
}

function resolveReference(message: string, state: AdvisorSessionState) {
  const value = normalized(message);
  const ordinal = value.match(/\b(?:(?:cai|phong|lua chon|phuong an)\s*(?:thu\s*)?|thu\s+)(1|2|3|mot|hai|ba)\b/);
  const ordinalIndex = ordinal ? ({ mot: 0, hai: 1, ba: 2 }[ordinal[1]] ?? Number(ordinal[1]) - 1) : null;
  if (ordinalIndex !== null && ordinalIndex >= 0) {
    const selected = state.lastPresentedOptions[ordinalIndex];
    return selected ? { status: "matched" as const, selected } : { status: "ambiguous" as const, selected: null };
  }
  if (/\b(cai re hon|phong re hon|lua chon re hon)\b/.test(value)) {
    const priced = state.lastPresentedOptions.filter((item) => item.priceVnd !== null && item.priceVnd !== undefined);
    if (priced.length < 2) return { status: "ambiguous" as const, selected: null };
    const ordered = [...priced].sort((a, b) => (a.priceVnd ?? Infinity) - (b.priceVnd ?? Infinity));
    return ordered[0]?.priceVnd !== ordered[1]?.priceVnd ? { status: "matched" as const, selected: ordered[0] } : { status: "ambiguous" as const, selected: null };
  }
  if (/\b(phong do|cai do|noi do|lua chon do)\b/.test(value)) {
    const selected = state.selectedOption ?? (state.lastPresentedOptions.length === 1 ? state.lastPresentedOptions[0] : null);
    return selected ? { status: "matched" as const, selected } : { status: "ambiguous" as const, selected: null };
  }
  return { status: "none" as const, selected: null };
}

function stageFor(state: AdvisorSessionState, intent: AdvisorIntent): ConsultationStage {
  if (intent === "action") return "NEXT_ACTION";
  if (state.selectedOption) return "DECIDE";
  if (intent === "comparison" && state.lastPresentedOptions.length >= 2) return "COMPARE";
  if (state.lastPresentedOptions.length) return "RECOMMEND";
  const hasPriority = state.preferences.priorityTags.length > 0 || state.budget.maxVnd !== null || state.transport.mode !== null;
  if (state.trip.guestCount !== null && hasPriority) return "NARROW";
  if (state.trip.guestCount !== null || state.trip.checkIn !== null || hasPriority) return "UNDERSTAND";
  return "DISCOVER";
}

function missing(state: AdvisorSessionState, field: AdvisorQuestionField) {
  if (field === "dates") return !state.trip.checkIn || !state.trip.checkOut;
  if (field === "guests") return state.trip.guestCount === null;
  if (field === "priority") return state.preferences.priorityTags.length === 0;
  if (field === "budget") return state.budget.maxVnd === null;
  if (field === "transport") return state.transport.mode === null;
  if (field === "options") return state.lastPresentedOptions.length < 2;
  return !state.selectedOption;
}

const QUESTION_TEXT: Record<AdvisorQuestionField, string> = {
  dates: "Bạn dự định nhận và trả phòng ngày nào?",
  guests: "Chuyến này có bao nhiêu người?",
  priority: "Điều bạn ưu tiên nhất là săn mây, yên tĩnh, đường dễ hay phòng riêng?",
  budget: "Bạn muốn giữ ngân sách khoảng bao nhiêu mỗi đêm?",
  transport: "Bạn dự định lên Tà Xùa bằng ô tô, xe máy hay xe khách?",
  target: "Bạn muốn mình kiểm tra phòng hoặc nơi lưu trú nào?",
  options: "Bạn muốn so sánh những lựa chọn nào?",
};

export function getNextBestQuestion(state: AdvisorSessionState, intent: AdvisorIntent, hasPageTarget = false, referenceResolution: AdvisorTurnPlan["referenceResolution"] = "none") {
  if (referenceResolution === "ambiguous") return { field: "options" as const, text: QUESTION_TEXT.options };
  const priorities: AdvisorQuestionField[] = intent === "availability"
    ? ["dates", "guests", "target"]
    : intent === "road"
      ? ["target", "transport"]
      : intent === "price"
        ? ["dates", "target"]
        : intent === "comparison"
          ? ["options"]
          : ["guests", "priority", "budget", "transport", "dates"];
  for (const field of priorities) {
    if (field === "target" && (hasPageTarget || state.selectedOption)) continue;
    if (missing(state, field) && !state.consultation.askedFields.includes(field)) return { field, text: QUESTION_TEXT[field] };
  }
  return null;
}

export function planAdvisorTurn(previousValue: AdvisorSessionState | undefined, message: string, options: { now?: Date; hasPageTarget?: boolean } = {}): AdvisorTurnPlan {
  const previous = previousValue ? advisorStateSchema.parse(previousValue) : createDefaultAdvisorState();
  const intent = classifyAdvisorIntent(message);
  const extracted = extractState(previous, message, options.now ?? new Date());
  const state = extracted.state;
  const reference = resolveReference(message, state);
  if (extracted.constraintsChanged) {
    state.lastPresentedOptions = [];
    state.selectedOption = null;
  }
  if (reference.selected) state.selectedOption = reference.selected;
  state.consultation.lastIntent = intent;
  state.consultation.stage = stageFor(state, intent);
  const nextQuestion = getNextBestQuestion(state, intent, options.hasPageTarget, reference.status);
  return { state: advisorStateSchema.parse(state), intent, nextQuestion, referenceResolution: reference.status, constraintsChanged: extracted.constraintsChanged };
}

export function finalizeAdvisorTurn(plan: AdvisorTurnPlan, options: AdvisorOptionReference[], responseKind: "clarification" | "refusal" | "tool_based", answer: string): AssistantAdvisorResponse {
  const state = structuredClone(plan.state);
  if (options.length) {
    state.lastPresentedOptions = options.slice(0, 3);
    state.selectedOption = null;
  }
  if (plan.nextQuestion && (responseKind === "clarification" || answer.trim().endsWith("?"))) {
    state.consultation.askedFields = [...new Set([...state.consultation.askedFields, plan.nextQuestion.field])].slice(0, 7);
  }
  state.consultation.stage = stageFor(state, plan.intent);
  return {
    statePatch: advisorStateSchema.parse(state),
    stage: state.consultation.stage,
    suggestedReplies: getAdvisorSuggestedReplies(state, plan.nextQuestion),
  };
}

export function alignAdvisorAnswer(plan: AdvisorTurnPlan, responseKind: "clarification" | "refusal" | "tool_based", answer: string) {
  if (responseKind === "clarification" && plan.nextQuestion) return plan.nextQuestion.text;
  return answer;
}

export function actionGuidanceResponse(plan: AdvisorTurnPlan) {
  const state = structuredClone(plan.state);
  state.consultation.stage = "NEXT_ACTION";
  const selected = state.selectedOption;
  const href = selected?.kind === "room" ? `/stay/${selected.publicSlug}`
    : selected?.kind === "property" ? `/stay/${selected.publicSlug}`
      : selected?.kind === "package" ? `/packages/${selected.publicSlug}`
        : selected?.kind === "motorbike" ? `/motorbike/${selected.publicSlug}`
          : "/trip-finder";
  return {
    answer: selected
      ? `Mình không thể đặt, giữ chỗ hay thanh toán thay bạn. Bạn có thể mở ${selected.label}, kiểm tra lại giá và tình trạng rồi dùng luồng gửi yêu cầu hiện có; chỉ xem là đã xác nhận khi trạng thái chuyến đi thực sự cho biết như vậy.`
      : "Mình không thể đặt, giữ chỗ hay thanh toán thay bạn. Bạn có thể dùng Tìm chuyến đi để chọn phương án, kiểm tra giá và tình trạng rồi gửi yêu cầu qua luồng hiện có; yêu cầu chưa có nghĩa là đã xác nhận.",
    source: { label: selected ? selected.label : "Tìm chuyến đi", href },
    advisor: {
      statePatch: advisorStateSchema.parse(state),
      stage: "NEXT_ACTION" as const,
      suggestedReplies: selected ? ["Kiểm tra giá lựa chọn này", "Kiểm tra tình trạng phòng", "Xem đường vào"] : ["Gợi ý phòng phù hợp", "Mở Tìm chuyến đi"],
    },
  };
}

export function getAdvisorSuggestedReplies(state: AdvisorSessionState, nextQuestion: AdvisorTurnPlan["nextQuestion"]): string[] {
  const byField: Partial<Record<AdvisorQuestionField, string[]>> = {
    guests: ["2 người", "4 người, 2 phòng", "6 người, 3 phòng"],
    priority: ["Ưu tiên săn mây", "Ưu tiên yên tĩnh", "Ưu tiên đường dễ"],
    budget: ["Dưới 1,5 triệu/đêm", "Dưới 3 triệu/đêm", "Ngân sách linh hoạt"],
    transport: ["Đi ô tô", "Đi xe máy", "Đi xe khách"],
    dates: ["Tôi chưa chốt ngày", "Đi cuối tuần", "Tôi sẽ gửi ngày cụ thể"],
    target: ["Gợi ý nơi phù hợp", "Xem phòng săn mây", "Tìm nơi đường dễ"],
    options: ["So sánh 2 lựa chọn đầu", "Xem cái thứ 2", "Cho tôi xem lại danh sách"],
  };
  if (state.lastPresentedOptions.length >= 2) return ["So sánh 2 lựa chọn đầu", "Xem cái thứ 2", "Ưu tiên cái rẻ hơn"];
  if (state.selectedOption) return ["Kiểm tra giá lựa chọn này", "Kiểm tra tình trạng phòng", "Xem đường vào"];
  if (nextQuestion) return (byField[nextQuestion.field] ?? []).slice(0, 3);
  return ["Gợi ý phòng phù hợp", "Ưu tiên săn mây", "Ưu tiên đường dễ"];
}

function safeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function optionFromPath(kind: AdvisorOptionReference["kind"], label: unknown, path: unknown, priceVnd?: unknown): AdvisorOptionReference | null {
  if (typeof label !== "string" || typeof path !== "string") return null;
  const segments = path.split("/").filter(Boolean);
  const publicSlug = kind === "room" ? segments.slice(-2).join("/") : segments.at(-1);
  if (!publicSlug) return null;
  const candidate = { kind, publicSlug, label, priceVnd: typeof priceVnd === "number" && Number.isInteger(priceVnd) ? priceVnd : null };
  const parsed = advisorStateSchema.shape.lastPresentedOptions.element.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function extractAdvisorOptionReferences(toolName: string, data: unknown): AdvisorOptionReference[] {
  const record = safeRecord(data);
  if (!record) return [];
  if (toolName === "get_room_options" && Array.isArray(record.options)) {
    return record.options.flatMap((raw) => {
      const item = safeRecord(raw);
      const price = safeRecord(item?.price);
      const ref = optionFromPath("room", item?.name, item?.path, price?.totalVnd);
      return ref ? [ref] : [];
    }).slice(0, 3);
  }
  if (toolName === "run_trip_finder" && Array.isArray(record.recommendations)) {
    return record.recommendations.flatMap((raw) => {
      const item = safeRecord(raw);
      if (!item || !["stay", "package", "motorbike"].includes(String(item.kind))) return [];
      const actions = Array.isArray(item?.actions) ? item.actions : [];
      const action = safeRecord(actions[0]);
      const price = safeRecord(item?.price);
      const kind = item.kind === "package" ? "package" : item.kind === "motorbike" ? "motorbike" : "room";
      const ref = optionFromPath(kind, item?.name, action?.href, price?.amountVnd);
      return ref ? [ref] : [];
    }).slice(0, 3);
  }
  if (toolName === "get_package") {
    const total = safeRecord(record.total);
    const ref = optionFromPath("package", record.name, record.path, total?.totalVnd);
    return ref ? [ref] : [];
  }
  if (toolName === "get_verified_facts") {
    const room = safeRecord(record.room);
    const property = safeRecord(record.property);
    const ref = room ? optionFromPath("room", room.name, room.path) : optionFromPath("property", property?.name, property?.path);
    return ref ? [ref] : [];
  }
  return [];
}
