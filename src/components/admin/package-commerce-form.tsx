"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CmsMediaAsset } from "@/features/cms/types";
import type { DestinationOption } from "@/features/destinations/types";
import { savePackageCommerceAction } from "@/features/packages/actions";
import {
  PACKAGE_COMPONENT_LABELS,
  PACKAGE_CONFIRMATION_LABELS,
  PACKAGE_COST_SOURCE_LABELS,
  PACKAGE_LIFECYCLE_LABELS,
  PACKAGE_PRICE_SOURCE_LABELS,
} from "@/features/packages/policy";
import type {
  AdminPackage,
  AdminPackageComponent,
  AdminPackagePriceRule,
  PackageMotorbikeSourceOption,
  PackageRoomSourceOption,
  PackageWarningCode,
} from "@/features/packages/types";
import {
  ACTIVE_PACKAGE_COMPONENT_TYPES,
  PACKAGE_CONFIRMATION_MODES,
  PACKAGE_COST_SOURCES,
  PACKAGE_LIFECYCLE_STATUSES,
  PACKAGE_PRICE_SOURCES,
} from "@/features/packages/types";

type ComponentDraft = Omit<AdminPackageComponent, "id" | "package_id" | "created_at" | "updated_at"> & { rowId: number };
type PriceRuleDraft = Omit<AdminPackagePriceRule, "id" | "package_id" | "created_at" | "updated_at" | "rule_id"> & { rowId: number };

const warningLabels: Record<PackageWarningCode, string> = {
  "required-room-missing": "Chưa có phòng bắt buộc trong gói.",
  "source-inactive": "Có nguồn lưu trú không còn công khai hoặc đang tắt.",
  "motorbike-paused": "Có lựa chọn xe máy đang tạm dừng hoặc không công khai.",
  "package-price-missing": "Chưa có quy tắc giá gói đang hoạt động.",
  "package-price-stale": "Giá gói đã cũ hoặc hết hiệu lực.",
  "required-availability-unknown": "Có thành phần bắt buộc chưa biết tình trạng.",
  "component-cost-missing": "Có thành phần bắt buộc thiếu chi phí.",
  "negative-contribution": "Giá bán thấp hơn tổng chi phí đã biết.",
  "price-conflict": "Có quy tắc giá cùng mức ưu tiên và độ cụ thể.",
  "dates-invalid": "Khoảng ngày không hợp lệ.",
  "image-missing": "Chưa có ảnh đại diện.",
  "copy-missing": "Thiếu mô tả hoặc lời hứa giá trị.",
  "published-without-components": "Gói công khai chưa có thành phần có ý nghĩa.",
  "optional-selection-invalid": "Quy tắc giá đang tham chiếu lựa chọn thêm không hợp lệ.",
};

function localDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function initialComponents(values: AdminPackageComponent[]) {
  return values.map((component, index): ComponentDraft => ({
    ...component,
    rowId: index + 1,
    cost_verified_at: localDateTime(component.cost_verified_at),
  }));
}

function initialRules(values: AdminPackagePriceRule[]) {
  return values.map((rule, index): PriceRuleDraft => ({
    ...rule,
    rowId: index + 1,
    verified_at: localDateTime(rule.verified_at),
  }));
}

function numberOrNull(value: string) {
  return value === "" ? null : Number(value);
}

export function PackageCommerceForm({
  packageValue,
  initialComponentValues = [],
  initialPriceRuleValues = [],
  destinations,
  rooms,
  motorbikes,
  media,
  warnings = [],
}: {
  packageValue?: AdminPackage | null;
  initialComponentValues?: AdminPackageComponent[];
  initialPriceRuleValues?: AdminPackagePriceRule[];
  destinations: DestinationOption[];
  rooms: PackageRoomSourceOption[];
  motorbikes: PackageMotorbikeSourceOption[];
  media: CmsMediaAsset[];
  warnings?: PackageWarningCode[];
}) {
  const nextRow = useRef(Math.max(initialComponentValues.length, initialPriceRuleValues.length) + 1);
  const [components, setComponents] = useState<ComponentDraft[]>(() => initialComponents(initialComponentValues));
  const [priceRules, setPriceRules] = useState<PriceRuleDraft[]>(() => initialRules(initialPriceRuleValues));
  const immutable = packageValue?.lifecycle_status === "archived";
  const optionalComponents = useMemo(() => components.filter((component) => !component.is_required && component.component_key), [components]);

  function addComponent() {
    const rowId = nextRow.current++;
    setComponents((current) => [...current, {
      rowId,
      component_key: "",
      component_type: "ROOM",
      room_type_id: null,
      motorbike_offering_id: null,
      custom_code: null,
      custom_name: null,
      custom_description: null,
      is_required: true,
      quantity: 1,
      sort_order: current.length,
      confirmation_mode: "manual",
      public_copy_override: null,
      unit_cost_vnd: null,
      cost_source: null,
      cost_verified_at: null,
      cost_valid_until: null,
      internal_notes: null,
    }]);
  }

  function updateComponent(rowId: number, changes: Partial<ComponentDraft>) {
    setComponents((current) => current.map((item) => item.rowId === rowId ? { ...item, ...changes } : item));
  }

  function moveComponent(index: number, direction: -1 | 1) {
    setComponents((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function addPriceRule() {
    const rowId = nextRow.current++;
    setPriceRules((current) => [...current, {
      rowId,
      rule_key: "",
      price_vnd: 0,
      effective_from: null,
      effective_until: null,
      adults_min: null,
      adults_max: null,
      children_min: null,
      children_max: null,
      rooms_min: null,
      rooms_max: null,
      selected_optional_component_keys: [],
      priority: 0,
      price_source: "admin",
      verified_at: "",
      price_valid_until: "",
      is_active: true,
      internal_notes: null,
    }]);
  }

  function updateRule(rowId: number, changes: Partial<PriceRuleDraft>) {
    setPriceRules((current) => current.map((item) => item.rowId === rowId ? { ...item, ...changes } : item));
  }

  const serializedComponents = JSON.stringify(components.map((draft, index) => {
    const { rowId, ...component } = draft;
    void rowId;
    return {
      ...component,
      sort_order: index,
      room_type_id: component.component_type === "ROOM" ? component.room_type_id : null,
      motorbike_offering_id: component.component_type === "MOTORBIKE" ? component.motorbike_offering_id : null,
      custom_code: component.component_type === "CUSTOM" ? component.custom_code : null,
      custom_name: component.component_type === "CUSTOM" ? component.custom_name : null,
      custom_description: component.component_type === "CUSTOM" ? component.custom_description : null,
      confirmation_mode: component.component_type === "MOTORBIKE" ? "manual" : component.confirmation_mode,
      unit_cost_vnd: component.component_type === "ROOM" ? null : component.unit_cost_vnd,
      cost_source: component.component_type === "ROOM" ? null : component.cost_source,
      cost_verified_at: component.component_type === "ROOM" ? null : component.cost_verified_at,
      cost_valid_until: component.component_type === "ROOM" ? null : component.cost_valid_until,
    };
  }));
  const serializedRules = JSON.stringify(priceRules.map((draft) => {
    const { rowId, ...rule } = draft;
    void rowId;
    return {
      ...rule,
      selected_optional_component_keys: rule.selected_optional_component_keys.filter((key) => optionalComponents.some((component) => component.component_key === key)),
    };
  }));

  return (
    <form action={savePackageCommerceAction} className="grid gap-6 pb-28">
      <input type="hidden" name="id" value={packageValue?.id ?? ""} />
      {packageValue ? <><input type="hidden" name="destination_id" value={packageValue.destination_id} /><input type="hidden" name="code" value={packageValue.code} /><input type="hidden" name="slug" value={packageValue.slug} /></> : null}
      <input type="hidden" name="components_json" value={serializedComponents} />
      <input type="hidden" name="price_rules_json" value={serializedRules} />

      {warnings.length ? <Card className="border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-pine">Cảnh báo trước khi công khai</h2><ul className="mt-3 grid gap-2 text-sm leading-6 text-amber-950">{warnings.map((warning) => <li key={warning}>• {warningLabels[warning]}</li>)}</ul></Card> : null}

      <Card className="grid gap-5 p-5 sm:p-6">
        <div><h2 className="text-xl font-bold text-pine">Nhận diện & nội dung</h2><p className="mt-1 text-sm leading-6 text-muted">Gói có identity riêng; CMS chỉ cung cấp ảnh, không sở hữu giá hay thành phần.</p></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Điểm đến" htmlFor="destination_id"><Select id="destination_id" name="destination_id" defaultValue={packageValue?.destination_id ?? ""} required disabled={immutable || Boolean(packageValue)}><option value="">Chọn điểm đến</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</Select></Field>
          <Field label="Mã ổn định" htmlFor="code"><Input id="code" name="code" defaultValue={packageValue?.code ?? ""} required maxLength={80} placeholder="ta-xua-2n1d" disabled={immutable || Boolean(packageValue)} /></Field>
          <Field label="Slug" htmlFor="slug"><Input id="slug" name="slug" defaultValue={packageValue?.slug ?? ""} required maxLength={120} placeholder="ta-xua-2-ngay-1-dem" disabled={immutable || Boolean(packageValue)} /></Field>
          <Field label="Tên gói" htmlFor="name"><Input id="name" name="name" defaultValue={packageValue?.name ?? ""} required maxLength={160} disabled={immutable} /></Field>
        </div>
        <Field label="Điểm phù hợp nổi bật" htmlFor="proposition"><Input id="proposition" name="proposition" defaultValue={packageValue?.proposition ?? ""} required maxLength={240} disabled={immutable} /></Field>
        <Field label="Mô tả công khai" htmlFor="description"><Textarea id="description" name="description" defaultValue={packageValue?.description ?? ""} maxLength={5000} className="min-h-32" disabled={immutable} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ảnh đại diện" htmlFor="hero_media_id"><Select id="hero_media_id" name="hero_media_id" defaultValue={packageValue?.hero_media_id ?? ""} disabled={immutable}><option value="">Chưa chọn ảnh</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.title}</option>)}</Select></Field>
          <Field label="Thứ tự" htmlFor="sort_order"><Input id="sort_order" name="sort_order" type="number" min={0} max={10000} defaultValue={packageValue?.sort_order ?? 0} disabled={immutable} /></Field>
        </div>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-pine">Thành phần</h2><p className="mt-1 text-sm leading-6 text-muted">Chỉ nguồn ROOM, MOTORBIKE và CUSTOM có facts được phép hoạt động trong Phase 6.</p></div>{!immutable ? <button type="button" onClick={addComponent} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 font-bold text-pine"><Plus size={17} />Thêm thành phần</button> : null}</div>
        {components.map((component, index) => <div key={component.rowId} className="grid gap-4 rounded-3xl border border-line bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><strong className="text-pine">Thành phần {index + 1}</strong>{!immutable ? <div className="flex gap-1"><button type="button" aria-label="Đưa lên" onClick={() => moveComponent(index, -1)} disabled={index === 0} className="grid size-11 place-items-center rounded-full border border-line disabled:opacity-30"><ArrowUp size={17} /></button><button type="button" aria-label="Đưa xuống" onClick={() => moveComponent(index, 1)} disabled={index === components.length - 1} className="grid size-11 place-items-center rounded-full border border-line disabled:opacity-30"><ArrowDown size={17} /></button><button type="button" aria-label="Xóa thành phần" onClick={() => setComponents((current) => current.filter((item) => item.rowId !== component.rowId))} className="grid size-11 place-items-center rounded-full border border-red-200 text-danger"><Trash2 size={17} /></button></div> : null}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Component key" htmlFor={`component-key-${component.rowId}`}><Input id={`component-key-${component.rowId}`} value={component.component_key} onChange={(event) => updateComponent(component.rowId, { component_key: event.target.value })} placeholder="phong-chinh" maxLength={80} disabled={immutable} /></Field>
            <Field label="Loại" htmlFor={`component-type-${component.rowId}`}><Select id={`component-type-${component.rowId}`} value={component.component_type} onChange={(event) => updateComponent(component.rowId, { component_type: event.target.value as ComponentDraft["component_type"], room_type_id: null, motorbike_offering_id: null, custom_code: null, custom_name: null, custom_description: null, confirmation_mode: "manual", unit_cost_vnd: null, cost_source: null, cost_verified_at: null, cost_valid_until: null })} disabled={immutable}>{ACTIVE_PACKAGE_COMPONENT_TYPES.map((type) => <option key={type} value={type}>{PACKAGE_COMPONENT_LABELS[type]}</option>)}</Select></Field>
          </div>
          {component.component_type === "ROOM" ? <Field label="Room Type nguồn" htmlFor={`room-source-${component.rowId}`}><Select id={`room-source-${component.rowId}`} value={component.room_type_id ?? ""} onChange={(event) => updateComponent(component.rowId, { room_type_id: event.target.value || null })} disabled={immutable}><option value="">Chọn phòng thật</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.property_name} · {room.name}{room.is_active && room.publish_status === "published" ? "" : " · không công khai"}</option>)}</Select></Field> : null}
          {component.component_type === "MOTORBIKE" ? <Field label="Lựa chọn xe máy nguồn" htmlFor={`motorbike-source-${component.rowId}`}><Select id={`motorbike-source-${component.rowId}`} value={component.motorbike_offering_id ?? ""} onChange={(event) => updateComponent(component.rowId, { motorbike_offering_id: event.target.value || null })} disabled={immutable}><option value="">Chọn projection Phase 5</option>{motorbikes.map((offering) => <option key={offering.id} value={offering.id}>{offering.display_name}{offering.publication_status === "published" ? "" : " · tạm dừng"}</option>)}</Select></Field> : null}
          {component.component_type === "CUSTOM" ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Mã nội dung riêng" htmlFor={`custom-code-${component.rowId}`}><Input id={`custom-code-${component.rowId}`} value={component.custom_code ?? ""} onChange={(event) => updateComponent(component.rowId, { custom_code: event.target.value || null })} maxLength={80} disabled={immutable} /></Field><Field label="Tên công khai" htmlFor={`custom-name-${component.rowId}`}><Input id={`custom-name-${component.rowId}`} value={component.custom_name ?? ""} onChange={(event) => updateComponent(component.rowId, { custom_name: event.target.value || null })} maxLength={160} disabled={immutable} /></Field><div className="sm:col-span-2"><Field label="Mô tả" htmlFor={`custom-description-${component.rowId}`}><Textarea id={`custom-description-${component.rowId}`} value={component.custom_description ?? ""} onChange={(event) => updateComponent(component.rowId, { custom_description: event.target.value || null })} maxLength={3000} disabled={immutable} /></Field></div></div> : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-line px-4 text-sm font-bold text-pine"><input type="checkbox" checked={component.is_required} onChange={(event) => updateComponent(component.rowId, { is_required: event.target.checked })} disabled={immutable} />Bắt buộc</label>
            <Field label="Số lượng" htmlFor={`quantity-${component.rowId}`}><Input id={`quantity-${component.rowId}`} type="number" min={1} max={100} value={component.quantity} onChange={(event) => updateComponent(component.rowId, { quantity: Number(event.target.value) })} disabled={immutable} /></Field>
            <Field label="Cách xác nhận" htmlFor={`confirmation-${component.rowId}`}><Select id={`confirmation-${component.rowId}`} value={component.component_type === "MOTORBIKE" ? "manual" : component.confirmation_mode} onChange={(event) => updateComponent(component.rowId, { confirmation_mode: event.target.value as ComponentDraft["confirmation_mode"] })} disabled={immutable || component.component_type === "MOTORBIKE"}>{PACKAGE_CONFIRMATION_MODES.filter((mode) => mode !== "instant").map((mode) => <option key={mode} value={mode}>{PACKAGE_CONFIRMATION_LABELS[mode]}</option>)}</Select></Field>
          </div>
          <Field label="Copy công khai có kiểm soát" htmlFor={`copy-${component.rowId}`}><Textarea id={`copy-${component.rowId}`} value={component.public_copy_override ?? ""} onChange={(event) => updateComponent(component.rowId, { public_copy_override: event.target.value || null })} maxLength={500} disabled={immutable} /></Field>
          {component.component_type !== "ROOM" ? <div className="grid gap-4 rounded-2xl bg-mist/70 p-4 sm:grid-cols-2"><div className="sm:col-span-2"><strong className="text-sm text-pine">Chi phí nội bộ</strong><p className="mt-1 text-xs leading-5 text-muted">Không hiển thị công khai. Thiếu một chi phí bắt buộc thì tổng chi phí gói là chưa biết, không phải 0.</p></div><Field label="Chi phí/đơn vị (VND)" htmlFor={`cost-${component.rowId}`}><Input id={`cost-${component.rowId}`} type="number" min={0} max={1000000000} value={component.unit_cost_vnd ?? ""} onChange={(event) => updateComponent(component.rowId, { unit_cost_vnd: numberOrNull(event.target.value) })} disabled={immutable} /></Field><Field label="Nguồn chi phí" htmlFor={`cost-source-${component.rowId}`}><Select id={`cost-source-${component.rowId}`} value={component.cost_source ?? ""} onChange={(event) => updateComponent(component.rowId, { cost_source: event.target.value as ComponentDraft["cost_source"] || null })} disabled={immutable}><option value="">Chưa có</option>{PACKAGE_COST_SOURCES.map((source) => <option key={source} value={source}>{PACKAGE_COST_SOURCE_LABELS[source]}</option>)}</Select></Field><Field label="Kiểm tra lúc" htmlFor={`cost-verified-${component.rowId}`}><Input id={`cost-verified-${component.rowId}`} type="datetime-local" value={component.cost_verified_at ?? ""} onChange={(event) => updateComponent(component.rowId, { cost_verified_at: event.target.value || null })} disabled={immutable} /></Field><Field label="Hiệu lực đến" htmlFor={`cost-until-${component.rowId}`}><Input id={`cost-until-${component.rowId}`} type="date" value={component.cost_valid_until ?? ""} onChange={(event) => updateComponent(component.rowId, { cost_valid_until: event.target.value || null })} disabled={immutable} /></Field></div> : <p className="rounded-2xl bg-mist/70 p-4 text-sm leading-6 text-muted">Chi phí phòng được resolver lấy từ Commercial Economics theo ngày; không nhập lặp ở đây.</p>}
          <Field label="Ghi chú nội bộ" htmlFor={`notes-${component.rowId}`}><Textarea id={`notes-${component.rowId}`} value={component.internal_notes ?? ""} onChange={(event) => updateComponent(component.rowId, { internal_notes: event.target.value || null })} maxLength={10000} disabled={immutable} /></Field>
        </div>)}
        {!components.length ? <p className="rounded-3xl border border-dashed border-line p-6 text-center text-sm text-muted">Chưa có thành phần. Không công khai gói rỗng.</p> : null}
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-pine">Giá bán gói</h2><p className="mt-1 text-sm leading-6 text-muted">Chỉ quy tắc giá gói rõ ràng mới tạo tổng giá. Không cộng ngầm giá lẻ và không tạo giảm giá giả.</p></div>{!immutable ? <button type="button" onClick={addPriceRule} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 font-bold text-pine"><Plus size={17} />Thêm quy tắc</button> : null}</div>
        {priceRules.map((rule, index) => <div key={rule.rowId} className="grid gap-4 rounded-3xl border border-line bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between"><strong className="text-pine">Quy tắc {index + 1}</strong>{!immutable ? <button type="button" aria-label="Xóa quy tắc" onClick={() => setPriceRules((current) => current.filter((item) => item.rowId !== rule.rowId))} className="grid size-11 place-items-center rounded-full border border-red-200 text-danger"><Trash2 size={17} /></button> : null}</div>
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Rule key" htmlFor={`rule-key-${rule.rowId}`}><Input id={`rule-key-${rule.rowId}`} value={rule.rule_key} onChange={(event) => updateRule(rule.rowId, { rule_key: event.target.value })} maxLength={80} disabled={immutable} /></Field><Field label="Tổng giá gói (VND)" htmlFor={`rule-price-${rule.rowId}`}><Input id={`rule-price-${rule.rowId}`} type="number" min={1} max={2000000000} value={rule.price_vnd || ""} onChange={(event) => updateRule(rule.rowId, { price_vnd: Number(event.target.value) })} disabled={immutable} /></Field><Field label="Ưu tiên" htmlFor={`rule-priority-${rule.rowId}`}><Input id={`rule-priority-${rule.rowId}`} type="number" min={-10000} max={10000} value={rule.priority} onChange={(event) => updateRule(rule.rowId, { priority: Number(event.target.value) })} disabled={immutable} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Áp dụng từ" htmlFor={`rule-from-${rule.rowId}`}><Input id={`rule-from-${rule.rowId}`} type="date" value={rule.effective_from ?? ""} onChange={(event) => updateRule(rule.rowId, { effective_from: event.target.value || null })} disabled={immutable} /></Field><Field label="Áp dụng đến" htmlFor={`rule-until-${rule.rowId}`}><Input id={`rule-until-${rule.rowId}`} type="date" value={rule.effective_until ?? ""} onChange={(event) => updateRule(rule.rowId, { effective_until: event.target.value || null })} disabled={immutable} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Người lớn tối thiểu" htmlFor={`adults-min-${rule.rowId}`}><Input id={`adults-min-${rule.rowId}`} type="number" min={1} max={100} value={rule.adults_min ?? ""} onChange={(event) => updateRule(rule.rowId, { adults_min: numberOrNull(event.target.value) })} disabled={immutable} /></Field><Field label="Người lớn tối đa" htmlFor={`adults-max-${rule.rowId}`}><Input id={`adults-max-${rule.rowId}`} type="number" min={1} max={100} value={rule.adults_max ?? ""} onChange={(event) => updateRule(rule.rowId, { adults_max: numberOrNull(event.target.value) })} disabled={immutable} /></Field><Field label="Trẻ em tối thiểu" htmlFor={`children-min-${rule.rowId}`}><Input id={`children-min-${rule.rowId}`} type="number" min={0} max={100} value={rule.children_min ?? ""} onChange={(event) => updateRule(rule.rowId, { children_min: numberOrNull(event.target.value) })} disabled={immutable} /></Field><Field label="Trẻ em tối đa" htmlFor={`children-max-${rule.rowId}`}><Input id={`children-max-${rule.rowId}`} type="number" min={0} max={100} value={rule.children_max ?? ""} onChange={(event) => updateRule(rule.rowId, { children_max: numberOrNull(event.target.value) })} disabled={immutable} /></Field><Field label="Số phòng tối thiểu" htmlFor={`rooms-min-${rule.rowId}`}><Input id={`rooms-min-${rule.rowId}`} type="number" min={1} max={100} value={rule.rooms_min ?? ""} onChange={(event) => updateRule(rule.rowId, { rooms_min: numberOrNull(event.target.value) })} disabled={immutable} /></Field><Field label="Số phòng tối đa" htmlFor={`rooms-max-${rule.rowId}`}><Input id={`rooms-max-${rule.rowId}`} type="number" min={1} max={100} value={rule.rooms_max ?? ""} onChange={(event) => updateRule(rule.rowId, { rooms_max: numberOrNull(event.target.value) })} disabled={immutable} /></Field></div>
          {optionalComponents.length ? <fieldset className="grid gap-2 rounded-2xl bg-mist/70 p-4"><legend className="px-1 text-sm font-bold text-pine">Cấu hình lựa chọn thêm chính xác</legend>{optionalComponents.map((component) => <label key={component.rowId} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={rule.selected_optional_component_keys.includes(component.component_key)} onChange={(event) => updateRule(rule.rowId, { selected_optional_component_keys: event.target.checked ? [...rule.selected_optional_component_keys, component.component_key] : rule.selected_optional_component_keys.filter((key) => key !== component.component_key) })} disabled={immutable} />{component.component_key}</label>)}</fieldset> : null}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Nguồn giá" htmlFor={`price-source-${rule.rowId}`}><Select id={`price-source-${rule.rowId}`} value={rule.price_source} onChange={(event) => updateRule(rule.rowId, { price_source: event.target.value as PriceRuleDraft["price_source"] })} disabled={immutable}>{PACKAGE_PRICE_SOURCES.map((source) => <option key={source} value={source}>{PACKAGE_PRICE_SOURCE_LABELS[source]}</option>)}</Select></Field><label className="flex min-h-11 items-center gap-3 self-end rounded-2xl border border-line px-4 text-sm font-bold text-pine"><input type="checkbox" checked={rule.is_active} onChange={(event) => updateRule(rule.rowId, { is_active: event.target.checked })} disabled={immutable} />Đang hoạt động</label><Field label="Kiểm tra lúc" htmlFor={`price-verified-${rule.rowId}`}><Input id={`price-verified-${rule.rowId}`} type="datetime-local" value={rule.verified_at} onChange={(event) => updateRule(rule.rowId, { verified_at: event.target.value })} disabled={immutable} /></Field><Field label="Giá có hiệu lực đến" htmlFor={`price-valid-${rule.rowId}`}><Input id={`price-valid-${rule.rowId}`} type="date" value={rule.price_valid_until} onChange={(event) => updateRule(rule.rowId, { price_valid_until: event.target.value })} disabled={immutable} /></Field></div>
          <Field label="Ghi chú nội bộ" htmlFor={`rule-notes-${rule.rowId}`}><Textarea id={`rule-notes-${rule.rowId}`} value={rule.internal_notes ?? ""} onChange={(event) => updateRule(rule.rowId, { internal_notes: event.target.value || null })} maxLength={10000} disabled={immutable} /></Field>
        </div>)}
        {!priceRules.length ? <p className="rounded-3xl border border-dashed border-line p-6 text-center text-sm text-muted">Không có quy tắc giá: public sẽ hiển thị “Cần xác nhận giá”.</p> : null}
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Hiệu lực gói từ" htmlFor="valid_from"><Input id="valid_from" name="valid_from" type="date" defaultValue={packageValue?.valid_from ?? ""} disabled={immutable} /></Field><Field label="Hiệu lực gói đến" htmlFor="valid_until"><Input id="valid_until" name="valid_until" type="date" defaultValue={packageValue?.valid_until ?? ""} disabled={immutable} /></Field><Field label="Cách xác nhận gói" htmlFor="confirmation_mode"><Select id="confirmation_mode" name="confirmation_mode" defaultValue={packageValue?.confirmation_mode ?? "manual"} disabled={immutable}>{PACKAGE_CONFIRMATION_MODES.filter((mode) => mode !== "instant").map((mode) => <option key={mode} value={mode}>{PACKAGE_CONFIRMATION_LABELS[mode]}</option>)}</Select></Field><Field label="URL gửi yêu cầu" htmlFor="public_request_url" hint="Kênh HTTPS đã được phê duyệt; không phải booking."><Input id="public_request_url" name="public_request_url" type="url" defaultValue={packageValue?.public_request_url ?? ""} placeholder="https://..." disabled={immutable} /></Field><Field label="Trạng thái" htmlFor="lifecycle_status"><Select id="lifecycle_status" name="lifecycle_status" defaultValue={packageValue?.lifecycle_status ?? "draft"} disabled={immutable}>{PACKAGE_LIFECYCLE_STATUSES.map((status) => <option key={status} value={status}>{PACKAGE_LIFECYCLE_LABELS[status]}</option>)}</Select></Field><label className="flex min-h-11 items-center gap-3 self-end rounded-2xl border border-line px-4 text-sm font-bold text-pine"><input type="checkbox" name="is_featured" defaultChecked={packageValue?.is_featured ?? false} disabled={immutable} />Nổi bật công khai</label></div>
        <Field label="Ghi chú nội bộ" htmlFor="internal_notes"><Textarea id="internal_notes" name="internal_notes" defaultValue={packageValue?.internal_notes ?? ""} maxLength={10000} className="min-h-28" disabled={immutable} /></Field>
      </Card>

      {!immutable ? <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu gói dịch vụ" /></div></div> : null}
    </form>
  );
}
