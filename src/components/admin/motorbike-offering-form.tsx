import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CmsMediaAsset } from "@/features/cms/types";
import { saveMotorbikeOfferingAction } from "@/features/motorbike/actions";
import {
  MOTORBIKE_AVAILABILITY_LABELS,
  MOTORBIKE_CATEGORY_LABELS,
  MOTORBIKE_HELMET_LABELS,
  MOTORBIKE_PRICE_SOURCE_LABELS,
  MOTORBIKE_PUBLICATION_LABELS,
  MOTORBIKE_TRANSMISSION_LABELS,
} from "@/features/motorbike/policy";
import {
  MOTORBIKE_AVAILABILITY_STATES,
  MOTORBIKE_HELMET_STATUSES,
  MOTORBIKE_PRICE_SOURCES,
  MOTORBIKE_PUBLICATION_STATUSES,
  MOTORBIKE_TRANSMISSION_TYPES,
  MOTORBIKE_VEHICLE_CATEGORIES,
  type AdminMotorbikeOffering,
  type MotorbikeSourceOption,
} from "@/features/motorbike/types";

function vietnamLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(value));
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

export function MotorbikeOfferingForm({
  offering,
  sources,
  media,
}: {
  offering?: AdminMotorbikeOffering | null;
  sources: MotorbikeSourceOption[];
  media: CmsMediaAsset[];
}) {
  const immutable = offering?.publication_status === "archived";
  const source = offering ? sources.find((item) => item.external_ref_id === offering.source_external_ref_id) : null;
  return (
    <form action={saveMotorbikeOfferingAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={offering?.id ?? ""} />
      {offering ? <><input type="hidden" name="supplier_id" value={offering.supplier_id} /><input type="hidden" name="source_external_ref_id" value={offering.source_external_ref_id} /></> : null}

      {immutable ? <p className="rounded-2xl border border-line bg-mist p-4 text-sm font-bold text-muted">Bản ghi đã lưu trữ là lịch sử bất biến và không thể sửa hoặc mở lại.</p> : null}

      <Card className="grid gap-5 p-5 sm:p-6">
        <div><h2 className="text-xl font-bold text-pine">Nguồn & nhận diện</h2><p className="mt-1 text-sm leading-6 text-muted">Chỉ dùng Supplier loại Xe máy có external reference thật với system key <code>taxua_biker</code>.</p></div>
        {offering ? <div className="rounded-2xl bg-mist p-4 text-sm"><p className="font-bold text-pine">{source?.supplier_name ?? "Nguồn lịch sử"}</p><p className="mt-1 break-all text-muted">taxua_biker · {source?.external_reference ?? offering.source_external_ref_id}</p></div> : <Field label="Nguồn Biker" htmlFor="source_key" hint="Tạo Supplier và external reference thật trước; hệ thống không tạo mapping mẫu."><Select id="source_key" name="source_key" required defaultValue=""><option value="" disabled>Chọn nguồn đã liên kết</option>{sources.map((item) => <option key={item.external_ref_id} value={`${item.supplier_id}:${item.external_ref_id}`} disabled={item.supplier_status !== "active" || !item.external_ref_active}>{item.supplier_name} · {item.external_reference}{item.supplier_status !== "active" || !item.external_ref_active ? " · không hoạt động" : ""}</option>)}</Select></Field>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tên hiển thị" htmlFor="display_name"><Input id="display_name" name="display_name" defaultValue={offering?.display_name ?? ""} minLength={2} maxLength={160} required disabled={immutable} /></Field>
          <Field label="Slug" htmlFor="slug" hint={offering ? "Slug là bất biến." : "Chữ thường, số và gạch ngang."}><Input id="slug" name="slug" defaultValue={offering?.slug ?? ""} minLength={2} maxLength={120} required readOnly={Boolean(offering)} disabled={immutable} /></Field>
          <Field label="Nhóm dịch vụ" htmlFor="vehicle_category"><Select id="vehicle_category" name="vehicle_category" defaultValue={offering?.vehicle_category ?? "motorbike"} disabled={immutable}>{MOTORBIKE_VEHICLE_CATEGORIES.map((value) => <option key={value} value={value}>{MOTORBIKE_CATEGORY_LABELS[value]}</option>)}</Select></Field>
          <Field label="Loại truyền động" htmlFor="transmission_type"><Select id="transmission_type" name="transmission_type" defaultValue={offering?.transmission_type ?? "semi_automatic"} disabled={immutable}>{MOTORBIKE_TRANSMISSION_TYPES.map((value) => <option key={value} value={value}>{MOTORBIKE_TRANSMISSION_LABELS[value]}</option>)}</Select></Field>
          <Field label="Dung tích tham chiếu (cc)" htmlFor="engine_class_cc"><Input id="engine_class_cc" name="engine_class_cc" type="number" min={40} max={1000} defaultValue={offering?.engine_class_cc ?? ""} disabled={immutable} /></Field>
          <Field label="Mũ bảo hiểm" htmlFor="helmet_status"><Select id="helmet_status" name="helmet_status" defaultValue={offering?.helmet_status ?? "unknown"} disabled={immutable}>{MOTORBIKE_HELMET_STATUSES.map((value) => <option key={value} value={value}>{MOTORBIKE_HELMET_LABELS[value]}</option>)}</Select></Field>
        </div>
        <Field label="Phù hợp với" htmlFor="suitable_for"><Input id="suitable_for" name="suitable_for" defaultValue={offering?.suitable_for ?? ""} maxLength={240} placeholder="Chỉ nhập điều đã xác nhận" disabled={immutable} /></Field>
        <Field label="Mô tả công khai" htmlFor="public_description"><Textarea id="public_description" name="public_description" defaultValue={offering?.public_description ?? ""} maxLength={3000} className="min-h-32" disabled={immutable} /></Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div><h2 className="text-xl font-bold text-pine">Hình ảnh & nhận/trả xe</h2><p className="mt-1 text-sm leading-6 text-muted">Ảnh chọn từ CMS của Trip; không hotlink Storage riêng tư của Biker.</p></div>
        <Field label="Ảnh công khai" htmlFor="image_media_id"><Select id="image_media_id" name="image_media_id" defaultValue={offering?.image_media_id ?? ""} disabled={immutable}><option value="">Chưa chọn ảnh</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</Select></Field>
        <Field label="Cách nhận xe" htmlFor="pickup_summary"><Input id="pickup_summary" name="pickup_summary" defaultValue={offering?.pickup_summary ?? ""} maxLength={300} disabled={immutable} /></Field>
        <Field label="Cách trả xe" htmlFor="return_summary"><Input id="return_summary" name="return_summary" defaultValue={offering?.return_summary ?? ""} maxLength={300} disabled={immutable} /></Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div><h2 className="text-xl font-bold text-pine">Giá, trạng thái & độ mới</h2><p className="mt-1 text-sm leading-6 text-muted">Có giá không đồng nghĩa còn xe. Phase 5 luôn xác nhận thủ công.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Giá bán công khai (VND)" htmlFor="public_price_vnd" hint="Để trống sẽ hiển thị “Cần xác nhận giá”."><Input id="public_price_vnd" name="public_price_vnd" type="number" min={1} max={100000000} step={1} defaultValue={offering?.public_price_vnd ?? ""} disabled={immutable} /></Field>
          <Field label="Nguồn giá" htmlFor="price_source"><Select id="price_source" name="price_source" defaultValue={offering?.price_source ?? ""} disabled={immutable}><option value="">Chưa có nguồn giá</option>{MOTORBIKE_PRICE_SOURCES.map((value) => <option key={value} value={value}>{MOTORBIKE_PRICE_SOURCE_LABELS[value]}</option>)}</Select></Field>
          <Field label="Kiểm tra giá lúc" htmlFor="price_checked_at" hint="Giờ Việt Nam; không được ở tương lai."><Input id="price_checked_at" name="price_checked_at" type="datetime-local" defaultValue={vietnamLocalInput(offering?.price_checked_at)} disabled={immutable} /></Field>
          <Field label="Giá có hiệu lực đến" htmlFor="price_valid_until"><Input id="price_valid_until" name="price_valid_until" type="date" defaultValue={offering?.price_valid_until ?? ""} disabled={immutable} /></Field>
          <Field label="Trạng thái biết được" htmlFor="availability_state"><Select id="availability_state" name="availability_state" defaultValue={offering?.availability_state ?? "needs_confirmation"} disabled={immutable}>{MOTORBIKE_AVAILABILITY_STATES.map((value) => <option key={value} value={value}>{MOTORBIKE_AVAILABILITY_LABELS[value]}</option>)}</Select></Field>
          <Field label="Cách xác nhận" htmlFor="confirmation_mode"><Input id="confirmation_mode" value="Thủ công — không phải tồn xe trực tiếp" readOnly disabled /></Field>
          <Field label="Kiểm tra nguồn lúc" htmlFor="source_checked_at" hint="Bắt buộc trước khi công khai."><Input id="source_checked_at" name="source_checked_at" type="datetime-local" defaultValue={vietnamLocalInput(offering?.source_checked_at)} disabled={immutable} /></Field>
          <Field label="URL yêu cầu xác nhận" htmlFor="public_request_url" hint="Kênh HTTPS công khai đã được chủ sở hữu phê duyệt; không phải URL Admin."><Input id="public_request_url" name="public_request_url" type="url" defaultValue={offering?.public_request_url ?? ""} maxLength={2048} placeholder="https://..." disabled={immutable} /></Field>
        </div>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Trạng thái công khai" htmlFor="publication_status"><Select id="publication_status" name="publication_status" defaultValue={offering?.publication_status ?? "draft"} disabled={immutable}>{MOTORBIKE_PUBLICATION_STATUSES.map((value) => <option key={value} value={value}>{MOTORBIKE_PUBLICATION_LABELS[value]}</option>)}</Select></Field>
          <Field label="Thứ tự" htmlFor="sort_order"><Input id="sort_order" name="sort_order" type="number" min={0} max={10000} defaultValue={offering?.sort_order ?? 0} disabled={immutable} /></Field>
        </div>
        <Field label="Ghi chú nội bộ" htmlFor="internal_notes" hint="Không lưu token, mật khẩu, dữ liệu khách hay vận hành fleet."><Textarea id="internal_notes" name="internal_notes" defaultValue={offering?.internal_notes ?? ""} maxLength={10000} className="min-h-28" disabled={immutable} /></Field>
      </Card>

      {!immutable ? <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu lựa chọn xe máy" /></div></div> : null}
    </form>
  );
}
