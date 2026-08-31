import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PackageCommerceForm } from "@/components/admin/package-commerce-form";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminCmsMedia } from "@/features/cms/data";
import { getAdminDestinationOptions } from "@/features/destinations/data";
import { getAdminPackageSources } from "@/features/packages/data";

export default async function NewPackagePage() {
  await requireAdminUser(["admin"], "/admin/packages?error=package-forbidden");
  const [destinations, sources, media] = await Promise.all([getAdminDestinationOptions(), getAdminPackageSources(), getAdminCmsMedia()]);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Tạo gói dịch vụ" description="Bắt đầu bằng nguồn thật. Giá gói phải là quy tắc riêng, không cộng ngầm giá lẻ." /><PackageCommerceForm destinations={destinations} rooms={sources.rooms} motorbikes={sources.motorbikes} media={media} /></main>;
}
