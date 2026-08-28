import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RoomForm } from "@/components/admin/room-form";
import { getAdminAmenities } from "@/features/amenities/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoom } from "@/features/rooms/data";

export default async function EditRoomPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [room, properties, amenities, feedback] = await Promise.all([getAdminRoom(id), getAdminPropertyOptions(), getAdminAmenities(), searchParams]);
  if (!room) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title={`Sửa: ${room.name}`} description="Quantity là số phòng vật lý, không phải số phòng trống theo ngày." /><FormFeedback saved={feedback.saved} error={feedback.error} /><RoomForm room={room} properties={properties} amenities={amenities} /></main>;
}
