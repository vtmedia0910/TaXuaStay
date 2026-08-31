import Link from "next/link";
import { AlertTriangle, Bike, Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentAdminUser } from "@/features/admin/auth";
import { getAdminMotorbikeOfferings, getAdminMotorbikeSources } from "@/features/motorbike/admin-data";
import { MOTORBIKE_AVAILABILITY_LABELS, MOTORBIKE_PUBLICATION_LABELS } from "@/features/motorbike/policy";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminMotorbikePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [offerings, sources, user] = await Promise.all([getAdminMotorbikeOfferings(), getAdminMotorbikeSources(), getCurrentAdminUser()]);
  const activeSources = sources.filter((source) => source.supplier_status === "active" && source.external_ref_active);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Xe máy · Tà Xùa Biker" description="Catalog công khai thủ công phía Trip. Fleet, còn xe, vận hành và khách thuê vẫn thuộc Biker." action={user?.role === "admin" && activeSources.length ? <Link href="/admin/motorbike/new" className={buttonVariants()}><Plus size={18} aria-hidden="true" />Thêm lựa chọn</Link> : undefined} />
      <FormFeedback saved={first(params.saved)} error={first(params.error)} />
      {!activeSources.length ? <Card className="mb-5 border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-warning" aria-hidden="true" /><div><h2 className="font-bold text-pine">Chưa có nguồn Biker hợp lệ</h2><p className="mt-1 text-sm leading-6 text-muted">Tạo Supplier loại Xe máy và external reference thật với system key <code>taxua_biker</code>. Không tạo dữ liệu giả để làm đầy giao diện.</p><Link href="/admin/suppliers" className="mt-3 inline-flex min-h-11 items-center font-bold text-pine">Mở Nhà cung cấp →</Link></div></div></Card> : null}
      <div className="grid gap-4">
        {offerings.map((offering) => <Card key={offering.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge>{MOTORBIKE_PUBLICATION_LABELS[offering.publication_status]}</Badge><Badge className={offering.availability_state === "unavailable" ? "bg-red-50 text-danger" : "bg-amber-50 text-warning"}>{MOTORBIKE_AVAILABILITY_LABELS[offering.availability_state]}</Badge></div><h2 className="mt-3 text-2xl font-bold text-pine">{offering.display_name}</h2><p className="mt-1 text-sm text-muted">{offering.source?.supplier_name ?? "Nguồn không còn hoạt động"} · taxua_biker</p></div>{user?.role === "admin" ? <Link href={`/admin/motorbike/${offering.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} aria-hidden="true" />Chi tiết</Link> : null}</div><div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3"><p><span className="text-muted">Giá</span><strong className="mt-1 block text-pine">{offering.public_price_vnd === null ? "Chưa có" : `${offering.public_price_vnd.toLocaleString("vi-VN")}₫`}</strong></p><p><span className="text-muted">Kiểm tra nguồn</span><strong className="mt-1 block text-pine">{offering.source_checked_at ? new Intl.DateTimeFormat("vi-VN").format(new Date(offering.source_checked_at)) : "Chưa có"}</strong></p><p><span className="text-muted">Chế độ</span><strong className="mt-1 block text-pine">Xác nhận thủ công</strong></p></div>{offering.warnings.length ? <div className="mt-4 flex flex-wrap gap-2">{offering.warnings.map((warning) => <Badge key={warning} className="bg-amber-50 text-amber-950"><AlertTriangle size={14} className="mr-1" aria-hidden="true" />{warning}</Badge>)}</div> : null}</Card>)}
        {!offerings.length ? <Card className="grid place-items-center gap-3 p-10 text-center"><Bike size={34} className="text-copper" aria-hidden="true" /><h2 className="text-xl font-bold text-pine">Chưa có lựa chọn xe máy</h2><p className="max-w-xl text-sm leading-6 text-muted">Migration không tạo Supplier, mapping, xe, giá hoặc trạng thái mẫu.</p></Card> : null}
      </div>
    </main>
  );
}
