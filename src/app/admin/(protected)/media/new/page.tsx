import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MediaForm } from "@/components/admin/media-form";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminPhysicalRoomOptions } from "@/features/physical-rooms/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function NewMediaPage() {
  const [properties, rooms, physicalRooms] = await Promise.all([getAdminPropertyOptions(), getAdminRoomOptions(), getAdminPhysicalRoomOptions()]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm media" description="Chỉ URL HTTPS; chọn đúng một owner. Storage upload được để lại cho setup riêng." /><MediaForm properties={properties} rooms={rooms} physicalRooms={physicalRooms} /></main>;
}
