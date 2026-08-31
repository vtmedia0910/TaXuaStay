import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRole } from "@/features/admin/authz";
import { saveRoomCommercialRuleAction } from "@/features/economics/actions";
import { COMMERCIAL_SOURCE_LABELS, COMMERCIAL_STATUS_LABELS } from "@/features/economics/policy";
import {
  COMMERCIAL_SOURCES,
  type AdminCommercialPlanOption,
  type AdminSupplierOption,
  type RoomCommercialRuleDto,
} from "@/features/economics/types";
import { RATE_TYPE_LABELS } from "@/features/pricing/policy";
import { RATE_TYPES } from "@/features/pricing/types";
import type { PropertyOption } from "@/features/properties/types";

const DAY_LABELS = [[1, "Thứ Hai"], [2, "Thứ Ba"], [3, "Thứ Tư"], [4, "Thứ Năm"], [5, "Thứ Sáu"], [6, "Thứ Bảy"], [7, "Chủ Nhật"]] as const;

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  return new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function CommercialRuleForm({ rule, plans, suppliers, properties, rooms, role }: {
  rule?: RoomCommercialRuleDto | null;
  plans: AdminCommercialPlanOption[];
  suppliers: AdminSupplierOption[];
  properties: PropertyOption[];
  rooms: Array<{ id: string; property_id: string; name: string }>;
  role: AdminRole;
}) {
  const plan = rule ? plans.find((candidate) => candidate.id === rule.commercial_rate_plan_id) : null;
  const canEdit = role === "admin" || !rule || plan?.status === "draft";
  const visiblePlans = role === "admin" ? plans : plans.filter((candidate) => candidate.status === "draft");
  const propertyNames = new Map(properties.map((property) => [property.id, property.name]));
  return (
    <form action={saveRoomCommercialRuleAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={rule?.id ?? ""} />
      {rule ? <><input type="hidden" name="commercial_rate_plan_id" value={rule.commercial_rate_plan_id} /><input type="hidden" name="supplier_id" value={rule.supplier_id} /><input type="hidden" name="property_id" value={rule.property_id} /><input type="hidden" name="room_type_id" value={rule.room_type_id} /></> : null}
      {!canEdit ? <p className="rounded-2xl bg-copper/10 p-4 text-sm font-bold text-copper-strong">Staff chỉ được sửa quy tắc thuộc bảng thương mại bản nháp.</p> : null}
      <fieldset disabled={!canEdit} className="grid gap-5 disabled:opacity-70">
        <Card className="grid gap-5 p-5 sm:p-6">
          <div><h2 className="font-display text-xl font-bold text-pine">Quy tắc giá vốn theo đêm</h2><p className="mt-1 text-sm text-muted">Giá vốn và tham chiếu thị trường là dữ liệu riêng tư; ít nhất một giá trị phải có.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bảng chi phí" htmlFor="commercial_rate_plan_id"><Select id="commercial_rate_plan_id" name={rule ? undefined : "commercial_rate_plan_id"} defaultValue={rule?.commercial_rate_plan_id ?? ""} disabled={Boolean(rule)} required><option value="" disabled>Chọn bảng chi phí</option>{visiblePlans.map((item) => <option key={item.id} value={item.id}>{item.name} · {COMMERCIAL_STATUS_LABELS[item.status]}</option>)}</Select></Field>
            <Field label="Nhà cung cấp" htmlFor="supplier_id" hint="Phải trùng với bảng chi phí."><Select id="supplier_id" name={rule ? undefined : "supplier_id"} defaultValue={rule?.supplier_id ?? ""} disabled={Boolean(rule)} required><option value="" disabled>Chọn nhà cung cấp</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.display_name} · {supplier.supplier_code}</option>)}</Select></Field>
            <Field label="Nơi lưu trú" htmlFor="property_id" hint="Phải trùng với bảng chi phí."><Select id="property_id" name={rule ? undefined : "property_id"} defaultValue={rule?.property_id ?? ""} disabled={Boolean(rule)} required><option value="" disabled>Chọn cơ sở</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select></Field>
            <Field label="Loại phòng" htmlFor="room_type_id"><Select id="room_type_id" name={rule ? undefined : "room_type_id"} defaultValue={rule?.room_type_id ?? ""} disabled={Boolean(rule)} required><option value="" disabled>Chọn phòng</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {propertyNames.get(room.property_id) ?? "Không xác định"}</option>)}</Select></Field>
            <Field label="Loại quy tắc" htmlFor="rate_type"><Select id="rate_type" name="rate_type" defaultValue={rule?.rate_type ?? "weekday"}>{RATE_TYPES.map((type) => <option key={type} value={type}>{RATE_TYPE_LABELS[type]}</option>)}</Select></Field>
            <Field label="Nguồn thương mại" htmlFor="source"><Select id="source" name="source" defaultValue={rule?.source ?? "admin"}>{COMMERCIAL_SOURCES.map((source) => <option key={source} value={source}>{COMMERCIAL_SOURCE_LABELS[source]}</option>)}</Select></Field>
            <Field label="Giá vốn / đêm (VND)" htmlFor="net_cost_vnd" hint="Số nguyên; để trống nghĩa là chưa có dữ liệu."><Input id="net_cost_vnd" name="net_cost_vnd" type="number" min={0} step={1} defaultValue={rule?.net_cost_vnd ?? ""} /></Field>
            <Field label="Tham chiếu thị trường / đêm (VND)" htmlFor="market_reference_vnd" hint="Không phải giá bán công khai."><Input id="market_reference_vnd" name="market_reference_vnd" type="number" min={0} step={1} defaultValue={rule?.market_reference_vnd ?? ""} /></Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Áp dụng từ" htmlFor="effective_from"><Input id="effective_from" name="effective_from" type="date" defaultValue={rule?.effective_from ?? ""} /></Field>
            <Field label="Áp dụng đến" htmlFor="effective_until"><Input id="effective_until" name="effective_until" type="date" defaultValue={rule?.effective_until ?? ""} /></Field>
            <Field label="Ưu tiên quy tắc" htmlFor="priority"><Input id="priority" name="priority" type="number" min={-10000} max={10000} defaultValue={rule?.priority ?? 0} required /></Field>
          </div>
          <fieldset><legend className="text-sm font-bold">Ngày trong tuần (để trống dùng mặc định)</legend><div className="mt-3 flex flex-wrap gap-3">{DAY_LABELS.map(([day, label]) => <label key={day} className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm"><input type="checkbox" name="iso_weekdays" value={day} defaultChecked={rule?.iso_weekdays?.includes(day)} />{label}</label>)}</div></fieldset>
        </Card>
        <Card className="grid gap-5 p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-pine">Độ mới và ghi chú</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Xác minh lúc" htmlFor="verified_at" hint="Giờ Việt Nam; không được ở tương lai."><Input id="verified_at" name="verified_at" type="datetime-local" defaultValue={localDateTime(rule?.verified_at)} /></Field>
            <Field label="Còn xác minh đến" htmlFor="valid_until" hint="Bao gồm ngày này; không được trước ngày xác minh."><Input id="valid_until" name="valid_until" type="date" defaultValue={rule?.valid_until ?? ""} /></Field>
          </div>
          <Field label="Ghi chú nội bộ" htmlFor="notes_internal"><Textarea id="notes_internal" name="notes_internal" defaultValue={rule?.notes_internal ?? ""} className="min-h-28" /></Field>
          <CheckboxField name="is_active" label="Quy tắc đang hoạt động trong bảng" defaultChecked={rule?.is_active ?? true} hint="Bảng nháp vẫn có thể preview; chỉ bảng active mới là economics hiện hành." />
        </Card>
      </fieldset>
      {canEdit ? <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu quy tắc chi phí" /></div></div> : null}
    </form>
  );
}
