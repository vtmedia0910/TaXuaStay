import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CommercialRuleForm } from "@/components/admin/commercial-rule-form";
import { FormFeedback } from "@/components/admin/form-feedback";
import { requireAdminUser } from "@/features/admin/auth";
import {
  getAdminCommercialPlanOptions,
  getAdminCommercialRule,
  getAdminEconomicsSupplierOptions,
} from "@/features/economics/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function EditCommercialRulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const [user, rule, plans, suppliers, properties, rooms, feedback] = await Promise.all([
    requireAdminUser(),
    getAdminCommercialRule(id),
    getAdminCommercialPlanOptions(),
    getAdminEconomicsSupplierOptions(),
    getAdminPropertyOptions(),
    getAdminRoomOptions(),
    searchParams,
  ]);
  if (!rule) notFound();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Sửa quy tắc chi phí" description="Giữ nguyên chủ sở hữu của quy tắc; hết hiệu lực quy tắc cũ và tạo quy tắc mới khi phạm vi thay đổi." /><FormFeedback saved={feedback.saved} error={feedback.error} /><CommercialRuleForm rule={rule} plans={plans} suppliers={suppliers} properties={properties} rooms={rooms} role={user.role} /></main>;
}
