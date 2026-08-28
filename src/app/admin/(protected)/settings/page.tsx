import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { SettingsForm } from "@/components/admin/settings-form";
import { EmptyState } from "@/components/feedback/empty-state";
import { getAdminSiteSettings } from "@/features/settings/data";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [settings, params] = await Promise.all([getAdminSiteSettings(), searchParams]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Cấu hình website"
        description="Thông tin công khai nền tảng. Chỉ tài khoản có role admin trong app_metadata mới được cập nhật."
      />
      <FormFeedback saved={params.saved} error={params.error} />
      {settings ? (
        <SettingsForm settings={settings} />
      ) : (
        <EmptyState
          title="Chưa đọc được cấu hình"
          description="Hãy xác nhận migration Phase 1 đã được áp dụng cho đúng project Supabase của Stay."
        />
      )}
    </main>
  );
}
