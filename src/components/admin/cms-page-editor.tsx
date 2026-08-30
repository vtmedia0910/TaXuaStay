import Link from "next/link";
import { Archive, Eye, ImageIcon, Send, Settings2 } from "lucide-react";
import { CmsImage } from "@/components/cms/cms-image";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { archiveCmsPageAction, publishCmsPageAction, saveCmsItemAction, saveCmsPageAction, saveCmsSectionAction } from "@/features/cms/actions";
import type { CmsMediaAsset, CmsPage, CmsRoomOption, CmsSection } from "@/features/cms/types";

function MediaSelect({ id, name, value, media }: { id: string; name: string; value: string | null; media: CmsMediaAsset[] }) {
  return <Select id={id} name={name} defaultValue={value ?? ""}><option value="">Không chọn</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.role} · {asset.title}</option>)}</Select>;
}

function EntitySelect({ id, name, value, options, label }: { id: string; name: string; value: string | null; options: CmsRoomOption[]; label: string }) {
  return <Select id={id} name={name} defaultValue={value ?? ""}><option value="">Không chọn {label}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select>;
}

function CmsItemForm({ page, section, item, media, roomTypes, physicalRooms }: {
  page: CmsPage; section: CmsSection; item?: CmsSection["items"][number]; media: CmsMediaAsset[];
  roomTypes: CmsRoomOption[]; physicalRooms: CmsRoomOption[];
}) {
  const prefix = item?.id ?? `new-${section.id}`;
  return (
    <form action={saveCmsItemAction} className="grid gap-4 rounded-2xl border border-line bg-cream p-4">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="section_id" value={section.id} />
      <input type="hidden" name="page_key" value={page.page_key} />
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-bold text-pine">{item ? item.title : "Thêm mục có cấu trúc"}</h4>
        {item ? <Badge>{item.is_enabled ? "Đang bật" : "Đang tắt"}</Badge> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã mục" htmlFor={`${prefix}-key`}><Input id={`${prefix}-key`} name="item_key" defaultValue={item?.item_key ?? ""} pattern="[a-z0-9][a-z0-9_-]{0,79}" required /></Field>
        <Field label="Loại mục" htmlFor={`${prefix}-type`}><Select id={`${prefix}-type`} name="item_type" defaultValue={item?.item_type ?? "content"}><option value="content">Nội dung</option><option value="link">Liên kết</option><option value="faq">Hỏi đáp</option><option value="room_reference">Phòng thật</option></Select></Field>
      </div>
      <Field label="Tiêu đề / câu hỏi" htmlFor={`${prefix}-title`}><Input id={`${prefix}-title`} name="title" defaultValue={item?.title ?? ""} maxLength={180} required /></Field>
      <Field label="Nội dung / câu trả lời" htmlFor={`${prefix}-body`}><Textarea id={`${prefix}-body`} name="body" defaultValue={item?.body ?? ""} maxLength={1000} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nhãn liên kết" htmlFor={`${prefix}-label`}><Input id={`${prefix}-label`} name="label" defaultValue={item?.label ?? ""} maxLength={80} /></Field>
        <Field label="Liên kết" htmlFor={`${prefix}-href`} hint="Chỉ /duong-dan-noi-bo hoặc HTTPS."><Input id={`${prefix}-href`} name="href" defaultValue={item?.href ?? ""} maxLength={2048} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Media" htmlFor={`${prefix}-media`}><MediaSelect id={`${prefix}-media`} name="media_id" value={item?.media_id ?? null} media={media} /></Field>
        <Field label="Loại phòng" htmlFor={`${prefix}-room-type`}><EntitySelect id={`${prefix}-room-type`} name="room_type_id" value={item?.room_type_id ?? null} options={roomTypes} label="loại phòng" /></Field>
        <Field label="Room ID" htmlFor={`${prefix}-physical`}><EntitySelect id={`${prefix}-physical`} name="physical_room_id" value={item?.physical_room_id ?? null} options={physicalRooms} label="Room ID" /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thứ tự" htmlFor={`${prefix}-order`}><Input id={`${prefix}-order`} name="sort_order" type="number" min={0} max={1000} defaultValue={item?.sort_order ?? section.items.length * 10 + 10} required /></Field>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-pine-soft px-4 text-sm font-bold text-pine"><input name="is_enabled" type="checkbox" defaultChecked={item?.is_enabled ?? true} className="size-5 accent-pine" /> Hiển thị khi xuất bản</label>
      </div>
      <div><SubmitButton label={item ? "Lưu mục" : "Thêm mục"} /></div>
    </form>
  );
}

export function CmsPageEditor({ page, media, roomTypes, physicalRooms }: {
  page: CmsPage; media: CmsMediaAsset[]; roomTypes: CmsRoomOption[]; physicalRooms: CmsRoomOption[];
}) {
  return (
    <div className="grid gap-6 pb-24">
      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-xl font-bold text-pine">Trang & SEO biên tập</h2><p className="mt-1 text-sm text-muted">Canonical, robots và schema vẫn do code kiểm soát.</p></div>
          <Badge className={page.status === "published" ? "text-success" : "bg-copper/10 text-copper-strong"}>{page.status === "published" ? "Đã xuất bản" : page.status === "archived" ? "Đã lưu trữ · public dùng fallback" : "Có bản nháp"}</Badge>
        </div>
        <form action={saveCmsPageAction} className="grid gap-4">
          <input type="hidden" name="page_key" value={page.page_key} />
          <Field label="Tên trang trong Admin" htmlFor="title"><Input id="title" name="title" defaultValue={page.title} maxLength={160} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title" htmlFor="seo_title"><Input id="seo_title" name="seo_title" defaultValue={page.seo_title ?? ""} maxLength={70} /></Field>
            <Field label="OG image" htmlFor="og_media_id"><MediaSelect id="og_media_id" name="og_media_id" value={page.og_media_id} media={media.filter((asset) => asset.role === "og" || asset.role === "hero")} /></Field>
          </div>
          <Field label="SEO description" htmlFor="seo_description"><Textarea id="seo_description" name="seo_description" defaultValue={page.seo_description ?? ""} minLength={10} maxLength={180} /></Field>
          <div><SubmitButton label="Lưu bản nháp trang" /></div>
        </form>
      </Card>

      {page.sections.map((section) => (
        <Card id={`section-${section.id}`} key={section.id} className="grid gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-copper-strong">{section.section_type}</p><h2 className="mt-1 font-display text-xl font-bold text-pine">{section.section_key}</h2></div>
            <Badge>{section.is_enabled ? "Bật" : "Tắt"} · #{section.sort_order}</Badge>
          </div>
          {section.desktop_media ? <div className="relative aspect-[16/5] overflow-hidden rounded-2xl bg-mist"><CmsImage media={section.desktop_media} sizes="(min-width: 1024px) 800px, 100vw" /></div> : null}
          <form action={saveCmsSectionAction} className="grid gap-4">
            <input type="hidden" name="id" value={section.id} /><input type="hidden" name="page_key" value={page.page_key} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Dòng dẫn" htmlFor={`${section.id}-eyebrow`}><Input id={`${section.id}-eyebrow`} name="eyebrow" defaultValue={section.eyebrow ?? ""} maxLength={100} /></Field><Field label="Tiêu đề" htmlFor={`${section.id}-heading`}><Input id={`${section.id}-heading`} name="heading" defaultValue={section.heading ?? ""} maxLength={180} /></Field></div>
            <Field label="Nội dung" htmlFor={`${section.id}-body`}><Textarea id={`${section.id}-body`} name="body" defaultValue={section.body ?? ""} maxLength={1200} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nhãn CTA" htmlFor={`${section.id}-cta-label`}><Input id={`${section.id}-cta-label`} name="cta_label" defaultValue={section.cta_label ?? ""} maxLength={80} /></Field><Field label="Liên kết CTA" htmlFor={`${section.id}-cta-href`} hint="Chỉ /duong-dan-noi-bo hoặc HTTPS."><Input id={`${section.id}-cta-href`} name="cta_href" defaultValue={section.cta_href ?? ""} maxLength={2048} /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Ảnh desktop" htmlFor={`${section.id}-desktop`}><MediaSelect id={`${section.id}-desktop`} name="desktop_media_id" value={section.desktop_media_id} media={media} /></Field><Field label="Ảnh mobile" htmlFor={`${section.id}-mobile`}><MediaSelect id={`${section.id}-mobile`} name="mobile_media_id" value={section.mobile_media_id} media={media} /></Field></div>
            <div className="grid gap-4 sm:grid-cols-3"><Field label="Thứ tự" htmlFor={`${section.id}-order`}><Input id={`${section.id}-order`} name="sort_order" type="number" min={0} max={1000} defaultValue={section.sort_order} required /></Field><Field label="Số mục tối đa" htmlFor={`${section.id}-max-items`}><Input id={`${section.id}-max-items`} name="max_items" type="number" min={1} max={24} defaultValue={section.max_items ?? ""} /></Field><label className="flex min-h-12 items-center gap-3 self-end rounded-2xl bg-pine-soft px-4 text-sm font-bold text-pine"><input name="is_enabled" type="checkbox" defaultChecked={section.is_enabled} className="size-5 accent-pine" /> Bật section</label></div>
            <div><SubmitButton label="Lưu section" /></div>
          </form>
          <details className="rounded-2xl border border-line p-4">
            <summary className="cursor-pointer font-bold text-pine">Mục con ({section.items.length})</summary>
            <div className="mt-4 grid gap-4">{section.items.map((item) => <CmsItemForm key={item.id} page={page} section={section} item={item} media={media} roomTypes={roomTypes} physicalRooms={physicalRooms} />)}<CmsItemForm page={page} section={section} media={media} roomTypes={roomTypes} physicalRooms={physicalRooms} /></div>
          </details>
        </Card>
      ))}

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-end gap-3">
          <Link href={`/admin/content/preview?page=${page.page_key}`} target="_blank" className={buttonVariants({ variant: "secondary" })}><Eye size={18} /> Xem trước bản nháp</Link>
          <Link href="/admin/site-media" className={buttonVariants({ variant: "secondary" })}><ImageIcon size={18} /> Thư viện media</Link>
          <form action={archiveCmsPageAction}><input type="hidden" name="page_key" value={page.page_key} /><SubmitButton label="Lưu trữ trang" icon={<Archive size={18} />} variant="secondary" /></form>
          <form action={publishCmsPageAction}><input type="hidden" name="page_key" value={page.page_key} /><SubmitButton label="Xuất bản toàn trang" icon={<Send size={18} />} /></form>
        </div>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted"><Settings2 size={16} /> Lưu form chỉ thay đổi bản nháp. Lưu trữ chuyển public về fallback an toàn; chỉ xuất bản mới đưa CMS trở lại.</p>
    </div>
  );
}
