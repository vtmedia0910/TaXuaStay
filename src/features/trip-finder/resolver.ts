import {
  TRIP_FINDER_POLICY_VERSION,
  type PublicTripRecommendation,
  type TripFinderCandidate,
  type TripFinderIntent,
  type TripFinderResolution,
  type TripRecommendationGroup,
} from "@/features/trip-finder/types";

const GROUP_LABELS = {
  best: "Phù hợp nhất",
  consider: "Đáng cân nhắc",
  conditional: "Phù hợp nếu...",
} as const;

const KIND_LABELS = {
  stay: "Phòng",
  package: "Gói dịch vụ",
  motorbike: "Xe máy",
  composition: "Tự ghép dịch vụ",
} as const;

const BATHROOM_PRIVATE = new Set(["private", "ensuite"]);

interface EvaluatedCandidate {
  candidate: TripFinderCandidate;
  score: number;
  group: TripRecommendationGroup;
  reasons: string[];
  tradeOffs: string[];
  unknownFacts: string[];
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function budgetMaximum(intent: TripFinderIntent) {
  if (intent.budgetPreference === "under_1500000") return 1_500_000;
  if (intent.budgetPreference === "under_3000000") return 3_000_000;
  return null;
}

function isDefinitelyIneligible(candidate: TripFinderCandidate, intent: TripFinderIntent) {
  if (candidate.capacity === "no") return true;
  if (candidate.availability.state === "unavailable") return true;
  if (intent.roadNeed === "car_required" && candidate.carAccess === "no") return true;
  if (candidate.kind === "motorbike" && !intent.wantsMotorbike) return true;
  return false;
}

function evaluateCandidate(candidate: TripFinderCandidate, intent: TripFinderIntent): EvaluatedCandidate {
  let score = 100;
  const reasons: string[] = [];
  const tradeOffs: string[] = [];
  const unknownFacts: string[] = [];
  let unmetPreferences = 0;
  let hasConditionalHardFact = false;

  if (candidate.capacity === "yes") {
    score += 18;
    if (candidate.kind !== "motorbike") reasons.push("Sức chứa phù hợp với số khách và số phòng đã chọn.");
  } else if (candidate.capacity === "unknown") {
    hasConditionalHardFact = true;
    unknownFacts.push("Chưa đủ dữ liệu để kết luận sức chứa của toàn lựa chọn.");
  }

  if (candidate.availability.state === "available") {
    score += 18;
    reasons.push(candidate.availability.label);
  } else if (candidate.availability.state === "needs_confirmation") {
    score -= 2;
    hasConditionalHardFact = true;
    tradeOffs.push(candidate.availability.label);
  } else if (candidate.availability.state === "unknown") {
    score -= 4;
    hasConditionalHardFact = true;
    unknownFacts.push(candidate.availability.label);
  }

  if (intent.roadNeed === "car_required") {
    if (candidate.carAccess === "yes") {
      score += candidate.roadVerified ? 18 : 10;
      reasons.push(candidate.roadVerified ? "Ô tô vào được theo hồ sơ đường đã thẩm định." : "Thông tin nơi lưu trú ghi nhận ô tô vào được.");
    } else if (candidate.carAccess === "unknown") {
      hasConditionalHardFact = true;
      unknownFacts.push("Chưa xác nhận ô tô có vào được theo yêu cầu của bạn.");
    }
  } else if (intent.roadNeed === "motorbike_ok") {
    if (candidate.motorbikeAccess === "yes") {
      score += 8;
      reasons.push("Thông tin hiện có phù hợp với hướng di chuyển bằng xe máy.");
    } else if (candidate.motorbikeAccess === "unknown") {
      unknownFacts.push("Đường vào bằng xe máy chưa được xác nhận.");
    } else if (candidate.motorbikeAccess === "no") {
      unmetPreferences += 1;
      tradeOffs.push("Không phù hợp với ưu tiên đi xe máy tới nơi lưu trú.");
    }
  }

  if (intent.viewPriority !== "any") {
    const viewMatched = intent.viewPriority === "cloud_view"
      ? candidate.cloudScore !== null
      : intent.viewPriority === "view_from_bed"
        ? candidate.viewFromBed === "yes" || candidate.viewFromBed === "partial"
        : candidate.viewType === intent.viewPriority;
    if (viewMatched) {
      score += 20;
      reasons.push(intent.viewPriority === "cloud_view"
        ? `Có Cloud View đã thẩm định${candidate.cloudScore !== null ? ` · ${candidate.cloudScore.toFixed(1)} / 10` : ""}.`
        : intent.viewPriority === "view_from_bed"
          ? "Có dữ liệu đã thẩm định về góc nhìn từ giường."
          : intent.viewPriority === "mountain" ? "Loại phòng ghi nhận hướng nhìn núi." : "Loại phòng ghi nhận hướng nhìn thung lũng.");
    } else {
      unmetPreferences += 1;
      if (candidate.viewType === null && candidate.cloudScore === null) unknownFacts.push("Chưa có đủ dữ liệu cho ưu tiên góc nhìn.");
      else tradeOffs.push("Chưa khớp ưu tiên góc nhìn đã chọn.");
    }
  }

  if (intent.qualityPreference === "current_quality") {
    if (candidate.currentQualityDimensions > 0) {
      score += Math.min(16, candidate.currentQualityDimensions * 2);
      reasons.push(`Có ${candidate.currentQualityDimensions} tiêu chí chất lượng phòng còn hiệu lực.`);
    } else {
      unmetPreferences += 1;
      unknownFacts.push("Chưa có tiêu chí chất lượng phòng còn hiệu lực.");
    }
  }

  if (intent.prefersVerified) {
    if (candidate.verificationLabels.length) {
      score += 12;
      reasons.push(`Có dữ liệu đã thẩm định: ${candidate.verificationLabels.slice(0, 2).join(", ")}.`);
    } else {
      unmetPreferences += 1;
      unknownFacts.push("Chưa có hồ sơ thẩm định còn hiệu lực cho lựa chọn này.");
    }
  }

  if (intent.style === "couple" && candidate.capacity !== "not_applicable") {
    const coupleFit = candidate.bathroomType !== null
      && BATHROOM_PRIVATE.has(candidate.bathroomType)
      && candidate.capacity === "yes";
    if (coupleFit) {
      score += 10;
      reasons.push("Phòng tắm riêng và sức chứa phù hợp cho chuyến đi đôi.");
    } else {
      unmetPreferences += 1;
      tradeOffs.push("Chưa khớp đầy đủ ưu tiên cho chuyến đi đôi.");
    }
  } else if ((intent.style === "family" || intent.style === "group") && candidate.capacity === "yes") {
    score += 8;
  } else if (intent.style === "slow" && candidate.hasPrivateBalcony === true) {
    score += 8;
    reasons.push("Có ban công riêng để dành thời gian nghỉ tại nơi ở.");
  }

  if (intent.wantsPackage) {
    if (candidate.kind === "package") {
      score += 18;
      reasons.push("Đây là gói có thành phần được công khai rõ ràng.");
    } else {
      unmetPreferences += 1;
    }
  }

  if (intent.wantsMotorbike) {
    if (candidate.componentTypes.includes("MOTORBIKE") || candidate.kind === "motorbike") {
      score += 16;
      reasons.push("Có lựa chọn xe máy đúng với nhu cầu đã chọn.");
    } else {
      unmetPreferences += 1;
      tradeOffs.push("Chưa bao gồm xe máy; cần xem dịch vụ riêng.");
    }
  }

  const maximum = budgetMaximum(intent);
  if (intent.budgetPreference === "complete_price") {
    if (candidate.price.amountVnd !== null) {
      score += 10;
      reasons.push("Có mức giá hiện hành cho đúng ngữ cảnh ngày đã chọn.");
    } else {
      unmetPreferences += 1;
      unknownFacts.push(candidate.price.label);
    }
  } else if (maximum !== null) {
    if (candidate.price.amountVnd === null) {
      unmetPreferences += 1;
      unknownFacts.push("Chưa có tổng giá đủ rõ để đối chiếu ngân sách.");
    } else if (candidate.price.amountVnd <= maximum) {
      score += 14;
      reasons.push(`Tổng giá ghi nhận nằm trong mức ${new Intl.NumberFormat("vi-VN").format(maximum)} ₫ bạn ưu tiên.`);
    } else {
      unmetPreferences += 1;
      score -= 12;
      tradeOffs.push(`Tổng giá ghi nhận cao hơn mức ${new Intl.NumberFormat("vi-VN").format(maximum)} ₫ bạn ưu tiên.`);
    }
  }

  if (candidate.price.state === "conflict") {
    hasConditionalHardFact = true;
    tradeOffs.push("Dữ liệu giá đang xung đột và cần được kiểm tra.");
  } else if (candidate.price.state === "reference") {
    tradeOffs.push(candidate.price.label);
  } else if (candidate.price.state === "unknown" && intent.budgetPreference === "flexible") {
    unknownFacts.push(candidate.price.label);
  }

  if (candidate.confirmation.state === "manual" || candidate.confirmation.state === "external_request") {
    tradeOffs.push(candidate.confirmation.label);
  }

  const conditionCount = unique(unknownFacts).length;
  const group: TripRecommendationGroup = hasConditionalHardFact || conditionCount >= 2
    ? "conditional"
    : unmetPreferences > 0 || candidate.confirmation.state !== "detail" ? "consider" : "best";

  return {
    candidate,
    score,
    group,
    reasons: unique(reasons).slice(0, 4),
    tradeOffs: unique(tradeOffs).slice(0, 4),
    unknownFacts: unique(unknownFacts).slice(0, 4),
  };
}

function toPublicRecommendation(evaluation: EvaluatedCandidate): PublicTripRecommendation {
  const { candidate } = evaluation;
  return {
    id: candidate.id,
    kind: candidate.kind,
    kindLabel: KIND_LABELS[candidate.kind],
    name: candidate.name,
    context: candidate.context,
    imageUrl: candidate.imageUrl,
    imageAlt: candidate.imageAlt,
    group: evaluation.group,
    reasons: evaluation.reasons.length ? evaluation.reasons : ["Lựa chọn này vượt qua các điều kiện chắc chắn hiện có."],
    tradeOffs: evaluation.tradeOffs,
    unknownFacts: evaluation.unknownFacts,
    verificationLabels: candidate.verificationLabels,
    price: candidate.price,
    availability: candidate.availability,
    confirmation: candidate.confirmation,
    actions: candidate.actions,
    policyVersion: TRIP_FINDER_POLICY_VERSION,
  };
}

function relaxationOptions(intent: TripFinderIntent) {
  const options = ["Thử ngày khác để kiểm tra lại giá và tình trạng phòng."];
  if (intent.roadNeed === "car_required") options.push("Bỏ yêu cầu ô tô vào tận nơi, rồi kiểm tra phương án gửi xe hoặc đi bộ.");
  if (intent.rooms > 1 || intent.adults + intent.children > 2) options.push("Điều chỉnh số phòng hoặc chia nhóm khách theo sức chứa thực tế.");
  if (intent.wantsPackage || intent.wantsMotorbike) options.push("Xem riêng Lưu trú trước, sau đó ghép dịch vụ cần xác nhận.");
  return options.slice(0, 3);
}

export function resolveTripFinder(input: {
  intent: TripFinderIntent;
  candidates: TripFinderCandidate[];
}): TripFinderResolution {
  const eligible = input.candidates.filter((candidate) => !isDefinitelyIneligible(candidate, input.intent));
  const evaluations = eligible.map((candidate) => evaluateCandidate(candidate, input.intent));
  evaluations.sort((left, right) => {
    const scoreDifference = right.score - left.score;
    if (scoreDifference) return scoreDifference;
    const kindDifference = left.candidate.kind.localeCompare(right.candidate.kind);
    return kindDifference || left.candidate.id.localeCompare(right.candidate.id);
  });

  const recommendations = evaluations.slice(0, 3).map(toPublicRecommendation);
  const groups = (["best", "consider", "conditional"] as const).flatMap((key) => {
    const items = recommendations.filter((item) => item.group === key);
    return items.length ? [{ key, label: GROUP_LABELS[key], items }] : [];
  });

  return {
    groups,
    recommendations,
    excludedCount: input.candidates.length - eligible.length,
    relaxationOptions: recommendations.length ? [] : relaxationOptions(input.intent),
    policyVersion: TRIP_FINDER_POLICY_VERSION,
  };
}
