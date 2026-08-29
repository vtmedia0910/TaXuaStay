import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PropertyForm } from "@/components/admin/property-form";
import { getAdminAmenities } from "@/features/amenities/data";
import { getAdminDestinationOptions } from "@/features/destinations/data";

export default async function NewPropertyPage() {
  const [amenities, destinations] = await Promise.all([
    getAdminAmenities(),
    getAdminDestinationOptions(),
  ]);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Thêm nơi lưu trú" description="Bản ghi mới mặc định là draft và không lộ ra public." />
      <PropertyForm amenities={amenities} destinations={destinations} />
    </main>
  );
}
