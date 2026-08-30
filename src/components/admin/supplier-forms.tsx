import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  savePartnerRelationshipAction,
  saveSupplierAction,
  saveSupplierContactAction,
  saveSupplierExternalRefAction,
  saveSupplierPropertyAction,
} from "@/features/suppliers/actions";
import {
  CONTACT_TYPE_LABELS,
  PARTNER_STATUS_LABELS,
  PARTNER_TIER_POLICY,
  PROPERTY_RELATIONSHIP_LABELS,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_TYPE_LABELS,
} from "@/features/suppliers/policy";
import {
  CONTACT_TYPES,
  PARTNER_STATUSES,
  PARTNER_TIERS,
  PROPERTY_RELATIONSHIP_TYPES,
  SUPPLIER_STATUSES,
  SUPPLIER_TYPES,
  type PartnerRelationshipDto,
  type SupplierContactDto,
  type SupplierDto,
  type SupplierExternalRefDto,
  type SupplierPropertyDto,
} from "@/features/suppliers/types";
import type { PropertyOption } from "@/features/properties/types";

export function SupplierProfileForm({ supplier }: { supplier?: SupplierDto | null }) {
  const editing = Boolean(supplier);
  return (
    <form action={saveSupplierAction} className="grid gap-5">
      <input type="hidden" name="id" value={supplier?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Thông tin nhà cung cấp</p>
          <h2 className="mt-1 font-display text-xl font-bold text-pine">Nhận diện riêng tư</h2>
          <p className="mt-1 text-sm text-muted">Supplier là tổ chức/cá nhân cung ứng, không phải trang nơi lưu trú công khai.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Mã nhà cung cấp" htmlFor="supplier_code" hint={editing ? "Mã ổn định, không thể đổi sau khi tạo." : "Dạng SUP-TX-0001; không dùng lại mã cũ."}>
            <Input id="supplier_code" name="supplier_code" defaultValue={supplier?.supplier_code ?? ""} readOnly={editing} placeholder="SUP-TX-0001" required />
          </Field>
          <Field label="Tên sử dụng nội bộ" htmlFor="display_name">
            <Input id="display_name" name="display_name" defaultValue={supplier?.display_name ?? ""} maxLength={160} required />
          </Field>
          <Field label="Loại nhà cung cấp" htmlFor="supplier_type">
            <Select id="supplier_type" name="supplier_type" defaultValue={supplier?.supplier_type ?? "accommodation"}>
              {SUPPLIER_TYPES.map((value) => <option key={value} value={value}>{SUPPLIER_TYPE_LABELS[value]}</option>)}
            </Select>
          </Field>
          <Field label="Trạng thái vòng đời" htmlFor="status">
            <Select id="status" name="status" defaultValue={supplier?.status ?? "lead"}>
              {SUPPLIER_STATUSES.map((value) => <option key={value} value={value}>{SUPPLIER_STATUS_LABELS[value]}</option>)}
            </Select>
          </Field>
          <Field label="Tên pháp lý" htmlFor="legal_name">
            <Input id="legal_name" name="legal_name" defaultValue={supplier?.legal_name ?? ""} maxLength={200} />
          </Field>
          <Field label="Mã số thuế" htmlFor="tax_code" hint="Dữ liệu riêng tư, không xuất hiện ở public.">
            <Input id="tax_code" name="tax_code" defaultValue={supplier?.tax_code ?? ""} maxLength={50} />
          </Field>
        </div>
        <Field label="Website HTTPS" htmlFor="website_url">
          <Input id="website_url" name="website_url" type="url" defaultValue={supplier?.website_url ?? ""} maxLength={2048} placeholder="https://..." />
        </Field>
        <Field label="Ghi chú nội bộ" htmlFor="internal_notes" hint="Không hiển thị công khai.">
          <Textarea id="internal_notes" name="internal_notes" defaultValue={supplier?.internal_notes ?? ""} maxLength={10000} className="min-h-32" />
        </Field>
      </Card>

      {!editing ? (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky">Liên hệ chính ban đầu · không bắt buộc</p>
            <p className="mt-1 text-sm text-muted">Nếu nhập, hồ sơ nhà cung cấp và liên hệ này được lưu trong cùng một giao dịch.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tên người liên hệ" htmlFor="primary_contact_name"><Input id="primary_contact_name" name="primary_contact_name" maxLength={160} /></Field>
            <Field label="Loại liên hệ" htmlFor="primary_contact_type">
              <Select id="primary_contact_type" name="primary_contact_type" defaultValue=""><option value="">Chọn khi có liên hệ</option>{CONTACT_TYPES.map((value) => <option key={value} value={value}>{CONTACT_TYPE_LABELS[value]}</option>)}</Select>
            </Field>
            <Field label="Chức danh" htmlFor="primary_role_title"><Input id="primary_role_title" name="primary_role_title" maxLength={120} /></Field>
            <Field label="Điện thoại" htmlFor="primary_phone"><Input id="primary_phone" name="primary_phone" type="tel" maxLength={30} /></Field>
            <Field label="Email" htmlFor="primary_email"><Input id="primary_email" name="primary_email" type="email" maxLength={254} /></Field>
            <Field label="Zalo" htmlFor="primary_zalo"><Input id="primary_zalo" name="primary_zalo" maxLength={160} /></Field>
          </div>
          <Field label="Ghi chú liên hệ" htmlFor="primary_notes_internal"><Textarea id="primary_notes_internal" name="primary_notes_internal" maxLength={5000} /></Field>
        </Card>
      ) : null}
      <div className="flex justify-end"><SubmitButton label={editing ? "Lưu hồ sơ nhà cung cấp" : "Tạo nhà cung cấp"} /></div>
    </form>
  );
}

export function SupplierContactForm({ supplierId, contact }: { supplierId: string; contact?: SupplierContactDto }) {
  return (
    <form action={saveSupplierContactAction} className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
      <input type="hidden" name="id" value={contact?.id ?? ""} />
      <input type="hidden" name="supplier_id" value={supplierId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-pine">{contact?.contact_name ?? "Thêm liên hệ"}</h3>
        <div className="flex gap-2">{contact?.is_primary ? <Badge>Liên hệ chính</Badge> : null}{contact && !contact.is_active ? <Badge className="bg-stone-100 text-muted">Đã tắt</Badge> : null}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên người liên hệ" htmlFor={`contact_name_${contact?.id ?? "new"}`}><Input id={`contact_name_${contact?.id ?? "new"}`} name="contact_name" defaultValue={contact?.contact_name ?? ""} maxLength={160} required /></Field>
        <Field label="Loại liên hệ" htmlFor={`contact_type_${contact?.id ?? "new"}`}><Select id={`contact_type_${contact?.id ?? "new"}`} name="contact_type" defaultValue={contact?.contact_type ?? "operations"}>{CONTACT_TYPES.map((value) => <option key={value} value={value}>{CONTACT_TYPE_LABELS[value]}</option>)}</Select></Field>
        <Field label="Chức danh" htmlFor={`role_title_${contact?.id ?? "new"}`}><Input id={`role_title_${contact?.id ?? "new"}`} name="role_title" defaultValue={contact?.role_title ?? ""} maxLength={120} /></Field>
        <Field label="Điện thoại" htmlFor={`phone_${contact?.id ?? "new"}`}><Input id={`phone_${contact?.id ?? "new"}`} name="phone" type="tel" defaultValue={contact?.phone ?? ""} maxLength={30} /></Field>
        <Field label="Email" htmlFor={`email_${contact?.id ?? "new"}`}><Input id={`email_${contact?.id ?? "new"}`} name="email" type="email" defaultValue={contact?.email ?? ""} maxLength={254} /></Field>
        <Field label="Zalo" htmlFor={`zalo_${contact?.id ?? "new"}`}><Input id={`zalo_${contact?.id ?? "new"}`} name="zalo" defaultValue={contact?.zalo ?? ""} maxLength={160} /></Field>
      </div>
      <Field label="Ghi chú nội bộ" htmlFor={`contact_notes_${contact?.id ?? "new"}`}><Textarea id={`contact_notes_${contact?.id ?? "new"}`} name="notes_internal" defaultValue={contact?.notes_internal ?? ""} maxLength={5000} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><CheckboxField name="is_primary" label="Liên hệ chính" defaultChecked={contact?.is_primary} /><CheckboxField name="is_active" label="Đang hoạt động" defaultChecked={contact?.is_active ?? true} /></div>
      <div className="flex justify-end"><SubmitButton label={contact ? "Cập nhật liên hệ" : "Thêm liên hệ"} /></div>
    </form>
  );
}

export function SupplierPropertyForm({ supplierId, properties, link }: { supplierId: string; properties: PropertyOption[]; link?: SupplierPropertyDto }) {
  return (
    <form action={saveSupplierPropertyAction} className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
      <input type="hidden" name="id" value={link?.id ?? ""} />
      <input type="hidden" name="supplier_id" value={supplierId} />
      <h3 className="font-bold text-pine">{link?.property_name ?? "Liên kết cơ sở lưu trú"}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cơ sở" htmlFor={`property_id_${link?.id ?? "new"}`}>
          {link ? <><input type="hidden" name="property_id" value={link.property_id} /><Input id={`property_id_${link.id}`} value={link.property_name ?? link.property_id} readOnly /></> : <Select id="property_id_new" name="property_id" defaultValue="" required><option value="">Chọn cơ sở</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select>}
        </Field>
        <Field label="Vai trò" htmlFor={`relationship_type_${link?.id ?? "new"}`}><Select id={`relationship_type_${link?.id ?? "new"}`} name="relationship_type" defaultValue={link?.relationship_type ?? "operator"}>{PROPERTY_RELATIONSHIP_TYPES.map((value) => <option key={value} value={value}>{PROPERTY_RELATIONSHIP_LABELS[value]}</option>)}</Select></Field>
        <Field label="Có hiệu lực từ" htmlFor={`valid_from_${link?.id ?? "new"}`}><Input id={`valid_from_${link?.id ?? "new"}`} name="valid_from" type="date" defaultValue={link?.valid_from ?? ""} /></Field>
        <Field label="Hiệu lực đến" htmlFor={`valid_until_${link?.id ?? "new"}`} hint="Đặt ngày kết thúc thay vì xóa lịch sử."><Input id={`valid_until_${link?.id ?? "new"}`} name="valid_until" type="date" defaultValue={link?.valid_until ?? ""} /></Field>
      </div>
      <CheckboxField name="is_primary" label="Đầu mối chính cho vai trò này" defaultChecked={link?.is_primary} />
      <Field label="Ghi chú nội bộ" htmlFor={`property_notes_${link?.id ?? "new"}`}><Textarea id={`property_notes_${link?.id ?? "new"}`} name="notes_internal" defaultValue={link?.notes_internal ?? ""} maxLength={5000} /></Field>
      <div className="flex justify-end"><SubmitButton label={link ? "Cập nhật liên kết" : "Thêm liên kết"} /></div>
    </form>
  );
}

export function PartnerRelationshipForm({ supplierId, relationship }: { supplierId: string; relationship?: PartnerRelationshipDto }) {
  return (
    <form action={savePartnerRelationshipAction} className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
      <input type="hidden" name="id" value={relationship?.id ?? ""} />
      <input type="hidden" name="supplier_id" value={supplierId} />
      <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950"><strong>Phân loại nội bộ:</strong> tier đối tác không phải điểm xác minh và không tạo badge công khai.</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Trạng thái quan hệ" htmlFor="partner_status"><Select id="partner_status" name="status" defaultValue={relationship?.status ?? "prospect"}>{PARTNER_STATUSES.map((value) => <option key={value} value={value}>{PARTNER_STATUS_LABELS[value]}</option>)}</Select></Field>
        <Field label="Tier nội bộ" htmlFor="partner_tier"><Select id="partner_tier" name="tier" defaultValue={relationship?.tier ?? "standard"}>{PARTNER_TIERS.map((value) => <option key={value} value={value}>{PARTNER_TIER_POLICY[value].label}</option>)}</Select></Field>
        <Field label="Bắt đầu" htmlFor="started_at" hint="Khi chuyển active mà để trống, hệ thống dùng hôm nay."><Input id="started_at" name="started_at" type="date" defaultValue={relationship?.started_at ?? ""} /></Field>
        <Field label="Rà soát gần nhất" htmlFor="reviewed_at"><Input id="reviewed_at" name="reviewed_at" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={relationship?.reviewed_at ?? ""} /></Field>
        <Field label="Hiệu lực đến" htmlFor="partner_valid_until"><Input id="partner_valid_until" name="valid_until" type="date" defaultValue={relationship?.valid_until ?? ""} /></Field>
        <Field label="Kết thúc" htmlFor="ended_at" hint="Chọn status Đã kết thúc; để trống sẽ dùng hôm nay."><Input id="ended_at" name="ended_at" type="date" defaultValue={relationship?.ended_at ?? ""} /></Field>
      </div>
      <Field label="Ghi chú quan hệ nội bộ" htmlFor="relationship_notes_internal"><Textarea id="relationship_notes_internal" name="relationship_notes_internal" defaultValue={relationship?.relationship_notes_internal ?? ""} maxLength={10000} className="min-h-28" /></Field>
      <div className="flex justify-end"><SubmitButton label={relationship ? "Cập nhật quan hệ" : "Tạo quan hệ đối tác"} /></div>
    </form>
  );
}

export function SupplierExternalRefForm({ supplierId, externalRef }: { supplierId: string; externalRef?: SupplierExternalRefDto }) {
  return (
    <form action={saveSupplierExternalRefAction} className="grid gap-4 rounded-2xl border border-line bg-surface p-4">
      <input type="hidden" name="id" value={externalRef?.id ?? ""} />
      <input type="hidden" name="supplier_id" value={supplierId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mã hệ thống" htmlFor={`system_key_${externalRef?.id ?? "new"}`} hint="Ví dụ tương lai: taxua_biker. Không chứa credential."><Input id={`system_key_${externalRef?.id ?? "new"}`} name="system_key" defaultValue={externalRef?.system_key ?? ""} readOnly={Boolean(externalRef)} maxLength={80} required /></Field>
        <Field label="Tham chiếu bên ngoài" htmlFor={`external_reference_${externalRef?.id ?? "new"}`}><Input id={`external_reference_${externalRef?.id ?? "new"}`} name="external_reference" defaultValue={externalRef?.external_reference ?? ""} readOnly={Boolean(externalRef)} maxLength={200} required /></Field>
      </div>
      <Field label="Metadata JSON giới hạn" htmlFor={`metadata_${externalRef?.id ?? "new"}`} hint="Chỉ metadata định danh không nhạy cảm; không token, secret hay dữ liệu vận hành."><Textarea id={`metadata_${externalRef?.id ?? "new"}`} name="metadata" defaultValue={externalRef ? JSON.stringify(externalRef.metadata, null, 2) : "{}"} maxLength={8192} className="font-mono text-xs" /></Field>
      <CheckboxField name="is_active" label="Tham chiếu đang hoạt động" defaultChecked={externalRef?.is_active ?? true} />
      <div className="flex justify-end"><SubmitButton label={externalRef ? "Cập nhật tham chiếu" : "Thêm tham chiếu"} /></div>
    </form>
  );
}
