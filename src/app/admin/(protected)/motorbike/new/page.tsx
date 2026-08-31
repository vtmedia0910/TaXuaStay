import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MotorbikeOfferingForm } from "@/components/admin/motorbike-offering-form";
import { getAdminCmsMedia } from "@/features/cms/data";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminMotorbikeSources } from "@/features/motorbike/admin-data";

export default async function NewMotorbikeOfferingPage() {
  await requireAdminUser(["admin"], "/admin/motorbike?error=motorbike-forbidden");
  const [sources, media] = await Promise.all([getAdminMotorbikeSources(), getAdminCmsMedia()]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm lựa chọn xe máy" description="Tạo projection công khai từ mapping Biker thật; không tạo xe vật lý hoặc booking." /><MotorbikeOfferingForm sources={sources} media={media} /></main>;
}
