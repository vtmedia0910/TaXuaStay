"use client";

import Link from "next/link";
import { useState } from "react";
import { Archive, Search, X } from "lucide-react";
import { FocalPointPicker } from "@/components/admin/focal-point-picker";
import { SubmitButton } from "@/components/admin/submit-button";
import { CmsImage } from "@/components/cms/cms-image";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { archiveCmsMediaAction, updateCmsMediaAction } from "@/features/cms/actions";
import { resolveCmsMediaUrl } from "@/features/cms/media-url";
import type { CmsMediaAsset, CmsMediaPage } from "@/features/cms/types";
import { CMS_MEDIA_ROLE_LABELS, formatCmsDate } from "@/features/cms/ui";

function pageHref(page: CmsMediaPage, nextPage: number) {
  const params = new URLSearchParams();
  if (page.query) params.set("search", page.query);
  if (page.role !== "all") params.set("role", page.role);
  params.set("page", String(nextPage));
  return `/admin/site-media?${params}`;
}

function MediaDetail({ asset, isAdmin, onClose }: { asset: CmsMediaAsset; isAdmin: boolean; onClose: () => void }) {
  const src = resolveCmsMediaUrl(asset);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-pine/55 p-3" role="dialog" aria-modal="true" aria-label={`Chi tiết ${asset.title}`}>
      <div className="max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-surface shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 p-4 backdrop-blur sm:p-5"><div><h2 className="text-xl font-bold text-pine">Chi tiết media</h2><p className="text-sm text-muted">Metadata và điểm lấy nét dùng trên website.</p></div><Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Đóng"><X /></Button></div>
        <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid content-start gap-4">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-mist"><CmsImage media={asset} sizes="(min-width: 1024px) 500px, 100vw" /></div>
            <div className="rounded-2xl bg-mist/70 p-4 text-sm leading-6 text-muted">
              <p><strong className="text-pine">Kích thước:</strong> {asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "Chưa xác định"}</p>
              <p><strong className="text-pine">Nguồn:</strong> {asset.storage_path ? `Storage / ${asset.storage_path}` : "HTTPS bên ngoài"}</p>
              <p><strong className="text-pine">Tạo lúc:</strong> {formatCmsDate(asset.created_at)}</p>
              <p><strong className="text-pine">Cập nhật:</strong> {formatCmsDate(asset.updated_at)}</p>
            </div>
            <div className="rounded-2xl border border-line p-4"><h3 className="font-bold text-pine">Đang dùng tại</h3>{asset.usages?.length ? <ul className="mt-3 grid gap-2 text-sm text-muted">{asset.usages.map((usage) => <li key={usage.key}>• {usage.label}</li>)}</ul> : <p className="mt-2 text-sm text-muted">Chưa được sử dụng.</p>}</div>
          </div>
          <form action={updateCmsMediaAction} className="grid content-start gap-4">
            <input type="hidden" name="id" value={asset.id} />
            <Field label="Tên nội bộ" htmlFor={`title-${asset.id}`}><Input id={`title-${asset.id}`} name="title" defaultValue={asset.title} minLength={2} maxLength={160} required /></Field>
            <Field label="Alt text" htmlFor={`alt-${asset.id}`}><Input id={`alt-${asset.id}`} name="alt_text" defaultValue={asset.alt_text} minLength={2} maxLength={300} required /></Field>
            <Field label="Chú thích" htmlFor={`caption-${asset.id}`}><Textarea id={`caption-${asset.id}`} name="caption" defaultValue={asset.caption ?? ""} maxLength={500} /></Field>
            <Field label="Vai trò" htmlFor={`role-${asset.id}`}><Select id={`role-${asset.id}`} name="role" defaultValue={asset.role}>{Object.entries(CMS_MEDIA_ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select></Field>
            {src ? <Field label="Điểm lấy nét" htmlFor={`focal-${asset.id}`}><FocalPointPicker id={`focal-${asset.id}`} src={src} alt={asset.alt_text} defaultX={asset.focal_x} defaultY={asset.focal_y} /></Field> : <><input type="hidden" name="focal_x" value={asset.focal_x} /><input type="hidden" name="focal_y" value={asset.focal_y} /></>}
            <SubmitButton label="Lưu thay đổi media" />
          </form>
        </div>
        {isAdmin ? <div className="border-t border-line bg-red-50/50 p-4 sm:p-6"><details><summary className="cursor-pointer font-bold text-danger">Nâng cao / Vùng nguy hiểm</summary><p className="mt-3 text-sm leading-6 text-muted">Lưu trữ chỉ khả dụng khi ảnh không còn được tham chiếu trong bản nháp hoặc bản công khai.</p><form action={archiveCmsMediaAction} className="mt-4"><input type="hidden" name="id" value={asset.id} /><SubmitButton label="Lưu trữ ảnh" icon={<Archive size={17} />} variant="danger" confirmation={`LƯU TRỮ ẢNH?\n\n${asset.title} sẽ không còn được chọn cho nội dung mới.`} /></form></details></div> : null}
      </div>
    </div>
  );
}

export function CmsMediaLibrary({ result, isAdmin }: { result: CmsMediaPage; isAdmin: boolean }) {
  const [selected, setSelected] = useState<CmsMediaAsset | null>(null);
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-bold text-pine">Thư viện media</h2><p className="mt-1 text-sm text-muted">{result.total} ảnh đang hoạt động · hiển thị tối đa {result.pageSize} ảnh mỗi trang</p></div></div>
      <form method="get" className="mt-5 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[1fr_15rem_auto]">
        <Input name="search" defaultValue={result.query} placeholder="Tìm theo tên ảnh…" aria-label="Tìm media" />
        <Select name="role" defaultValue={result.role} aria-label="Lọc theo vai trò"><option value="all">Tất cả vai trò</option>{Object.entries(CMS_MEDIA_ROLE_LABELS).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</Select>
        <Button type="submit"><Search size={18} /> Lọc</Button>
      </form>
      {result.items.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{result.items.map((asset) => <Card id={`media-${asset.id}`} key={asset.id} className="overflow-hidden"><button type="button" onClick={() => setSelected(asset)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-trip-sunrise/50"><div className="relative aspect-[4/3] bg-mist"><CmsImage media={asset} sizes="(min-width: 1024px) 240px, 45vw" /></div><div className="p-3 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="line-clamp-2 font-bold text-pine">{asset.title}</h3><Badge>{CMS_MEDIA_ROLE_LABELS[asset.role]}</Badge></div><p className="mt-2 text-xs text-muted">{asset.width && asset.height ? `${asset.width} × ${asset.height}px` : "Chưa xác định kích thước"}</p><p className="mt-2 line-clamp-2 text-xs font-semibold text-pine">{asset.usages?.length ? `Đang dùng: ${asset.usages[0].label}` : "Chưa được sử dụng"}</p></div></button></Card>)}</div> : <div className="mt-5 rounded-3xl border border-dashed border-line bg-surface p-8 text-center"><p className="font-bold text-pine">Chưa có ảnh website phù hợp.</p><p className="mt-2 text-sm text-muted">Hãy đổi bộ lọc hoặc tải ảnh đầu tiên ở phần trên.</p></div>}
      <div className="mt-6 flex items-center justify-between gap-3"><Link href={pageHref(result, Math.max(1, result.page - 1))} aria-disabled={result.page <= 1} className={buttonVariants({ variant: "secondary", className: result.page <= 1 ? "pointer-events-none opacity-50" : "" })}>Trang trước</Link><span className="text-sm font-bold text-muted">Trang {result.page}/{result.totalPages}</span><Link href={pageHref(result, Math.min(result.totalPages, result.page + 1))} aria-disabled={result.page >= result.totalPages} className={buttonVariants({ variant: "secondary", className: result.page >= result.totalPages ? "pointer-events-none opacity-50" : "" })}>Trang sau</Link></div>
      {selected ? <MediaDetail asset={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}
