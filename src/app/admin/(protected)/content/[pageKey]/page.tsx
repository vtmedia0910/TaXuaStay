import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CmsPageEditor } from "@/components/admin/cms-page-editor";
import { FormFeedback } from "@/components/admin/form-feedback";
import { EmptyState } from "@/components/feedback/empty-state";
import { requireAdminUser } from "@/features/admin/auth";
import { getAdminCmsMedia, getAdminCmsPage, getAdminCmsRoomOptions } from "@/features/cms/data";
import { CMS_PAGE_KEYS, type CmsPageKey } from "@/features/cms/types";

export default async function AdminCmsPage({ params, searchParams }: { params: Promise<{ pageKey: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ pageKey }, feedback] = await Promise.all([params, searchParams]);
  if (!CMS_PAGE_KEYS.includes(pageKey as CmsPageKey) || !["home", "stay"].includes(pageKey)) notFound();
  const [user, page, media, options] = await Promise.all([requireAdminUser(), getAdminCmsPage(pageKey as CmsPageKey), getAdminCmsMedia(), getAdminCmsRoomOptions()]);
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><AdminPageHeader title={pageKey === "home" ? "Nội dung Trang chủ" : "Nội dung Lưu trú"} description="Mọi thay đổi được lưu nháp trước; chỉ Admin có thể xuất bản nguyên tử toàn trang." /><FormFeedback saved={feedback.saved} error={feedback.error} />{page ? <CmsPageEditor page={page} media={media} roomTypes={options.roomTypes} physicalRooms={options.physicalRooms} role={user.role} /> : <EmptyState title="Chưa có cấu trúc CMS" description="Hãy xác nhận migrations CMS đã được áp dụng cho đúng Supabase project." />}</main>;
}
