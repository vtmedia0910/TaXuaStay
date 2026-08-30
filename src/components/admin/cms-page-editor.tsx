"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Eye, ImageIcon, LockKeyhole, Send, Settings2 } from "lucide-react";
import { CmsMediaPicker } from "@/components/admin/cms-media-picker";
import { SubmitButton } from "@/components/admin/submit-button";
import { CmsImage } from "@/components/cms/cms-image";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRole } from "@/features/admin/authz";
import {
  archiveCmsPageAction, publishCmsPageAction, reorderCmsItemAction, reorderCmsSectionAction,
  saveCmsItemAction, saveCmsPageAction, saveCmsSectionAction,
} from "@/features/cms/actions";
import type { CmsMediaAsset, CmsPage, CmsRoomOption, CmsSection } from "@/features/cms/types";
import { CMS_PAGE_LABELS, formatCmsDate, getCmsSectionLabel, getCmsSectionTypeLabel } from "@/features/cms/ui";

function EntitySelect({ id, name, value, options, label }: { id: string; name: string; value: string | null; options: CmsRoomOption[]; label: string }) {
  return <Select id={id} name={name} defaultValue={value ?? ""}><option value="">Không chọn {label}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</Select>;
}

function ReorderControls({ pageKey, id, first, last, item = false }: { pageKey: string; id: string; first: boolean; last: boolean; item?: boolean }) {
  const action = item ? reorderCmsItemAction : reorderCmsSectionAction;
  return (
    <div className="flex gap-1" aria-label="Thay đổi vị trí">
      <form action={action}><input type="hidden" name="page_key" value={pageKey} /><input type="hidden" name="id" value={id} /><input type="hidden" name="direction" value="up" /><Button type="submit" size="icon" variant="ghost" disabled={first} aria-label="Di chuyển lên"><ArrowUp size={17} /></Button></form>
      <form action={action}><input type="hidden" name="page_key" value={pageKey} /><input type="hidden" name="id" value={id} /><input type="hidden" name="direction" value="down" /><Button type="submit" size="icon" variant="ghost" disabled={last} aria-label="Di chuyển xuống"><ArrowDown size={17} /></Button></form>
    </div>
  );
}

function CmsItemForm({ page, section, item, index, media, roomTypes, physicalRooms }: {
  page: CmsPage;
  section: CmsSection;
  item?: CmsSection["items"][number];
  index: number;
  media: CmsMediaAsset[];
  roomTypes: CmsRoomOption[];
  physicalRooms: CmsRoomOption[];
}) {
  const prefix = item?.id ?? `new-${section.id}`;
  const isRoomReference = section.section_key === "verified_rooms";
  const isSecondaryHeroAction = section.section_key === "hero";
  const itemType = isRoomReference ? "room_reference" : isSecondaryHeroAction ? "link" : "content";
  return (
    <div id={item ? `section-item-${item.id}` : undefined} className="rounded-2xl border border-line bg-cream p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-bold text-pine">{isSecondaryHeroAction ? "Nút phụ" : item ? item.title : isRoomReference ? "Thêm phòng thật" : "Thêm mục nội dung"}</h4>{item?.has_draft_changes ? <p className="mt-1 text-xs font-bold text-copper-strong">Có thay đổi trong bản nháp</p> : null}</div>
        {item ? <ReorderControls pageKey={page.page_key} id={item.id} first={index === 0} last={index === section.items.length - 1} item /> : null}
      </div>
      <form action={saveCmsItemAction} className="mt-4 grid gap-4">
        <input type="hidden" name="id" value={item?.id ?? ""} />
        <input type="hidden" name="section_id" value={section.id} />
        <input type="hidden" name="page_key" value={page.page_key} />
        <input type="hidden" name="item_key" value={item?.item_key ?? (isSecondaryHeroAction ? "secondary_cta" : "")} />
        <input type="hidden" name="item_type" value={itemType} />
        {isSecondaryHeroAction ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nút phụ" htmlFor={`${prefix}-title`}><Input id={`${prefix}-title`} name="title" defaultValue={item?.title ?? "Xem phòng đã thẩm định"} maxLength={180} required /></Field>
            <Field label="Link" htmlFor={`${prefix}-href`} hint="Đường dẫn nội bộ bắt đầu bằng / hoặc URL HTTPS."><Input id={`${prefix}-href`} name="href" defaultValue={item?.href ?? "/#verified-stays"} maxLength={2048} /></Field>
          </div>
        ) : isRoomReference ? (
          <>
            <input type="hidden" name="title" value={item?.title ?? "Phòng nổi bật"} />
            <input type="hidden" name="body" value={item?.body ?? ""} /><input type="hidden" name="label" value="" /><input type="hidden" name="href" value="" /><input type="hidden" name="media_id" value="" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Loại phòng" htmlFor={`${prefix}-room-type`}><EntitySelect id={`${prefix}-room-type`} name="room_type_id" value={item?.room_type_id ?? null} options={roomTypes} label="loại phòng" /></Field>
              <Field label="Phòng cụ thể / Room ID" htmlFor={`${prefix}-physical`}><EntitySelect id={`${prefix}-physical`} name="physical_room_id" value={item?.physical_room_id ?? null} options={physicalRooms} label="Room ID" /></Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Tiêu đề" htmlFor={`${prefix}-title`}><Input id={`${prefix}-title`} name="title" defaultValue={item?.title ?? ""} maxLength={180} required /></Field>
            <Field label="Nội dung" htmlFor={`${prefix}-body`}><Textarea id={`${prefix}-body`} name="body" defaultValue={item?.body ?? ""} maxLength={1000} /></Field>
            <input type="hidden" name="label" value={item?.label ?? ""} /><input type="hidden" name="href" value={item?.href ?? ""} />
            <CmsMediaPicker name="media_id" label="Ảnh thẻ (không bắt buộc)" value={item?.media_id ?? null} current={item?.media} initialMedia={media} />
            <input type="hidden" name="room_type_id" value="" /><input type="hidden" name="physical_room_id" value="" />
          </>
        )}
        {isSecondaryHeroAction ? <><input type="hidden" name="body" value="" /><input type="hidden" name="label" value="" /><input type="hidden" name="media_id" value="" /><input type="hidden" name="room_type_id" value="" /><input type="hidden" name="physical_room_id" value="" /></> : null}
        <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-pine-soft px-4 text-sm font-bold text-pine"><input name="is_enabled" type="checkbox" defaultChecked={item?.is_enabled ?? true} className="size-5 accent-pine" /> Hiển thị mục này khi xuất bản</label>
        <div><SubmitButton label={item ? "Lưu thay đổi vào bản nháp" : "Thêm vào bản nháp"} /></div>
      </form>
    </div>
  );
}

function SectionEditor({ page, section, index, media, roomTypes, physicalRooms }: {
  page: CmsPage;
  section: CmsSection;
  index: number;
  media: CmsMediaAsset[];
  roomTypes: CmsRoomOption[];
  physicalRooms: CmsRoomOption[];
}) {
  const label = getCmsSectionLabel(section.section_key);
  const isHero = section.section_type === "hero";
  const isDynamic = section.section_type === "dynamic_room_grid";
  const showCta = isHero || isDynamic || section.section_type === "cta";
  const showMedia = isHero || section.section_key === "why_choose_us" || section.section_key === "differentiators";
  const editableItems = section.section_key === "hero" ? [section.items.find((item) => item.item_key === "secondary_cta")].filter(Boolean) as CmsSection["items"]
    : section.section_key === "differentiators" || section.section_key === "verified_rooms" ? section.items : [];
  return (
    <Card id={`section-${section.id}`} className="overflow-hidden scroll-mt-6">
      <div className="grid gap-4 p-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:p-5">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-mist">{section.desktop_media ? <CmsImage media={section.desktop_media} sizes="112px" /> : <div className="grid size-full place-items-center text-xs font-bold text-muted">Chưa có ảnh</div>}</div>
        <div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-copper-strong">{String(index + 1).padStart(2, "0")}</span><Badge>{getCmsSectionTypeLabel(section.section_type)}</Badge>{section.has_draft_changes ? <Badge className="bg-copper/10 text-copper-strong">Đã sửa trong nháp</Badge> : null}</div><h2 className="mt-2 text-xl font-bold text-pine">{label}</h2><p className="mt-1 line-clamp-2 text-sm text-muted">{section.heading ?? section.body ?? "Chưa có nội dung"}</p></div>
        <div className="flex items-center justify-between gap-2 sm:justify-end"><Badge className={section.is_enabled ? "text-success" : "bg-mist text-muted"}>{section.is_enabled ? "Đang hiển thị" : "Đang ẩn"}</Badge><ReorderControls pageKey={page.page_key} id={section.id} first={index === 0} last={index === page.sections.length - 1} /></div>
      </div>
      <details className="border-t border-line">
        <summary className="cursor-pointer px-4 py-4 font-bold text-pine hover:bg-mist/50 sm:px-5">Chỉnh sửa mục này</summary>
        <div className="grid gap-5 border-t border-line bg-mist/25 p-4 sm:p-5">
          <form action={saveCmsSectionAction} className="grid gap-4">
            <input type="hidden" name="id" value={section.id} /><input type="hidden" name="page_key" value={page.page_key} />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Dòng dẫn" htmlFor={`${section.id}-eyebrow`}><Input id={`${section.id}-eyebrow`} name="eyebrow" defaultValue={section.eyebrow ?? ""} maxLength={100} /></Field><Field label={isHero ? "Tiêu đề chính" : "Tiêu đề"} htmlFor={`${section.id}-heading`}><Input id={`${section.id}-heading`} name="heading" defaultValue={section.heading ?? ""} maxLength={180} /></Field></div>
            <Field label={isHero ? "Mô tả" : "Nội dung"} htmlFor={`${section.id}-body`}><Textarea id={`${section.id}-body`} name="body" defaultValue={section.body ?? ""} maxLength={1200} /></Field>
            {showCta ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Nút chính" htmlFor={`${section.id}-cta-label`}><Input id={`${section.id}-cta-label`} name="cta_label" defaultValue={section.cta_label ?? ""} maxLength={80} /></Field><Field label="Link" htmlFor={`${section.id}-cta-href`} hint="Đường dẫn nội bộ bắt đầu bằng / hoặc URL HTTPS."><Input id={`${section.id}-cta-href`} name="cta_href" defaultValue={section.cta_href ?? ""} maxLength={2048} /></Field></div> : <><input type="hidden" name="cta_label" value={section.cta_label ?? ""} /><input type="hidden" name="cta_href" value={section.cta_href ?? ""} /></>}
            {showMedia ? <div className="grid gap-4 lg:grid-cols-2"><CmsMediaPicker name="desktop_media_id" label="Ảnh desktop" value={section.desktop_media_id} current={section.desktop_media} initialMedia={media} /><CmsMediaPicker name="mobile_media_id" label="Ảnh mobile" value={section.mobile_media_id} current={section.mobile_media} initialMedia={media} /></div> : <><input type="hidden" name="desktop_media_id" value={section.desktop_media_id ?? ""} /><input type="hidden" name="mobile_media_id" value={section.mobile_media_id ?? ""} /></>}
            {isDynamic ? <Field label="Số thẻ muốn hiển thị" htmlFor={`${section.id}-max-items`}><Input id={`${section.id}-max-items`} name="max_items" type="number" min={1} max={24} defaultValue={section.max_items ?? 3} /></Field> : <input type="hidden" name="max_items" value={section.max_items ?? ""} />}
            {isDynamic ? <div className="rounded-2xl border border-pine/15 bg-pine-soft p-4"><p className="flex items-center gap-2 font-bold text-pine"><LockKeyhole size={18} /> DỮ LIỆU HỆ THỐNG</p><p className="mt-2 text-sm leading-6 text-muted">Tên phòng, Room ID, Cloud View, xác minh, giá và tình trạng phòng được lấy tự động từ dữ liệu vận hành. Những giá trị này không thể sửa tại Nội dung website.</p></div> : null}
            <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-pine-soft px-4 text-sm font-bold text-pine"><input name="is_enabled" type="checkbox" defaultChecked={section.is_enabled} className="size-5 accent-pine" /> Hiển thị mục này</label>
            <div><SubmitButton label="Lưu thay đổi vào bản nháp" /></div>
          </form>
          {section.section_key === "hero" || section.section_key === "differentiators" || section.section_key === "verified_rooms" ? <details className="rounded-2xl border border-line bg-surface p-4"><summary className="cursor-pointer font-bold text-pine">{section.section_key === "hero" ? "Nút phụ" : section.section_key === "verified_rooms" ? `Phòng được ưu tiên (${section.items.length})` : `Mục nội dung (${section.items.length})`}</summary><div className="mt-4 grid gap-4">{editableItems.map((item, itemIndex) => <CmsItemForm key={item.id} page={page} section={section} item={item} index={itemIndex} media={media} roomTypes={roomTypes} physicalRooms={physicalRooms} />)}{(section.section_key === "hero" ? editableItems.length === 0 : true) ? <CmsItemForm page={page} section={section} index={section.items.length} media={media} roomTypes={roomTypes} physicalRooms={physicalRooms} /> : null}</div></details> : null}
        </div>
      </details>
    </Card>
  );
}

export function CmsPageEditor({ page, media, roomTypes, physicalRooms, role }: {
  page: CmsPage;
  media: CmsMediaAsset[];
  roomTypes: CmsRoomOption[];
  physicalRooms: CmsRoomOption[];
  role: AdminRole;
}) {
  const [dirty, setDirty] = useState(false);
  const pageLabel = CMS_PAGE_LABELS[page.page_key];
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const status = page.status === "archived"
    ? { label: "⚠ Trang đang được lưu trữ", className: "border-red-200 bg-red-50 text-danger" }
    : page.status === "draft" || page.has_draft_changes
      ? { label: "● Có thay đổi chưa xuất bản", className: "border-copper/30 bg-copper/10 text-copper-strong" }
      : { label: "✓ Bản công khai đã cập nhật", className: "border-pine/15 bg-pine-soft text-success" };

  return (
    <div className="grid gap-6 pb-36" onChangeCapture={() => setDirty(true)} onSubmitCapture={() => setDirty(false)}>
      <div className={`rounded-2xl border p-4 font-bold ${status.className}`} role="status"><p>{status.label}</p><p className="mt-1 text-xs font-medium opacity-80">Xuất bản gần nhất: {formatCmsDate(page.published_at)}</p>{dirty ? <p className="mt-2 text-sm">Bạn có thay đổi chưa lưu trên thiết bị.</p> : null}</div>
      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start"><Card className="p-4"><h2 className="text-sm font-bold uppercase tracking-[0.12em] text-pine">Cấu trúc {pageLabel}</h2><nav className="mt-3 grid gap-1" aria-label={`Cấu trúc ${pageLabel}`}>{page.sections.map((section, index) => <a key={section.id} href={`#section-${section.id}`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-sm text-pine hover:bg-mist"><span>{String(index + 1).padStart(2, "0")} {getCmsSectionLabel(section.section_key)}</span><span className={section.is_enabled ? "text-success" : "text-muted"} aria-label={section.is_enabled ? "Đang hiển thị" : "Đang ẩn"}>●</span></a>)}</nav></Card></aside>
        <div className="grid min-w-0 gap-5">
          <Card className="p-5 sm:p-6">
            <details>
              <summary className="cursor-pointer"><div className="inline-flex max-w-[calc(100%-1.5rem)] items-center justify-between gap-4 align-middle"><div><h2 className="text-xl font-bold text-pine">SEO & chia sẻ mạng xã hội</h2><p className="mt-1 truncate text-sm text-muted">{page.seo_title ?? "Chưa có SEO title"}</p></div><Badge>{page.og_media_id ? "Đã có ảnh OG" : "Chưa có ảnh OG"}</Badge></div></summary>
              <form action={saveCmsPageAction} className="mt-5 grid gap-4 border-t border-line pt-5">
                <input type="hidden" name="page_key" value={page.page_key} />
                <Field label="Tên trang trong Admin" htmlFor="title"><Input id="title" name="title" defaultValue={page.title} maxLength={160} required /></Field>
                <Field label="SEO title" htmlFor="seo-title"><Input id="seo-title" name="seo_title" defaultValue={page.seo_title ?? ""} maxLength={70} /></Field>
                <Field label="SEO description" htmlFor="seo-description"><Textarea id="seo-description" name="seo_description" defaultValue={page.seo_description ?? ""} minLength={10} maxLength={180} /></Field>
                <CmsMediaPicker name="og_media_id" label="Ảnh chia sẻ mạng xã hội" value={page.og_media_id} current={page.og_media} initialMedia={media} allowedRoles={["og", "hero"]} />
                <p className="text-sm text-muted">Canonical, robots và structured data vẫn do code kiểm soát.</p>
                <div><SubmitButton label="Lưu SEO vào bản nháp" /></div>
              </form>
            </details>
          </Card>
          {page.sections.map((section, index) => <SectionEditor key={section.id} page={page} section={section} index={index} media={media} roomTypes={roomTypes} physicalRooms={physicalRooms} />)}
          {role === "admin" ? <Card className="border-red-200 bg-red-50/40 p-5"><details><summary className="cursor-pointer font-bold text-danger">Nâng cao / Vùng nguy hiểm</summary><p className="mt-3 text-sm leading-6 text-muted">Lưu trữ làm website công khai quay về nội dung fallback an toàn. Đây không phải thao tác biên tập thường ngày.</p><form action={archiveCmsPageAction} className="mt-4"><input type="hidden" name="page_key" value={page.page_key} /><SubmitButton label="Lưu trữ trang" icon={<Archive size={18} />} variant="danger" confirmation={`LƯU TRỮ ${pageLabel.toUpperCase()}?\n\nWebsite công khai sẽ dùng nội dung fallback an toàn.`} /></form></details></Card> : null}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-3 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Link href={`/admin/content/preview?page=${page.page_key}`} target="_blank" className={buttonVariants({ variant: "secondary", size: "sm" })}><Eye size={17} /> Xem trước bản nháp</Link>
          <Link href="/admin/site-media" className={buttonVariants({ variant: "secondary", size: "sm" })}><ImageIcon size={17} /> Thư viện media</Link>
          {role === "admin" ? <form action={publishCmsPageAction}><input type="hidden" name="page_key" value={page.page_key} /><SubmitButton label="Xuất bản toàn trang" icon={<Send size={18} />} confirmation={`XUẤT BẢN ${pageLabel.toUpperCase()}?\n\nCác thay đổi trong bản nháp sẽ được hiển thị trên website công khai.`} /></form> : <p className="rounded-full bg-mist px-4 py-2 text-xs font-bold text-muted">Staff có thể lưu nháp và xem trước; chỉ Admin được xuất bản.</p>}
        </div>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted"><Settings2 size={16} /> Mọi nút “Lưu” chỉ cập nhật bản nháp. Website công khai chỉ thay đổi sau khi Admin xác nhận xuất bản.</p>
    </div>
  );
}
