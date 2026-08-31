import "server-only";

import { AVAILABILITY_STATE_LABELS } from "@/features/availability/policy";
import { resolveCmsMediaUrl } from "@/features/cms/media-url";
import { getPublicMotorbikeCatalog } from "@/features/motorbike/public-data";
import {
  MOTORBIKE_AVAILABILITY_LABELS,
  MOTORBIKE_CATEGORY_LABELS,
  resolveMotorbikePublicTruth,
} from "@/features/motorbike/policy";
import type { PublicMotorbikeOffering } from "@/features/motorbike/types";
import {
  getPublicPackageCatalog,
  getPublicPackageFactsByIds,
  getPublicPackageQuotes,
} from "@/features/packages/data";
import { PACKAGE_AVAILABILITY_LABELS, formatPackageVnd } from "@/features/packages/policy";
import type { PublicPackage, PublicPackageComponent, PublicPackageQuote } from "@/features/packages/types";
import { formatVnd, PRICE_CONFIDENCE_LABELS } from "@/features/pricing/policy";
import type { AccessCertainty } from "@/features/properties/types";
import { PUBLIC_ROOM_QUALITY_QUERY } from "@/features/room-profiles/columns";
import { ROOM_QUALITY_DIMENSIONS, type PublicRoomQualityAssessmentDto } from "@/features/room-profiles/types";
import { getPublicTripFinderRoomCandidates } from "@/features/search/data";
import { DEFAULT_ROOM_SEARCH_PARAMS } from "@/features/search/params";
import type { RoomSearchResult } from "@/features/search/types";
import {
  type TripAvailabilityState,
  type TripFinderCandidate,
  type TripFinderCandidateSet,
  type TripFinderIntent,
  type TripPriceState,
} from "@/features/trip-finder/types";
import { PUBLIC_VERIFICATION_BADGE_QUERY } from "@/features/verification/columns";
import type { PublicVerificationBadgeDto } from "@/features/verification/types";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

function roomCapacity(result: RoomSearchResult, intent: TripFinderIntent) {
  const guests = intent.adults + intent.children;
  return result.room.max_guests * intent.rooms >= guests
    && result.room.capacity_adults * intent.rooms >= intent.adults
    && result.room.capacity_children * intent.rooms >= intent.children
    ? "yes" as const : "no" as const;
}

function roomPrice(result: RoomSearchResult): TripFinderCandidate["price"] {
  const quote = result.priceQuote;
  if (!quote || quote.total_vnd === null) {
    return {
      state: quote?.status === "conflict" ? "conflict" : "unknown",
      amountVnd: null,
      label: quote?.status === "conflict" ? "Dữ liệu giá đang xung đột" : "Chưa có tổng giá cho ngày đã chọn",
    };
  }
  const state: TripPriceState = quote.confidence === "verified" || quote.confidence === "recent"
    ? "current" : "reference";
  return {
    state,
    amountVnd: quote.total_vnd,
    label: `${formatVnd(quote.total_vnd)} · ${PRICE_CONFIDENCE_LABELS[quote.confidence]}`,
  };
}

function roomAvailability(result: RoomSearchResult): TripFinderCandidate["availability"] {
  const state = result.availabilityQuote?.state;
  if (!state) return { state: "unknown", label: "Chưa có dữ liệu tình trạng phòng" };
  const mapped: TripAvailabilityState = state === "live" || state === "verified_today"
    ? "available" : state === "sold_out" ? "unavailable" : state === "needs_confirmation" ? "needs_confirmation" : "unknown";
  return { state: mapped, label: AVAILABILITY_STATE_LABELS[state] };
}

async function getRoomTrustFacts(roomTypeIds: string[]) {
  const client = createPublicSupabaseClient();
  if (!client || !roomTypeIds.length) {
    return {
      qualities: new Map<string, PublicRoomQualityAssessmentDto>(),
      roomVerified: new Set<string>(),
    };
  }
  const [qualityResult, badgeResult] = await Promise.all([
    client
      .from("public_room_quality_assessments")
      .select(PUBLIC_ROOM_QUALITY_QUERY)
      .in("room_type_id", roomTypeIds)
      .overrideTypes<PublicRoomQualityAssessmentDto[], { merge: false }>(),
    client
      .from("public_verification_badges")
      .select(PUBLIC_VERIFICATION_BADGE_QUERY)
      .in("room_type_id", roomTypeIds)
      .eq("verification_type", "room")
      .overrideTypes<PublicVerificationBadgeDto[], { merge: false }>(),
  ]);
  return {
    qualities: new Map((qualityResult.error ? [] : qualityResult.data ?? [])
      .flatMap((quality) => quality.room_type_id ? [[quality.room_type_id, quality] as const] : [])),
    roomVerified: new Set((badgeResult.error ? [] : badgeResult.data ?? [])
      .flatMap((badge) => badge.room_type_id ? [badge.room_type_id] : [])),
  };
}

function currentQualityDimensionCount(quality: PublicRoomQualityAssessmentDto | undefined) {
  if (!quality) return 0;
  return ROOM_QUALITY_DIMENSIONS.filter((dimension) => quality[`${dimension}_state`] === "current").length;
}

function buildRoomCandidate(input: {
  result: RoomSearchResult;
  intent: TripFinderIntent;
  quality?: PublicRoomQualityAssessmentDto;
  roomVerified: boolean;
}): TripFinderCandidate {
  const { result } = input;
  const carAccess = result.road?.car_access ?? result.property.car_access;
  const motorbikeAccess = result.road?.motorbike_access ?? result.property.motorbike_access;
  const verificationLabels = [
    ...(input.roomVerified ? ["Loại phòng"] : []),
    ...(result.cloudView ? ["Cloud View"] : []),
    ...(result.road ? ["Đường vào"] : []),
    ...(input.quality ? ["Chất lượng phòng"] : []),
  ];
  return {
    id: `stay:${result.room.id}`,
    kind: "stay",
    name: result.room.name,
    context: `${result.property.name} · ${result.property.area_name}`,
    imageUrl: result.image?.thumbnail_url ?? result.image?.url ?? null,
    imageAlt: result.image?.alt_text ?? `Thông tin hình ảnh ${result.room.name}`,
    capacity: roomCapacity(result, input.intent),
    carAccess,
    motorbikeAccess,
    roadVerified: Boolean(result.road),
    bathroomType: result.room.bathroom_type,
    viewType: result.room.view_type,
    hasPrivateBalcony: result.room.has_private_balcony,
    cloudScore: result.cloudView ? Number(result.cloudView.score_10) : null,
    viewFromBed: result.cloudView?.view_from_bed ?? null,
    currentQualityDimensions: currentQualityDimensionCount(input.quality),
    verificationLabels,
    componentTypes: ["ROOM"],
    price: roomPrice(result),
    availability: roomAvailability(result),
    confirmation: { state: "detail", label: "Xem chi tiết; chưa phải giữ phòng." },
    actions: [{
      label: "XEM PHÒNG",
      href: `/stay/${result.property.slug}/${result.room.slug}?check_in=${encodeURIComponent(input.intent.checkIn)}&check_out=${encodeURIComponent(input.intent.checkOut)}&adults=${input.intent.adults}&children=${input.intent.children}&rooms=${input.intent.rooms}`,
      external: false,
    }],
  };
}

function aggregateFact(values: Array<"yes" | "no" | "unknown" | "not_applicable">) {
  if (!values.length) return "not_applicable" as const;
  if (values.some((value) => value === "no")) return "no" as const;
  if (values.every((value) => value === "yes")) return "yes" as const;
  return "unknown" as const;
}

function aggregateAccess(values: AccessCertainty[]): AccessCertainty {
  if (!values.length) return "unknown";
  if (values.some((value) => value === "no")) return "no";
  if (values.every((value) => value === "yes")) return "yes";
  return "unknown";
}

function packageCandidate(input: {
  item: PublicPackage;
  quote: PublicPackageQuote | undefined;
  components: PublicPackageComponent[];
  roomCandidates: Map<string, TripFinderCandidate>;
}): TripFinderCandidate {
  const requiredRooms = input.components.filter((component) => component.is_required && component.component_type === "ROOM");
  const roomSignals = requiredRooms.flatMap((component) => component.room_type_id
    ? [input.roomCandidates.get(component.room_type_id)] : []).filter(Boolean) as TripFinderCandidate[];
  const singleRoom = roomSignals.length === 1 ? roomSignals[0] : null;
  const quote = input.quote;
  const invalid = quote?.status === "invalid";
  const availabilityState: TripAvailabilityState = invalid || quote?.availability_state === "unavailable"
    ? "unavailable"
    : quote?.availability_state === "recorded_available" ? "available"
      : quote?.availability_state === "needs_confirmation" ? "needs_confirmation" : "unknown";
  const priceState: TripPriceState = quote?.sell_price.status === "quoted"
    ? "current" : quote?.sell_price.status === "conflict" ? "conflict" : "unknown";
  const amount = quote?.sell_price.total_vnd ?? null;
  const requestAction = quote?.can_request && quote.request_url
    ? [{ label: "YÊU CẦU XÁC NHẬN" as const, href: quote.request_url, external: true }]
    : [];
  return {
    id: `package:${input.item.id}`,
    kind: "package",
    name: input.item.name,
    context: `${input.item.destination_name} · ${input.item.proposition}`,
    imageUrl: resolveCmsMediaUrl(input.item.image),
    imageAlt: input.item.image?.alt_text ?? `Thông tin hình ảnh ${input.item.name}`,
    capacity: invalid ? "no" : requiredRooms.length ? aggregateFact(roomSignals.map((room) => room.capacity)) : "not_applicable",
    carAccess: aggregateAccess(roomSignals.map((room) => room.carAccess)),
    motorbikeAccess: aggregateAccess(roomSignals.map((room) => room.motorbikeAccess)),
    roadVerified: roomSignals.length > 0 && roomSignals.every((room) => room.roadVerified),
    bathroomType: singleRoom?.bathroomType ?? null,
    viewType: singleRoom?.viewType ?? null,
    hasPrivateBalcony: singleRoom?.hasPrivateBalcony ?? null,
    cloudScore: singleRoom?.cloudScore ?? null,
    viewFromBed: singleRoom?.viewFromBed ?? null,
    currentQualityDimensions: singleRoom?.currentQualityDimensions ?? 0,
    verificationLabels: singleRoom?.verificationLabels ?? [],
    componentTypes: [...new Set(input.components.map((component) => component.component_type))],
    price: {
      state: priceState,
      amountVnd: amount,
      label: amount !== null ? formatPackageVnd(amount) : quote?.sell_price.status === "conflict" ? "Dữ liệu giá gói đang xung đột" : "Cần xác nhận giá gói",
    },
    availability: {
      state: availabilityState,
      label: invalid ? "Ngày hoặc số khách nằm ngoài điều kiện hiện có của gói" : quote ? PACKAGE_AVAILABILITY_LABELS[quote.availability_state] : "Chưa đủ dữ liệu tình trạng gói",
    },
    confirmation: {
      state: quote?.confirmation_mode === "external_request" ? "external_request" : "manual",
      label: quote?.confirmation_label ?? "Cần đội ngũ xác nhận từng dịch vụ.",
    },
    actions: [
      { label: "XEM GÓI", href: `/packages/${input.item.slug}?check_in=${encodeURIComponent(quote?.input.check_in ?? "")}&check_out=${encodeURIComponent(quote?.input.check_out ?? "")}&adults=${quote?.input.adults ?? 2}&children=${quote?.input.children ?? 0}&rooms=${quote?.input.rooms ?? 1}`, external: false },
      ...requestAction,
    ],
  };
}

function motorbikeCandidate(offering: PublicMotorbikeOffering): TripFinderCandidate {
  const truth = resolveMotorbikePublicTruth(offering);
  return {
    id: `motorbike:${offering.slug}`,
    kind: "motorbike",
    name: offering.display_name,
    context: `${MOTORBIKE_CATEGORY_LABELS[offering.vehicle_category]} · nguồn ${offering.source_provider}`,
    imageUrl: resolveCmsMediaUrl(offering.image),
    imageAlt: offering.image?.alt_text ?? `Thông tin hình ảnh ${offering.display_name}`,
    capacity: "not_applicable",
    carAccess: "unknown",
    motorbikeAccess: "unknown",
    roadVerified: false,
    bathroomType: null,
    viewType: null,
    hasPrivateBalcony: null,
    cloudScore: null,
    viewFromBed: null,
    currentQualityDimensions: 0,
    verificationLabels: [],
    componentTypes: ["MOTORBIKE"],
    price: {
      state: truth.priceIsCurrent ? "current" : "unknown",
      amountVnd: truth.priceIsCurrent ? offering.public_price_vnd : null,
      label: truth.priceLabel,
    },
    availability: {
      state: offering.availability_state === "unavailable" ? "unavailable" : "needs_confirmation",
      label: MOTORBIKE_AVAILABILITY_LABELS[offering.availability_state],
    },
    confirmation: {
      state: offering.availability_state === "unavailable" ? "unavailable" : "manual",
      label: truth.confirmationLabel,
    },
    actions: [
      { label: "XEM XE", href: `/motorbike/${offering.slug}`, external: false },
      ...(truth.canRequest ? [{ label: "YÊU CẦU XÁC NHẬN" as const, href: offering.public_request_url, external: true }] : []),
    ],
  };
}

function compositionCandidate(room: TripFinderCandidate, motorbike: TripFinderCandidate): TripFinderCandidate {
  return {
    ...room,
    id: `composition:${room.id}:${motorbike.id}`,
    kind: "composition",
    name: `${room.name} + ${motorbike.name}`,
    context: `${room.context} · tự ghép xe máy`,
    componentTypes: ["ROOM", "MOTORBIKE"],
    price: { state: "unknown", amountVnd: null, label: "Giá từng dịch vụ được xác nhận riêng; không cộng thành giá gói" },
    availability: room.availability.state === "unavailable"
      ? room.availability
      : { state: "needs_confirmation", label: "Phòng theo dữ liệu ngày đã chọn; xe máy cần xác nhận riêng" },
    confirmation: { state: "manual", label: "Hai dịch vụ được kiểm tra và xác nhận riêng." },
    actions: [room.actions[0], motorbike.actions[0]].filter(Boolean),
  };
}

export async function getTripFinderCandidateSet(intent: TripFinderIntent): Promise<TripFinderCandidateSet> {
  const searchParams = {
    ...DEFAULT_ROOM_SEARCH_PARAMS,
    checkIn: intent.checkIn,
    checkOut: intent.checkOut,
    adults: intent.adults,
    children: intent.children,
    rooms: intent.rooms,
  };
  const [roomPool, packageCatalog, motorbikeCatalog] = await Promise.all([
    getPublicTripFinderRoomCandidates(searchParams),
    getPublicPackageCatalog(),
    getPublicMotorbikeCatalog(),
  ]);
  const roomIds = roomPool.items.map((item) => item.room.id);
  const [trust, packageFacts, packageQuotes] = await Promise.all([
    getRoomTrustFacts(roomIds),
    getPublicPackageFactsByIds(packageCatalog.packages.map((item) => item.id)),
    getPublicPackageQuotes({
      packages: packageCatalog.packages,
      quoteInput: {
        check_in: intent.checkIn,
        check_out: intent.checkOut,
        adults: intent.adults,
        children: intent.children,
        rooms: intent.rooms,
        selected_optional_component_keys: [],
      },
    }),
  ]);
  const roomCandidates = roomPool.items.map((result) => buildRoomCandidate({
    result,
    intent,
    quality: trust.qualities.get(result.room.id),
    roomVerified: trust.roomVerified.has(result.room.id),
  }));
  const roomMap = new Map(roomPool.items.map((result, index) => [result.room.id, roomCandidates[index]]));
  const packageCandidates = packageCatalog.packages.map((item) => packageCandidate({
    item,
    quote: packageQuotes.get(item.id),
    components: packageFacts.components.filter((component) => component.package_id === item.id),
    roomCandidates: roomMap,
  }));
  const motorbikeCandidates = motorbikeCatalog.offerings.map(motorbikeCandidate);
  const compositionCandidates = intent.wantsMotorbike
    ? roomCandidates.slice(0, 12).flatMap((room) => motorbikeCandidates.slice(0, 2).map((motorbike) => compositionCandidate(room, motorbike)))
    : [];
  const candidates = [...roomCandidates, ...packageCandidates, ...motorbikeCandidates, ...compositionCandidates];
  const sources = {
    stay: roomPool.status,
    packages: packageCatalog.status,
    motorbike: motorbikeCatalog.status,
  };
  const values = Object.values(sources);
  const status = values.every((value) => value === "unconfigured")
    ? "unconfigured"
    : values.some((value) => value === "error")
      ? candidates.length ? "partial" : "error"
      : candidates.length ? "ready" : "empty";
  return { candidates, status, sources };
}
