import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RoomProfileNoteForm } from "@/components/admin/room-profile-note-form";
import { getAdminPhysicalRoomOptions } from "@/features/physical-rooms/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomProfileNote } from "@/features/room-profiles/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function EditRoomProfileNotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [note, properties, rooms, physicalRooms, feedback] = await Promise.all([
    getAdminRoomProfileNote(id),
    getAdminPropertyOptions(),
    getAdminRoomOptions(),
    getAdminPhysicalRoomOptions(),
    searchParams,
  ]);
  if (!note) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Cập nhật ghi chú phòng" description="Giữ đúng scope và chỉ công khai quan sát đã được kiểm tra." /><FormFeedback saved={feedback.saved} error={feedback.error} /><RoomProfileNoteForm note={note} properties={properties} rooms={rooms} physicalRooms={physicalRooms} /></main>;
}
