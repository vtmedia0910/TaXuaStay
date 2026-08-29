import { resolveVerificationState } from "@/features/verification/policy";
import type { PublicVerificationBadgeDto } from "@/features/verification/types";

export function isExactRoomVerified({
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
  roomVerification: PublicVerificationBadgeDto | null;
  evidencePhysicalRoomIds: string[];
  now?: Date;
}) {
  if (!isPublicPhysicalRoom || !roomCode.trim() || !roomVerification) return false;
  if (roomVerification.verification_type !== "room") return false;
  if (roomVerification.physical_room_id !== physicalRoomId) return false;
  if (roomVerification.property_id !== null || roomVerification.room_type_id !== null) return false;
  if (
    resolveVerificationState(
      "verified",
      roomVerification.verified_at,
      roomVerification.expires_at,
      now,
    ) !== "current"
  ) return false;
  return evidencePhysicalRoomIds.includes(physicalRoomId);
}
