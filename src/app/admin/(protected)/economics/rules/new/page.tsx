import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CommercialRuleForm } from "@/components/admin/commercial-rule-form";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminCommercialPlanOptions, getAdminEconomicsSupplierOptions } from "@/features/economics/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function NewCommercialRulePage() {
  const [user, plans, suppliers, properties, rooms] = await Promise.all([
    requireAdminUser(),
    getAdminCommercialPlanOptions(),
    getAdminEconomicsSupplierOptions(),
    getAdminPropertyOptions(),
    getAdminRoomOptions(),
  ]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm quy tắc chi phí" description="Ghi nhận giá vốn hoặc tham chiếu thị trường theo đêm; không suy ra từ giá bán." /><CommercialRuleForm plans={plans} suppliers={suppliers} properties={properties} rooms={rooms} role={user.role} /></main>;
}
