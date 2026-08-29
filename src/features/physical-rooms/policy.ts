import { resolveVerificationState } from "@/features/verification/policy";
import type {
  PublicVerificationBadgeDto,
  VerificationStatus,
} from "@/features/verification/types";

export type ExactRoomVerificationState = "verified" | "expired" | "needs_review" | "not_verified";

type ExactRoomVerificationSnapshot = PublicVerificationBadgeDto & {
  status?: VerificationStatus;
};

export function resolveExactRoomVerificationState({
  physicalRoomId,
  roomCode,
  isPublicPhysicalRoom,
  roomVerification,
  evidencePhysicalRoomIds,
  now = new Date(),
}: {
  physicalRoomId: string;
  roomCode: string;
  isPublicPhysicalRoom: boolean;
  roomVerification: ExactRoomVerificationSnapshot | null;
  evidencePhysicalRoomIds: string[];
  now?: Date;
}) {
  if (!isPublicPhysicalRoom || !roomCode.trim() || !roomVerification) return "not_verified";
  if (roomVerification.verification_type !== "room") return "not_verified";
  if (roomVerification.physical_room_id !== physicalRoomId) return "not_verified";
  if (roomVerification.property_id !== null || roomVerification.room_type_id !== null) return "not_verified";
  const resolved = resolveVerificationState(
    roomVerification.status ?? "verified",
    roomVerification.verified_at,
    roomVerification.expires_at,
    now,
  );
  if (resolved === "needs_review") return "needs_review";
  if (resolved === "expired") return "expired";
  if (resolved !== "current") return "not_verified";
  return evidencePhysicalRoomIds.includes(physicalRoomId) ? "verified" : "not_verified";
}

export function isExactRoomVerified(
  input: Parameters<typeof resolveExactRoomVerificationState>[0],
) {
  return resolveExactRoomVerificationState(input) === "verified";
}
