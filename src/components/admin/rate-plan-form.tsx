import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveRatePlanAction } from "@/features/pricing/actions";
import type { RatePlanDto } from "@/features/pricing/types";
import type { PropertyOption } from "@/features/properties/types";

export function RatePlanForm({ plan, properties }: { plan?: RatePlanDto | null; properties: PropertyOption[] }) {
  return (
    <form action={saveRatePlanAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={plan?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div><h2 className="font-display text-xl font-bold text-pine">Bảng giá</h2><p className="mt-1 text-sm text-muted">Mỗi bảng giá thuộc đúng một nơi lưu trú và chỉ dùng tiền VND nguyên.</p></div>
        <Field label="Nơi lưu trú" htmlFor="property_id"><Select id="property_id" name="property_id" defaultValue={plan?.property_id ?? ""} required><option value="" disabled>Chọn nơi lưu trú</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Mã nội bộ" htmlFor="code" hint="Chữ thường, số và dấu gạch ngang."><Input id="code" name="code" defaultValue={plan?.code ?? ""} required /></Field>
          <Field label="Tên bảng giá" htmlFor="name"><Input id="name" name="name" defaultValue={plan?.name ?? ""} required /></Field>
        </div>
        <Field label="Ghi chú nội bộ" htmlFor="description"><Textarea id="description" name="description" defaultValue={plan?.description ?? ""} className="min-h-28" /></Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Hiệu lực từ" htmlFor="valid_from" hint="Khoảng mới phải còn giao với mọi quy tắc đang hoạt động."><Input id="valid_from" name="valid_from" type="date" defaultValue={plan?.valid_from ?? ""} /></Field>
          <Field label="Hiệu lực đến" htmlFor="valid_until" hint="Nếu cần chuẩn bị trước, hãy tắt quy tắc chưa cùng khoảng ngày."><Input id="valid_until" name="valid_until" type="date" defaultValue={plan?.valid_until ?? ""} /></Field>
          <Field label="Ưu tiên bảng giá" htmlFor="priority" hint="Số cao hơn thắng sau khi xét loại giá."><Input id="priority" name="priority" type="number" min={-10000} max={10000} defaultValue={plan?.priority ?? 0} required /></Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Trạng thái" htmlFor="publish_status"><Select id="publish_status" name="publish_status" defaultValue={plan?.publish_status ?? "draft"}><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></Select></Field>
          <CheckboxField name="is_active" label="Đang hoạt động" defaultChecked={plan?.is_active ?? true} hint="Published phải active; archived phải ngừng hoạt động." />
        </div>
      </Card>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu bảng giá" /></div></div>
    </form>
  );
}
