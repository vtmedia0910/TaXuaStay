import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { PhysicalRoomForm } from "@/components/admin/physical-room-form";
import { getAdminPhysicalRoom } from "@/features/physical-rooms/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function EditPhysicalRoomPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [physicalRoom, properties, rooms, feedback] = await Promise.all([getAdminPhysicalRoom(id), getAdminPropertyOptions(), getAdminRoomOptions(), searchParams]);
  if (!physicalRoom) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title={`Phòng cụ thể: ${physicalRoom.room_code}`} description="Property và mã phòng được khóa để giữ danh tính ổn định; có thể đổi loại phòng trong cùng property." /><FormFeedback saved={feedback.saved} error={feedback.error} /><PhysicalRoomForm physicalRoom={physicalRoom} properties={properties} rooms={rooms} /></main>;
}
