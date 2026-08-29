import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { VerificationForm } from "@/components/admin/verification-form";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";
import { getAdminVerificationEvidenceOptions } from "@/features/verification/data";

export default async function NewVerificationPage() {
  const [properties, rooms, evidence] = await Promise.all([
    getAdminPropertyOptions(), getAdminRoomOptions(), getAdminVerificationEvidenceOptions(),
  ]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Tạo xác minh" description="Chọn đúng target, nhập facts và liên kết bằng chứng thực tế. Không có dữ liệu nào được tự động đánh dấu verified." /><VerificationForm properties={properties} rooms={rooms} evidence={evidence} /></main>;
}
