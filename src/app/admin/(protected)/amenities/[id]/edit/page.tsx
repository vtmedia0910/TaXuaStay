import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AmenityForm } from "@/components/admin/amenity-form";
import { FormFeedback } from "@/components/admin/form-feedback";
import { getAdminAmenity } from "@/features/amenities/data";

export default async function EditAmenityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [amenity, feedback] = await Promise.all([getAdminAmenity(id), searchParams]);
  if (!amenity) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title={`Sửa: ${amenity.name}`} description="Deactivate để ẩn khỏi public thay vì hard-delete." /><FormFeedback saved={feedback.saved} error={feedback.error} /><AmenityForm amenity={amenity} /></main>;
}
