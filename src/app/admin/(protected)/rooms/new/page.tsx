import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RoomForm } from "@/components/admin/room-form";
import { getAdminAmenities } from "@/features/amenities/data";
import { getAdminPropertyOptions } from "@/features/properties/data";

export default async function NewRoomPage() {
  const [properties, amenities] = await Promise.all([getAdminPropertyOptions(), getAdminAmenities()]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm loại phòng" description="Tạo room type thật; không nhập giá hoặc availability trong Phase 2." /><RoomForm properties={properties} amenities={amenities} /></main>;
}
