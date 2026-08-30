import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveMediaAssetAction } from "@/features/media/actions";
import { EVIDENCE_TYPES, MEDIA_TYPES, type MediaAssetDto } from "@/features/media/types";
import type { PhysicalRoomOption } from "@/features/physical-rooms/types";
import type { PropertyOption } from "@/features/properties/types";

function toVietnamLocalInput(value: string | null | undefined) {
  if (!value) return "";
  return new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function MediaForm({
  asset,
  properties,
  rooms,
  physicalRooms,
}: {
  asset?: MediaAssetDto | null;
  properties: PropertyOption[];
  rooms: Array<{ id: string; property_id: string; name: string; slug: string }>;
  physicalRooms: PhysicalRoomOption[];
}) {
  const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const defaultOwner = asset?.property_id
    ? `property:${asset.property_id}`
    : asset?.room_type_id
      ? `room_type:${asset.room_type_id}`
      : asset?.physical_room_id
        ? `physical_room:${asset.physical_room_id}`
        : "";

  return (
    <form action={saveMediaAssetAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={asset?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Quan hệ nội dung</h2>
          <p className="mt-1 text-sm text-muted">Chọn một owner duy nhất. Media của phòng cụ thể không đồng thời thuộc property hoặc loại phòng.</p>
        </div>
        <Field label="Owner" htmlFor="owner">
          <Select id="owner" name="owner" defaultValue={defaultOwner} required>
            <option value="">Chọn nơi sở hữu media</option>
            <optgroup label="Nơi lưu trú">
              {properties.map((property) => <option key={`property:${property.id}`} value={`property:${property.id}`}>{property.name}</option>)}
            </optgroup>
            <optgroup label="Loại phòng">
              {rooms.map((room) => <option key={`room_type:${room.id}`} value={`room_type:${room.id}`}>{propertyMap.get(room.property_id) ?? "Nơi lưu trú"} · {room.name}</option>)}
            </optgroup>
            <optgroup label="Phòng cụ thể / Room ID">
              {physicalRooms.map((room) => {
                const roomType = roomMap.get(room.room_type_id);
                return <option key={`physical_room:${room.id}`} value={`physical_room:${room.id}`}>{propertyMap.get(room.property_id) ?? "Nơi lưu trú"} · {roomType?.name ?? "Loại phòng"} · {room.room_code}{room.display_name ? ` · ${room.display_name}` : ""}</option>;
              })}
            </optgroup>
          </Select>
        </Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-pine">Asset</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Media type" htmlFor="media_type">
            <Select id="media_type" name="media_type" defaultValue={asset?.media_type ?? "photo"}>
              {MEDIA_TYPES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Evidence type" htmlFor="evidence_type">
            <Select id="evidence_type" name="evidence_type" defaultValue={asset?.evidence_type ?? "property"}>
              {EVIDENCE_TYPES.map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="HTTPS URL" htmlFor="url">
          <Input id="url" name="url" type="url" defaultValue={asset?.url ?? ""} maxLength={2048} placeholder="https://..." required />
        </Field>
        <Field label="Thumbnail HTTPS URL" htmlFor="thumbnail_url">
          <Input id="thumbnail_url" name="thumbnail_url" type="url" defaultValue={asset?.thumbnail_url ?? ""} maxLength={2048} placeholder="https://..." />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Alt text" htmlFor="alt_text">
            <Input id="alt_text" name="alt_text" defaultValue={asset?.alt_text ?? ""} maxLength={300} required />
          </Field>
          <Field label="Thứ tự" htmlFor="sort_order">
            <Input id="sort_order" name="sort_order" type="number" min={0} max={100000} defaultValue={asset?.sort_order ?? 0} required />
          </Field>
        </div>
        <Field label="Caption" htmlFor="caption">
          <Textarea id="caption" name="caption" defaultValue={asset?.caption ?? ""} maxLength={500} />
        </Field>
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Metadata bằng chứng</h2>
          <p className="mt-1 text-sm text-muted">Chỉ nhập dữ liệu đã biết; thời gian dùng múi giờ Việt Nam (UTC+7).</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Captured at" htmlFor="captured_at">
            <Input id="captured_at" name="captured_at" type="datetime-local" defaultValue={toVietnamLocalInput(asset?.captured_at)} />
          </Field>
          <Field label="Latitude" htmlFor="latitude">
            <Input id="latitude" name="latitude" type="number" step="0.000001" min={-90} max={90} defaultValue={asset?.latitude ?? ""} />
          </Field>
          <Field label="Longitude" htmlFor="longitude">
            <Input id="longitude" name="longitude" type="number" step="0.000001" min={-180} max={180} defaultValue={asset?.longitude ?? ""} />
          </Field>
          <Field label="Hướng la bàn (0–&lt;360)" htmlFor="compass_heading_deg">
            <Input id="compass_heading_deg" name="compass_heading_deg" type="number" step="0.01" min={0} max={359.99} defaultValue={asset?.compass_heading_deg ?? ""} />
          </Field>
          <Field label="Horizontal FOV (0–360)" htmlFor="horizontal_fov_deg">
            <Input id="horizontal_fov_deg" name="horizontal_fov_deg" type="number" step="0.01" min={0.01} max={360} defaultValue={asset?.horizontal_fov_deg ?? ""} />
          </Field>
        </div>
        <CheckboxField
          name="is_verified"
          label="Đã kiểm duyệt để hiển thị công khai"
          defaultChecked={asset?.is_verified}
          hint="Duyệt media chỉ xác nhận asset đã được xem xét; đây không phải nhãn thẩm định Tà Xùa Trip."
        />
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu media" /></div>
      </div>
    </form>
  );
}
