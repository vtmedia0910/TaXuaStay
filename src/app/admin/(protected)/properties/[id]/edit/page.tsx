import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { PropertyForm } from "@/components/admin/property-form";
import { getAdminAmenities } from "@/features/amenities/data";
import { getAdminProperty } from "@/features/properties/data";

export default async function EditPropertyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [property, amenities, feedback] = await Promise.all([getAdminProperty(id), getAdminAmenities(), searchParams]);
  if (!property) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title={`Sửa: ${property.name}`} description="Thay đổi được kiểm tra lại bằng Zod và constraint/RLS trong database." />
      <FormFeedback saved={feedback.saved} error={feedback.error} />
      <PropertyForm property={property} amenities={amenities} />
    </main>
  );
}
