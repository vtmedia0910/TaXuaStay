import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { RateRuleForm } from "@/components/admin/rate-rule-form";
import { getAdminRatePlanOptions, getAdminRateRule } from "@/features/pricing/data";
import { getAdminRoomOptions } from "@/features/rooms/data";
import { getAdminPropertyOptions } from "@/features/properties/data";

export default async function EditRateRulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [rule, plans, rooms, properties, feedback] = await Promise.all([getAdminRateRule(id), getAdminRatePlanOptions(), getAdminRoomOptions(), getAdminPropertyOptions(), searchParams]);
  if (!rule) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Sửa quy tắc giá" description="Ngừng hoạt động quy tắc cũ để giữ audit trail; preview sẽ báo xung đột cùng ưu tiên." /><FormFeedback saved={feedback.saved} error={feedback.error} /><RateRuleForm rule={rule} plans={plans} rooms={rooms} properties={properties} /></main>;
}
