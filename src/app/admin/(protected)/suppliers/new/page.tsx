import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SupplierProfileForm } from "@/components/admin/supplier-forms";
import { requireAdminUser } from "@/features/admin/auth";

export default async function NewSupplierPage() {
  await requireAdminUser(["admin"], "/admin/suppliers?error=forbidden");
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Thêm nhà cung cấp" description="Tạo danh tính riêng tư; có thể lưu cùng liên hệ chính đầu tiên trong một giao dịch." />
      <SupplierProfileForm />
    </main>
  );
}
