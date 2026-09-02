export const ASSISTANT_DISCOVERY_VERSION = "phase13c-v1";
export const ASSISTANT_TEASER_DELAY_MS = 5_000;
export const ASSISTANT_TEASER_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1_000;
export const ASSISTANT_TEASER_SCROLL_RATIO = 0.3;

export type AssistantPublicReadiness =
  | "ready"
  | "disabled"
  | "not_configured"
  | "temporarily_unavailable";

export type AssistantPageKind =
  | "home"
  | "stay"
  | "property"
  | "room"
  | "packages"
  | "package"
  | "motorbike"
  | "motorbike_detail"
  | "trip_finder"
  | "other";

export interface AssistantPageContext {
  pageKind: AssistantPageKind;
  pathname: string;
  destinationSlug?: "ta-xua";
  propertySlug?: string;
  roomSlug?: string;
  packageSlug?: string;
  motorbikeSlug?: string;
}

export interface AssistantDiscoveryRecord {
  version: string;
  lastShownAt?: number;
  lastDismissedAt?: number;
}

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeSlug(value: string | undefined) {
  return value && value.length <= 100 && SAFE_SLUG.test(value) ? value : undefined;
}

export function getAssistantPageContext(pathname: string): AssistantPageContext | null {
  const candidate = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (!candidate.startsWith("/") || candidate.length > 320 || !/^\/[a-z0-9\/-]*$/.test(candidate)) return null;
  const safePath = candidate;
  const segments = safePath.split("/").filter(Boolean);

  if (safePath === "/") return { pageKind: "home", pathname: "/", destinationSlug: "ta-xua" };
  if (segments[0] === "stay") {
    const propertySlug = safeSlug(segments[1]);
    const roomSlug = safeSlug(segments[2]);
    if (segments.length === 1) return { pageKind: "stay", pathname: "/stay", destinationSlug: "ta-xua" };
    if (segments.length === 2 && propertySlug) {
      return { pageKind: "property", pathname: `/stay/${propertySlug}`, destinationSlug: "ta-xua", propertySlug };
    }
    if (segments.length === 3 && propertySlug && roomSlug) {
      return { pageKind: "room", pathname: `/stay/${propertySlug}/${roomSlug}`, destinationSlug: "ta-xua", propertySlug, roomSlug };
    }
  }
  if (segments[0] === "packages") {
    const packageSlug = safeSlug(segments[1]);
    if (segments.length === 1) return { pageKind: "packages", pathname: "/packages", destinationSlug: "ta-xua" };
    if (segments.length === 2 && packageSlug) {
      return { pageKind: "package", pathname: `/packages/${packageSlug}`, destinationSlug: "ta-xua", packageSlug };
    }
  }
  if (segments[0] === "motorbike") {
    const motorbikeSlug = safeSlug(segments[1]);
    if (segments.length === 1) return { pageKind: "motorbike", pathname: "/motorbike", destinationSlug: "ta-xua" };
    if (segments.length === 2 && motorbikeSlug) {
      return { pageKind: "motorbike_detail", pathname: `/motorbike/${motorbikeSlug}`, destinationSlug: "ta-xua", motorbikeSlug };
    }
  }
  if (safePath === "/trip-finder") return { pageKind: "trip_finder", pathname: safePath, destinationSlug: "ta-xua" };
  return safePath.startsWith("/booking") || safePath.startsWith("/admin") || safePath === "/assistant"
    ? null
    : { pageKind: "other", pathname: safePath };
}

export function isAssistantDiscoveryRouteSuppressed(pathname: string) {
  return pathname === "/assistant"
    || pathname.startsWith("/admin")
    || pathname.startsWith("/auth")
    || pathname.startsWith("/login")
    || pathname.startsWith("/booking")
    || pathname === "/trip-finder";
}

export function parseAssistantDiscoveryRecord(value: string | null): AssistantDiscoveryRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AssistantDiscoveryRecord>;
    if (parsed.version !== ASSISTANT_DISCOVERY_VERSION) return null;
    const lastShownAt = Number.isFinite(parsed.lastShownAt) ? Number(parsed.lastShownAt) : undefined;
    const lastDismissedAt = Number.isFinite(parsed.lastDismissedAt) ? Number(parsed.lastDismissedAt) : undefined;
    return { version: ASSISTANT_DISCOVERY_VERSION, lastShownAt, lastDismissedAt };
  } catch {
    return null;
  }
}

export function shouldShowAssistantTeaser({
  readiness,
  pathname,
  record,
  seenThisSession,
  now = Date.now(),
}: {
  readiness: AssistantPublicReadiness;
  pathname: string;
  record: AssistantDiscoveryRecord | null;
  seenThisSession: boolean;
  now?: number;
}) {
  if (readiness !== "ready" || seenThisSession || isAssistantDiscoveryRouteSuppressed(pathname)) return false;
  const latest = Math.max(record?.lastShownAt ?? 0, record?.lastDismissedAt ?? 0);
  return !latest || now - latest >= ASSISTANT_TEASER_COOLDOWN_MS;
}

export function getAssistantSuggestions(context: AssistantPageContext | null) {
  if (context?.pageKind === "room") {
    return ["Phòng này đã xác minh những gì?", "Kiểm tra giá và tình trạng phòng", "Đường vào nơi lưu trú thế nào?"] as const;
  }
  if (context?.pageKind === "property") {
    return ["Nơi này có phòng nào hợp 2 người?", "View và đường vào đã xác minh chưa?", "Kiểm tra giá và tình trạng phòng"] as const;
  }
  if (context?.pageKind === "package") {
    return ["Gói này gồm những gì?", "Giá gói được xác nhận thế nào?", "Gói này có phù hợp 2 người không?"] as const;
  }
  if (context?.pageKind === "motorbike_detail") {
    return ["Xe này phù hợp nhu cầu nào?", "Giá và tình trạng xác nhận thế nào?", "Gợi ý chuyến đi có xe máy"] as const;
  }
  return ["Gợi ý phòng hợp 2 người", "Tìm phòng có view mây đã xác minh", "Đường vào chỗ ở được xác minh thế nào?"] as const;
}
