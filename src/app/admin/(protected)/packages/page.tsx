import Link from "next/link";
import { AlertTriangle, Package, Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentAdminUser } from "@/features/admin/auth";
import { getAdminPackages, getAdminPackageSources } from "@/features/packages/data";
import { PACKAGE_CONFIRMATION_LABELS, PACKAGE_LIFECYCLE_LABELS } from "@/features/packages/policy";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPackagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [packages, sources, user] = await Promise.all([getAdminPackages(), getAdminPackageSources(), getCurrentAdminUser()]);
  const hasRealSource = sources.rooms.some((room) => room.is_active && room.publish_status === "published")
    || sources.motorbikes.some((offering) => offering.publication_status === "published");
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <AdminPageHeader title="Gói dịch vụ" description="Quản lý identity, thành phần thật, giá gói, xác nhận và kinh tế riêng tư. Không tạo booking hay giữ chỗ." action={user?.role === "admin" ? <Link href="/admin/packages/new" className={buttonVariants()}><Plus size={18} aria-hidden="true" />Tạo gói</Link> : undefined} />
    <FormFeedback saved={first(params.saved)} error={first(params.error)} />
    {!hasRealSource ? <Card className="mb-5 border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-warning" aria-hidden="true" /><div><h2 className="font-bold text-pine">Chưa có nguồn dịch vụ đang công khai</h2><p className="mt-1 text-sm leading-6 text-muted">Production hiện không có phòng hoặc lựa chọn xe máy thật. Có thể chuẩn bị bản nháp, nhưng không tạo dữ liệu giả để công khai.</p></div></div></Card> : null}
    <div className="grid gap-4">
      {packages.map((item) => <Card key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge>{PACKAGE_LIFECYCLE_LABELS[item.lifecycle_status]}</Badge>{item.is_featured ? <Badge className="bg-sky/10 text-sky">Nổi bật</Badge> : null}</div><h2 className="mt-3 text-2xl font-bold text-pine">{item.name}</h2><p className="mt-1 text-sm leading-6 text-muted">{item.proposition}</p></div>{user?.role === "admin" ? <Link href={`/admin/packages/${item.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} aria-hidden="true" />Chi tiết</Link> : null}</div><div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3"><p><span className="text-muted">Mã</span><strong className="mt-1 block text-pine">{item.code}</strong></p><p><span className="text-muted">Xác nhận</span><strong className="mt-1 block text-pine">{PACKAGE_CONFIRMATION_LABELS[item.confirmation_mode]}</strong></p><p><span className="text-muted">Cập nhật</span><strong className="mt-1 block text-pine">{new Intl.DateTimeFormat("vi-VN").format(new Date(item.updated_at))}</strong></p></div></Card>)}
      {!packages.length ? <Card className="grid place-items-center gap-3 p-10 text-center"><Package size={36} className="text-copper" aria-hidden="true" /><h2 className="text-xl font-bold text-pine">Chưa có gói dịch vụ</h2><p className="max-w-xl text-sm leading-6 text-muted">Migration không seed combo, giá, giảm giá hoặc nguồn giả. Public sẽ giữ empty state trung thực.</p></Card> : null}
    </div>
  </main>;
}
