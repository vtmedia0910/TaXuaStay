import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RatePlanForm } from "@/components/admin/rate-plan-form";
import { getAdminRatePlan } from "@/features/pricing/data";
import { getAdminPropertyOptions } from "@/features/properties/data";

export default async function EditRatePlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [plan, properties, feedback] = await Promise.all([getAdminRatePlan(id), getAdminPropertyOptions(), searchParams]);
  if (!plan) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title={`Sửa bảng giá: ${plan.name}`} description="Lưu trữ hoặc ngừng hoạt động thay vì xóa lịch sử giá." /><FormFeedback saved={feedback.saved} error={feedback.error} /><RatePlanForm plan={plan} properties={properties} /></main>;
}
