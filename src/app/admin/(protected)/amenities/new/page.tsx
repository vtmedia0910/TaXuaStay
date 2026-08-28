import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AmenityForm } from "@/components/admin/amenity-form";

export default function NewAmenityPage() {
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm amenity" description="Tạo một mục catalog chuẩn có thể gán cho property hoặc room." /><AmenityForm /></main>;
}
