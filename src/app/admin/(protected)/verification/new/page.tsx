import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VerificationForm } from "@/components/admin/verification-form";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminPhysicalRoomOptions } from "@/features/physical-rooms/data";
import { getAdminRoomOptions } from "@/features/rooms/data";
import { getAdminVerificationEvidenceOptions } from "@/features/verification/data";

import type { VerificationType } from "@/features/verification/types";
import { VERIFICATION_TYPES } from "@/features/verification/types";

export default async function NewVerificationPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const initialType = VERIFICATION_TYPES.includes(params.type as VerificationType)
    ? params.type as VerificationType
    : undefined;
  const [properties, rooms, physicalRooms, evidence] = await Promise.all([
    getAdminPropertyOptions(), getAdminRoomOptions(), getAdminPhysicalRoomOptions(), getAdminVerificationEvidenceOptions(),
  ]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Tạo xác minh" description="Chọn đúng target, nhập facts và liên kết bằng chứng thực tế. Không có dữ liệu nào được tự động đánh dấu verified." /><VerificationForm initialType={initialType} properties={properties} rooms={rooms} physicalRooms={physicalRooms} evidence={evidence} /></main>;
}
