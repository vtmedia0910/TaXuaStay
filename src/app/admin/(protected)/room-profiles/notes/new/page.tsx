import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RoomProfileNoteForm } from "@/components/admin/room-profile-note-form";
import { getAdminPhysicalRoomOptions } from "@/features/physical-rooms/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function NewRoomProfileNotePage() {
  const [properties, rooms, physicalRooms] = await Promise.all([
    getAdminPropertyOptions(),
    getAdminRoomOptions(),
    getAdminPhysicalRoomOptions(),
  ]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm điểm mạnh / điểm cần lưu ý" description="Ghi nhận một quan sát factual cho đúng loại phòng hoặc Room ID." /><RoomProfileNoteForm properties={properties} rooms={rooms} physicalRooms={physicalRooms} /></main>;
}
