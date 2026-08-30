import type { AccessCertainty, PropertyType } from "@/features/properties/types";
import { ACCESS_CERTAINTIES, PROPERTY_TYPES } from "@/features/properties/types";
import type { BathroomType, ViewType } from "@/features/rooms/types";
import { BATHROOM_TYPES, VIEW_TYPES } from "@/features/rooms/types";
import type { ParsedRoomSearch, RoomSearchParams } from "@/features/search/types";
import { PUBLIC_ROUTES } from "@/config/routes";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const DEFAULT_ROOM_SEARCH_PARAMS: RoomSearchParams = {
  adults: 2,
  children: 0,
  rooms: 1,
  wifi: false,
  breakfast: false,
  restaurant: false,
  bbq: false,
  availableOnly: false,
  page: 1,
};

export const SEARCH_LIMITS = {
  adults: { min: 1, max: 20 },
  children: { min: 0, max: 20 },
  rooms: { min: 1, max: 10 },
  page: { min: 1, max: 1000 },
} as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseStrictDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  bounds: { min: number; max: number },
) {
  if (value === undefined) return { value: fallback, invalid: false };
  if (!/^\d+$/.test(value)) return { value: fallback, invalid: true };
  const parsed = Number(value);
  return parsed >= bounds.min && parsed <= bounds.max
    ? { value: parsed, invalid: false }
    : { value: fallback, invalid: true };
}

function parseEnum<T extends string>(value: string | undefined, values: readonly T[]) {
  return value && values.includes(value as T) ? (value as T) : undefined;
}

function parseFlag(value: string | undefined) {
  return value === "1" || value === "true";
}

export function normalizeRoomSearchParams(params: RoomSearchParams) {
  const query = new URLSearchParams();
  if (params.checkIn) query.set("check_in", params.checkIn);
  if (params.checkOut) query.set("check_out", params.checkOut);
  query.set("adults", String(params.adults));
  query.set("children", String(params.children));
  query.set("rooms", String(params.rooms));
  if (params.propertyType) query.set("property_type", params.propertyType);
  if (params.area) query.set("area", params.area);
  if (params.bathroomType) query.set("bathroom", params.bathroomType);
  if (params.balcony) query.set("balcony", params.balcony);
  if (params.viewType) query.set("view", params.viewType);
  if (params.carAccess) query.set("car_access", params.carAccess);
  if (params.motorbikeAccess) query.set("motorbike_access", params.motorbikeAccess);
  if (params.parking) query.set("parking", params.parking);
  if (params.wifi) query.set("wifi", "1");
  if (params.breakfast) query.set("breakfast", "1");
  if (params.restaurant) query.set("restaurant", "1");
  if (params.bbq) query.set("bbq", "1");
  if (params.availableOnly) query.set("available", "1");
  if (params.page > 1) query.set("page", String(params.page));
  return query.toString();
}

export function buildRoomSearchUrl(params: RoomSearchParams, page = params.page) {
  const query = normalizeRoomSearchParams({ ...params, page });
  return query ? `${PUBLIC_ROUTES.stay}?${query}` : PUBLIC_ROUTES.stay;
}

export function buildStayContextQuery(params: Pick<RoomSearchParams, "checkIn" | "checkOut" | "adults" | "children" | "rooms">) {
  const query = new URLSearchParams();
  if (params.checkIn) query.set("check_in", params.checkIn);
  if (params.checkOut) query.set("check_out", params.checkOut);
  query.set("adults", String(params.adults));
  query.set("children", String(params.children));
  query.set("rooms", String(params.rooms));
  return query.toString();
}

export function parseRoomSearchParams(raw: RawSearchParams): ParsedRoomSearch {
  const issues: string[] = [];
  const rawCheckIn = firstValue(raw.check_in);
  const rawCheckOut = firstValue(raw.check_out);
  const checkIn = parseStrictDate(rawCheckIn);
  let checkOut = parseStrictDate(rawCheckOut);

  if (rawCheckIn && !checkIn) issues.push("Ngày nhận phòng không hợp lệ.");
  if (rawCheckOut && !checkOut) issues.push("Ngày trả phòng không hợp lệ.");
  if (checkIn && checkOut && checkOut <= checkIn) {
    issues.push("Ngày trả phòng phải sau ngày nhận phòng.");
    checkOut = undefined;
  }

  const adults = parseBoundedInteger(
    firstValue(raw.adults),
    DEFAULT_ROOM_SEARCH_PARAMS.adults,
    SEARCH_LIMITS.adults,
  );
  const children = parseBoundedInteger(
    firstValue(raw.children),
    DEFAULT_ROOM_SEARCH_PARAMS.children,
    SEARCH_LIMITS.children,
  );
  const rooms = parseBoundedInteger(
    firstValue(raw.rooms),
    DEFAULT_ROOM_SEARCH_PARAMS.rooms,
    SEARCH_LIMITS.rooms,
  );
  const page = parseBoundedInteger(
    firstValue(raw.page),
    DEFAULT_ROOM_SEARCH_PARAMS.page,
    SEARCH_LIMITS.page,
  );

  if (adults.invalid) issues.push("Số người lớn phải từ 1 đến 20.");
  if (children.invalid) issues.push("Số trẻ em phải từ 0 đến 20.");
  if (rooms.invalid) issues.push("Số phòng yêu cầu phải từ 1 đến 10.");
  if (page.invalid) issues.push("Trang kết quả không hợp lệ.");

  const rawArea = firstValue(raw.area)?.trim();
  const area = rawArea && rawArea.length <= 120 ? rawArea : undefined;
  if (rawArea && !area) issues.push("Khu vực không hợp lệ.");

  const requestedAvailableOnly = parseFlag(firstValue(raw.available));
  const availableOnly = requestedAvailableOnly && Boolean(checkIn && checkOut);
  if (requestedAvailableOnly && !availableOnly) {
    issues.push("Chỉ có thể lọc phòng đang xác nhận còn khi đã chọn đủ ngày hợp lệ.");
  }

  const params: RoomSearchParams = {
    checkIn,
    checkOut,
    adults: adults.value,
    children: children.value,
    rooms: rooms.value,
    propertyType: parseEnum<PropertyType>(firstValue(raw.property_type), PROPERTY_TYPES),
    area,
    bathroomType: parseEnum<BathroomType>(firstValue(raw.bathroom), BATHROOM_TYPES),
    balcony: parseEnum(firstValue(raw.balcony), ["yes", "no"] as const),
    viewType: parseEnum<ViewType>(firstValue(raw.view), VIEW_TYPES),
    carAccess: parseEnum<AccessCertainty>(firstValue(raw.car_access), ACCESS_CERTAINTIES),
    motorbikeAccess: parseEnum<AccessCertainty>(firstValue(raw.motorbike_access), ACCESS_CERTAINTIES),
    parking: parseEnum<AccessCertainty>(firstValue(raw.parking), ACCESS_CERTAINTIES),
    wifi: parseFlag(firstValue(raw.wifi)),
    breakfast: parseFlag(firstValue(raw.breakfast)),
    restaurant: parseFlag(firstValue(raw.restaurant)),
    bbq: parseFlag(firstValue(raw.bbq)),
    availableOnly,
    page: page.value,
  };

  return { params, issues, normalizedQuery: normalizeRoomSearchParams(params) };
}

export function countActiveSearchFilters(params: RoomSearchParams) {
  return [
    params.checkIn,
    params.checkOut,
    params.adults !== DEFAULT_ROOM_SEARCH_PARAMS.adults,
    params.children !== DEFAULT_ROOM_SEARCH_PARAMS.children,
    params.rooms !== DEFAULT_ROOM_SEARCH_PARAMS.rooms,
    params.propertyType,
    params.area,
    params.bathroomType,
    params.balcony,
    params.viewType,
    params.carAccess,
    params.motorbikeAccess,
    params.parking,
    params.wifi,
    params.breakfast,
    params.restaurant,
    params.bbq,
    params.availableOnly,
  ].filter(Boolean).length;
}
