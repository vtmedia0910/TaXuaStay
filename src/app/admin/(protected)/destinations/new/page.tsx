import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DestinationForm } from "@/components/admin/destination-form";

export default function NewDestinationPage() {
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Thêm điểm đến" description="Bản ghi mới mặc định draft và không xuất hiện công khai." /><DestinationForm /></main>;
}
