import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { VerificationForm } from "@/components/admin/verification-form";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";
import { getAdminVerificationEvidenceOptions, getAdminVerificationRecord } from "@/features/verification/data";

export default async function EditVerificationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [record, properties, rooms, evidence, feedback] = await Promise.all([
    getAdminVerificationRecord(id), getAdminPropertyOptions(), getAdminRoomOptions(),
    getAdminVerificationEvidenceOptions(), searchParams,
  ]);
  if (!record) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Hồ sơ xác minh" description="Cập nhật lifecycle, facts và evidence; type/target được khóa để giữ lịch sử audit." /><FormFeedback saved={feedback.saved} error={feedback.error} /><VerificationForm record={record} properties={properties} rooms={rooms} evidence={evidence} /></main>;
}
