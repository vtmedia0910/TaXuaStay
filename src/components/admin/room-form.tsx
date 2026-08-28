import { AmenityChecklist } from "@/components/admin/amenity-checklist";
import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AmenityDto } from "@/features/amenities/types";
import { PUBLISH_STATUSES, type PropertyOption } from "@/features/properties/types";
import { saveRoomTypeAction } from "@/features/rooms/actions";
import { BATHROOM_TYPES, VIEW_TYPES, type RoomTypeDto } from "@/features/rooms/types";

type RoomFormValue = RoomTypeDto & { amenity_ids: string[] };

export function RoomForm({
  room,
  properties,
  amenities,
}: {
  room?: RoomFormValue | null;
  properties: PropertyOption[];
  amenities: AmenityDto[];
}) {
  return (
    <form action={saveRoomTypeAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={room?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Loại phòng</h2>
          <p className="mt-1 text-sm text-muted">Room type là đơn vị nội dung và giao dịch tương lai.</p>
        </div>
        <Field label="Nơi lưu trú" htmlFor="property_id">
          <Select id="property_id" name="property_id" defaultValue={room?.property_id ?? ""} required>
            <option value="" disabled>Chọn nơi lưu trú</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tên loại phòng" htmlFor="name">
            <Input id="name" name="name" defaultValue={room?.name ?? ""} maxLength={160} required />
          </Field>
          <Field label="Slug" htmlFor="slug">
            <Input id="slug" name="slug" defaultValue={room?.slug ?? ""} maxLength={120} required />
          </Field>
        </div>
        <Field label="Mô tả ngắn" htmlFor="short_description">
          <Input id="short_description" name="short_description" defaultValue={room?.short_description ?? ""} maxLength={300} />
        </Field>
        <Field label="Mô tả đầy đủ" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={room?.description ?? ""} maxLength={10000} className="min-h-36" />
        </Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Sức chứa và giường</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Người lớn" htmlFor="capacity_adults">
            <Input id="capacity_adults" name="capacity_adults" type="number" min={1} max={50} defaultValue={room?.capacity_adults ?? 1} required />
          </Field>
          <Field label="Trẻ em" htmlFor="capacity_children">
            <Input id="capacity_children" name="capacity_children" type="number" min={0} max={50} defaultValue={room?.capacity_children ?? 0} required />
          </Field>
          <Field label="Tối đa tổng khách" htmlFor="max_guests">
            <Input id="max_guests" name="max_guests" type="number" min={1} max={100} defaultValue={room?.max_guests ?? 1} required />
          </Field>
          <Field label="Loại giường" htmlFor="bed_type">
            <Input id="bed_type" name="bed_type" defaultValue={room?.bed_type ?? ""} maxLength={120} />
          </Field>
          <Field label="Số giường" htmlFor="bed_count">
            <Input id="bed_count" name="bed_count" type="number" min={1} max={50} defaultValue={room?.bed_count ?? ""} />
          </Field>
          <Field label="Phòng tắm" htmlFor="bathroom_type">
            <Select id="bathroom_type" name="bathroom_type" defaultValue={room?.bathroom_type ?? "private"}>
              {BATHROOM_TYPES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Số lượng và đặc điểm vật lý</h2>
          <p className="mt-1 text-sm text-muted">Quantity là số đơn vị vật lý, không phải phòng trống theo ngày.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Quantity" htmlFor="quantity">
            <Input id="quantity" name="quantity" type="number" min={0} max={1000} defaultValue={room?.quantity ?? 0} required />
          </Field>
          <Field label="Diện tích m²" htmlFor="size_m2">
            <Input id="size_m2" name="size_m2" type="number" min={0.01} step="0.01" defaultValue={room?.size_m2 ?? ""} />
          </Field>
          <Field label="Tầng / vị trí" htmlFor="floor_label">
            <Input id="floor_label" name="floor_label" defaultValue={room?.floor_label ?? ""} maxLength={80} />
          </Field>
          <Field label="Loại view cơ bản" htmlFor="view_type" hint="Không phải Cloud View Score.">
            <Select id="view_type" name="view_type" defaultValue={room?.view_type ?? "unknown"}>
              {VIEW_TYPES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
        </div>
        <CheckboxField name="has_private_balcony" label="Có ban công riêng" defaultChecked={room?.has_private_balcony} />
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Amenities của phòng</h2>
        <AmenityChecklist amenities={amenities} selectedIds={room?.amenity_ids} />
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Xuất bản</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Trạng thái" htmlFor="publish_status">
            <Select id="publish_status" name="publish_status" defaultValue={room?.publish_status ?? "draft"}>
              {PUBLISH_STATUSES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
          <CheckboxField name="is_active" label="Đang hoạt động" defaultChecked={room?.is_active} hint="Published yêu cầu active và quantity ≥ 1." />
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu loại phòng" /></div>
      </div>
    </form>
  );
}
