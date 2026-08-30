import { Link2, Upload } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsMediaLibrary } from "@/components/admin/cms-media-library";
import { FormFeedback } from "@/components/admin/form-feedback";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminUser } from "@/features/admin/auth";
import { addExternalCmsMediaAction } from "@/features/cms/actions";
import { getAdminCmsMediaPage } from "@/features/cms/data";
import { CMS_MEDIA_ROLE_LABELS } from "@/features/cms/ui";

export default async function AdminSiteMediaPage({ searchParams }: {
  searchParams: Promise<{ saved?: string; error?: string; search?: string; role?: string; page?: string }>;
}) {
  const [user, params] = await Promise.all([requireAdminUser(), searchParams]);
  const media = await getAdminCmsMediaPage({ query: params.search ?? "", role: params.role ?? "all", page: params.page ?? 1, pageSize: 24 });
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Media website" description="Thư viện ảnh marketing, tách biệt hoàn toàn với media phòng và bằng chứng xác minh." />
      <FormFeedback saved={params.saved} error={params.error} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <details open>
            <summary className="cursor-pointer text-xl font-bold text-pine"><span className="inline-flex items-center gap-2"><Upload size={20} /> Tải ảnh mới</span></summary>
            <MediaUploadForm />
          </details>
        </Card>
        <Card className="p-5 sm:p-6">
          <details>
            <summary className="cursor-pointer text-xl font-bold text-pine"><span className="inline-flex items-center gap-2"><Link2 size={20} /> Thêm ảnh HTTPS bên ngoài</span></summary>
            <form action={addExternalCmsMediaAction} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên ảnh" htmlFor="external-title"><Input id="external-title" name="title" minLength={2} maxLength={160} required /></Field>
                <Field label="Vai trò" htmlFor="external-role"><Select id="external-role" name="role" defaultValue="general">{Object.entries(CMS_MEDIA_ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select></Field>
              </div>
              <Field label="Alt text" htmlFor="external-alt"><Input id="external-alt" name="alt_text" minLength={2} maxLength={300} required /></Field>
              <Field label="Chú thích (không bắt buộc)" htmlFor="external-caption"><Textarea id="external-caption" name="caption" maxLength={500} /></Field>
              <Field label="URL HTTPS" htmlFor="external-url" hint="Chỉ dùng nguồn ảnh đã được phép sử dụng."><Input id="external-url" name="external_url" type="url" placeholder="https://…" maxLength={2048} required /></Field>
              <input type="hidden" name="focal_x" value="50" /><input type="hidden" name="focal_y" value="50" />
              <div><SubmitButton label="Lưu ảnh bên ngoài" /></div>
            </form>
          </details>
        </Card>
      </div>
      <CmsMediaLibrary result={media} isAdmin={user.role === "admin"} />
    </main>
  );
}
