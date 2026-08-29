import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { RatePlanForm } from "@/components/admin/rate-plan-form";
import { getAdminPropertyOptions } from "@/features/properties/data";

export default async function NewRatePlanPage() {
  const properties = await getAdminPropertyOptions();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm bảng giá" description="Tạo khung giá VND cho một nơi lưu trú; chưa tạo dữ liệu giá phòng tự động." /><RatePlanForm properties={properties} /></main>;
}
