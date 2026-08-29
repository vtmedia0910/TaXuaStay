import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RateRuleForm } from "@/components/admin/rate-rule-form";
import { getAdminRatePlanOptions } from "@/features/pricing/data";
import { getAdminRoomOptions } from "@/features/rooms/data";
import { getAdminPropertyOptions } from "@/features/properties/data";

export default async function NewRateRulePage() {
  const [plans, rooms, properties] = await Promise.all([getAdminRatePlanOptions(), getAdminRoomOptions(), getAdminPropertyOptions()]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm quy tắc giá" description="Thiết lập một quy tắc theo đêm. Giá cao điểm, lễ và điều chỉnh riêng phải có khoảng ngày." /><RateRuleForm plans={plans} rooms={rooms} properties={properties} /></main>;
}
