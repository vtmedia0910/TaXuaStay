import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { MotorbikeOfferingForm } from "@/components/admin/motorbike-offering-form";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminCmsMedia } from "@/features/cms/data";
import { getAdminMotorbikeOffering, getAdminMotorbikeSources } from "@/features/motorbike/admin-data";

export default async function EditMotorbikeOfferingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdminUser(["admin"], "/admin/motorbike?error=motorbike-forbidden");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [offering, sources, media] = await Promise.all([getAdminMotorbikeOffering(id), getAdminMotorbikeSources(), getAdminCmsMedia()]);
  if (!offering) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title={offering.display_name} description="Projection phía Trip; nguồn vận hành vẫn thuộc Tà Xùa Biker." /><FormFeedback saved={query.saved} error={query.error} /><MotorbikeOfferingForm offering={offering} sources={sources} media={media} /></main>;
}
