import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRole } from "@/features/admin/authz";
import { saveCommercialRatePlanAction } from "@/features/economics/actions";
import { COMMERCIAL_SOURCE_LABELS, COMMERCIAL_STATUS_LABELS } from "@/features/economics/policy";
import {
  COMMERCIAL_PLAN_STATUSES,
  COMMERCIAL_SOURCES,
  type AdminSupplierOption,
  type CommercialRatePlanDto,
} from "@/features/economics/types";
import type { PropertyOption } from "@/features/properties/types";

export function CommercialPlanForm({
  plan,
  suppliers,
  properties,
  role,
}: {
  plan?: CommercialRatePlanDto | null;
  suppliers: AdminSupplierOption[];
  properties: PropertyOption[];
  role: AdminRole;
}) {
  const canEdit = role === "admin" || !plan || plan.status === "draft";
  const availableStatuses = role === "admin" ? COMMERCIAL_PLAN_STATUSES : (["draft"] as const);
  return (
    <form action={saveCommercialRatePlanAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={plan?.id ?? ""} />
      {plan ? <><input type="hidden" name="supplier_id" value={plan.supplier_id} /><input type="hidden" name="property_id" value={plan.property_id} /></> : null}
      {!canEdit ? <p className="rounded-2xl bg-copper/10 p-4 text-sm font-bold text-copper-strong">Staff chỉ được sửa bảng thương mại ở trạng thái bản nháp. Hãy nhờ Admin thay đổi vòng đời.</p> : null}
      <fieldset disabled={!canEdit} className="grid gap-5 disabled:opacity-70">
        <Card className="grid gap-5 p-5 sm:p-6">
          <div><h2 className="font-display text-xl font-bold text-pine">Khung chi phí riêng tư</h2><p className="mt-1 text-sm text-muted">Gắn một nhà cung cấp với một cơ sở. Không thay thế bảng giá bán cho khách.</p></div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nhà cung cấp" htmlFor="supplier_id"><Select id="supplier_id" name={plan ? undefined : "supplier_id"} defaultValue={plan?.supplier_id ?? ""} disabled={Boolean(plan)} required><option value="" disabled>Chọn nhà cung cấp</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.display_name} · {supplier.supplier_code} · {supplier.status}</option>)}</Select></Field>
            <Field label="Nơi lưu trú" htmlFor="property_id"><Select id="property_id" name={plan ? undefined : "property_id"} defaultValue={plan?.property_id ?? ""} disabled={Boolean(plan)} required><option value="" disabled>Chọn cơ sở</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select></Field>
            <Field label="Mã bảng thương mại" htmlFor="code" hint="Chữ thường, số và dấu gạch ngang; không đổi sau khi tạo."><Input id="code" name="code" defaultValue={plan?.code ?? ""} required readOnly={Boolean(plan)} /></Field>
            <Field label="Tên nội bộ" htmlFor="name"><Input id="name" name="name" defaultValue={plan?.name ?? ""} required /></Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Hiệu lực từ" htmlFor="valid_from"><Input id="valid_from" name="valid_from" type="date" defaultValue={plan?.valid_from ?? ""} /></Field>
            <Field label="Hiệu lực đến" htmlFor="valid_until"><Input id="valid_until" name="valid_until" type="date" defaultValue={plan?.valid_until ?? ""} /></Field>
            <Field label="Ưu tiên bảng" htmlFor="priority" hint="Số cao hơn thắng sau loại quy tắc."><Input id="priority" name="priority" type="number" min={-10000} max={10000} defaultValue={plan?.priority ?? 0} required /></Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Trạng thái thương mại" htmlFor="status" hint={role === "admin" ? "Chỉ Admin điều khiển active/archive." : "Staff chỉ tạo và sửa bản nháp."}><Select id="status" name="status" defaultValue={plan?.status ?? "draft"}>{availableStatuses.map((status) => <option key={status} value={status}>{COMMERCIAL_STATUS_LABELS[status]}</option>)}</Select></Field>
            <Field label="Nguồn" htmlFor="source"><Select id="source" name="source" defaultValue={plan?.source ?? "admin"}>{COMMERCIAL_SOURCES.map((source) => <option key={source} value={source}>{COMMERCIAL_SOURCE_LABELS[source]}</option>)}</Select></Field>
          </div>
        </Card>
        <Card className="grid gap-5 p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-pine">Nguồn và ghi chú</h2>
          {role === "admin" ? <Field label="Tham chiếu thỏa thuận" htmlFor="contract_reference" hint="Chỉ là nhãn nội bộ; không lưu file hợp đồng hay thông tin ngân hàng."><Input id="contract_reference" name="contract_reference" defaultValue={plan?.contract_reference ?? ""} /></Field> : <input type="hidden" name="contract_reference" value="" />}
          <Field label="Ghi chú nội bộ" htmlFor="notes_internal"><Textarea id="notes_internal" name="notes_internal" defaultValue={plan?.notes_internal ?? ""} className="min-h-28" /></Field>
        </Card>
      </fieldset>
      {canEdit ? <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu bảng chi phí" /></div></div> : null}
    </form>
  );
}
