import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { MediaForm } from "@/components/admin/media-form";
import { getAdminMediaAsset } from "@/features/media/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminPhysicalRoomOptions } from "@/features/physical-rooms/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function EditMediaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [asset, properties, rooms, physicalRooms, feedback] = await Promise.all([getAdminMediaAsset(id), getAdminPropertyOptions(), getAdminRoomOptions(), getAdminPhysicalRoomOptions(), searchParams]);
  if (!asset) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Sửa media" description="Public chỉ nhìn thấy asset đã review và có parent published/active." /><FormFeedback saved={feedback.saved} error={feedback.error} /><MediaForm asset={asset} properties={properties} rooms={rooms} physicalRooms={physicalRooms} /></main>;
}
