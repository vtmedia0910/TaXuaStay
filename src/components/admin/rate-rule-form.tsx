import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveRoomRateRuleAction } from "@/features/pricing/actions";
import { PRICE_SOURCE_LABELS, RATE_TYPE_LABELS } from "@/features/pricing/policy";
import { PRICE_SOURCES, RATE_TYPES, type AdminRatePlanOption, type RoomRateRuleDto } from "@/features/pricing/types";
import type { PropertyOption } from "@/features/properties/types";

const DAY_LABELS = [[1, "Thứ Hai"], [2, "Thứ Ba"], [3, "Thứ Tư"], [4, "Thứ Năm"], [5, "Thứ Sáu"], [6, "Thứ Bảy"], [7, "Chủ Nhật"]] as const;

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export function RateRuleForm({ rule, plans, rooms, properties }: {
  rule?: RoomRateRuleDto | null;
  plans: AdminRatePlanOption[];
  rooms: Array<{ id: string; property_id: string; name: string }>;
  properties: PropertyOption[];
}) {
  const propertyNames = new Map(properties.map((property) => [property.id, property.name]));
  return (
    <form action={saveRoomRateRuleAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={rule?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div><h2 className="font-display text-xl font-bold text-pine">Quy tắc giá phòng</h2><p className="mt-1 text-sm text-muted">Phòng và bảng giá phải thuộc cùng nơi lưu trú. Mọi số tiền là VND nguyên.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Bảng giá" htmlFor="rate_plan_id"><Select id="rate_plan_id" name="rate_plan_id" defaultValue={rule?.rate_plan_id ?? ""} required><option value="" disabled>Chọn bảng giá</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {propertyNames.get(plan.property_id) ?? "Không xác định"} · {plan.publish_status}</option>)}</Select></Field>
          <Field label="Loại phòng" htmlFor="room_type_id"><Select id="room_type_id" name="room_type_id" defaultValue={rule?.room_type_id ?? ""} required><option value="" disabled>Chọn phòng</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {propertyNames.get(room.property_id) ?? "Không xác định"}</option>)}</Select></Field>
          <Field label="Loại giá" htmlFor="rate_type"><Select id="rate_type" name="rate_type" defaultValue={rule?.rate_type ?? "weekday"}>{RATE_TYPES.map((value) => <option key={value} value={value}>{RATE_TYPE_LABELS[value]}</option>)}</Select></Field>
          <Field label="Giá cơ bản / đêm (VND)" htmlFor="price_vnd"><Input id="price_vnd" name="price_vnd" type="number" min={0} step={1} defaultValue={rule?.price_vnd ?? ""} required /></Field>
          <Field label="Phụ thu người lớn (chưa tự cộng)" htmlFor="extra_adult_vnd"><Input id="extra_adult_vnd" name="extra_adult_vnd" type="number" min={0} step={1} defaultValue={rule?.extra_adult_vnd ?? ""} /></Field>
          <Field label="Phụ thu trẻ em (chưa tự cộng)" htmlFor="extra_child_vnd"><Input id="extra_child_vnd" name="extra_child_vnd" type="number" min={0} step={1} defaultValue={rule?.extra_child_vnd ?? ""} /></Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Áp dụng từ" htmlFor="valid_from"><Input id="valid_from" name="valid_from" type="date" defaultValue={rule?.valid_from ?? ""} /></Field>
          <Field label="Áp dụng đến" htmlFor="valid_until"><Input id="valid_until" name="valid_until" type="date" defaultValue={rule?.valid_until ?? ""} /></Field>
          <Field label="Ưu tiên quy tắc" htmlFor="priority" hint="Số cao hơn thắng trong cùng loại giá."><Input id="priority" name="priority" type="number" min={-10000} max={10000} defaultValue={rule?.priority ?? 0} required /></Field>
        </div>
        <fieldset><legend className="text-sm font-bold">Ngày trong tuần (để trống dùng mặc định theo loại giá)</legend><div className="mt-3 flex flex-wrap gap-3">{DAY_LABELS.map(([day, label]) => <label key={day} className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm"><input type="checkbox" name="days_of_week" value={day} defaultChecked={rule?.days_of_week?.includes(day)} />{label}</label>)}</div></fieldset>
      </Card>
      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Nguồn và độ tin cậy</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Nguồn giá" htmlFor="source"><Select id="source" name="source" defaultValue={rule?.source ?? "admin"}>{PRICE_SOURCES.map((value) => <option key={value} value={value}>{PRICE_SOURCE_LABELS[value]}</option>)}</Select></Field>
          <Field label="Xác minh lúc" htmlFor="price_verified_at" hint="Giờ Việt Nam; không được ở tương lai."><Input id="price_verified_at" name="price_verified_at" type="datetime-local" defaultValue={localDateTime(rule?.price_verified_at)} /></Field>
          <Field label="Giá còn xác minh đến" htmlFor="price_valid_until" hint="Bao gồm ngày này."><Input id="price_valid_until" name="price_valid_until" type="date" defaultValue={rule?.price_valid_until ?? ""} /></Field>
        </div>
        <Field label="Ghi chú nội bộ" htmlFor="internal_notes"><Textarea id="internal_notes" name="internal_notes" defaultValue={rule?.internal_notes ?? ""} className="min-h-28" /></Field>
        <CheckboxField name="is_active" label="Quy tắc đang hoạt động" defaultChecked={rule?.is_active ?? true} />
      </Card>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu quy tắc giá" /></div></div>
    </form>
  );
}
