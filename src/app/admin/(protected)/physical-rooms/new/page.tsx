import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PhysicalRoomForm } from "@/components/admin/physical-room-form";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function NewPhysicalRoomPage() {
  const [properties, rooms] = await Promise.all([getAdminPropertyOptions(), getAdminRoomOptions()]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm phòng cụ thể" description="Chỉ tạo khi biết danh tính phòng thật và mã nghiệp vụ ổn định." /><PhysicalRoomForm properties={properties} rooms={rooms} /></main>;
}
