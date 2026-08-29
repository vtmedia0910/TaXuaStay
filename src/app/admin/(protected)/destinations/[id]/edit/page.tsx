import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DestinationForm } from "@/components/admin/destination-form";
import { FormFeedback } from "@/components/admin/form-feedback";
import { getAdminDestination } from "@/features/destinations/data";

export default async function EditDestinationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [destination, feedback] = await Promise.all([getAdminDestination(id), searchParams]);
  if (!destination) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title={`Sửa: ${destination.name}`} description="Điểm đến là quan hệ dữ liệu thật, không phải nhãn hard-code trong property." /><FormFeedback saved={feedback.saved} error={feedback.error} /><DestinationForm destination={destination} /></main>;
}
