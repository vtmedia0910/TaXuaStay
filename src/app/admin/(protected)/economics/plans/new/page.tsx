import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CommercialPlanForm } from "@/components/admin/commercial-plan-form";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminEconomicsSupplierOptions } from "@/features/economics/data";
import { getAdminPropertyOptions } from "@/features/properties/data";

export default async function NewCommercialPlanPage() {
  const [user, suppliers, properties] = await Promise.all([
    requireAdminUser(),
    getAdminEconomicsSupplierOptions(),
    getAdminPropertyOptions(),
  ]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm bảng chi phí" description="Tạo khung economics riêng tư cho một nhà cung cấp và cơ sở; không tạo giá bán công khai." /><CommercialPlanForm suppliers={suppliers} properties={properties} role={user.role} /></main>;
}
