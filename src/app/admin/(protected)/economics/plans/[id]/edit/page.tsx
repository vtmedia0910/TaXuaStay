import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CommercialPlanForm } from "@/components/admin/commercial-plan-form";
import { FormFeedback } from "@/components/admin/form-feedback";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminCommercialPlan, getAdminEconomicsSupplierOptions } from "@/features/economics/data";
import { getAdminPropertyOptions } from "@/features/properties/data";

export default async function EditCommercialPlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [user, plan, suppliers, properties, feedback] = await Promise.all([
    requireAdminUser(),
    getAdminCommercialPlan(id),
    getAdminEconomicsSupplierOptions(),
    getAdminPropertyOptions(),
    searchParams,
  ]);
  if (!plan) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title={`Sửa bảng chi phí: ${plan.name}`} description="Lưu vòng đời và lịch sử; không xóa hoặc tái gán bảng sang nhà cung cấp/cơ sở khác." /><FormFeedback saved={feedback.saved} error={feedback.error} /><CommercialPlanForm plan={plan} suppliers={suppliers} properties={properties} role={user.role} /></main>;
}
