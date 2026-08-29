"use client";

import { useMemo, useState } from "react";
import { CheckboxField } from "@/components/admin/checkbox-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { savePhysicalRoomAction } from "@/features/physical-rooms/actions";
import type { PhysicalRoomDto } from "@/features/physical-rooms/types";
import { PUBLISH_STATUSES, type PropertyOption } from "@/features/properties/types";
import type { AdminRoomOption } from "@/features/verification/types";

export function PhysicalRoomForm({
  physicalRoom,
  properties,
  rooms,
}: {
  physicalRoom?: PhysicalRoomDto | null;
  properties: PropertyOption[];
  rooms: AdminRoomOption[];
}) {
  const editing = Boolean(physicalRoom);
  const [propertyId, setPropertyId] = useState(physicalRoom?.property_id ?? properties[0]?.id ?? "");
  const [roomTypeId, setRoomTypeId] = useState(physicalRoom?.room_type_id ?? "");
  const eligibleRooms = useMemo(
    () => rooms.filter((room) => room.property_id === propertyId),
    [propertyId, rooms],
  );

  function changeProperty(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    const firstRoom = rooms.find((room) => room.property_id === nextPropertyId);
    setRoomTypeId(firstRoom?.id ?? "");
  }

  return (
    <form action={savePhysicalRoomAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={physicalRoom?.id ?? ""} />
      {editing ? <input type="hidden" name="property_id" value={propertyId} /> : null}
      {editing ? <input type="hidden" name="room_code" value={physicalRoom?.room_code ?? ""} /> : null}
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Danh tính phòng cụ thể</h2>
          <p className="mt-1 text-sm text-muted">Mã phòng là định danh nghiệp vụ ổn định, viết hoa và không đổi sau khi tạo. Không tạo phòng từ số lượng tồn kho.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nơi lưu trú" htmlFor="property_id">
            <Select id="property_id" name={editing ? undefined : "property_id"} value={propertyId} disabled={editing} onChange={(event) => changeProperty(event.target.value)} required>
              <option value="">Chọn nơi lưu trú</option>
              {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
            </Select>
          </Field>
          <Field label="Loại phòng" htmlFor="room_type_id" hint="Chỉ hiển thị loại phòng thuộc nơi lưu trú đã chọn.">
            <Select id="room_type_id" name="room_type_id" value={roomTypeId} onChange={(event) => setRoomTypeId(event.target.value)} required>
              <option value="">Chọn loại phòng</option>
              {eligibleRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </Select>
          </Field>
          <Field label="Mã phòng" htmlFor="room_code" hint="Ví dụ: TX-MAY-203. Hệ thống tự chuẩn hóa chữ hoa.">
            <Input id="room_code" name={editing ? undefined : "room_code"} defaultValue={physicalRoom?.room_code ?? ""} maxLength={80} disabled={editing} required />
          </Field>
          <Field label="Tên hiển thị" htmlFor="display_name"><Input id="display_name" name="display_name" defaultValue={physicalRoom?.display_name ?? ""} maxLength={160} /></Field>
          <Field label="Tầng" htmlFor="floor_label"><Input id="floor_label" name="floor_label" defaultValue={physicalRoom?.floor_label ?? ""} maxLength={80} /></Field>
          <Field label="Nhãn đơn vị" htmlFor="unit_label"><Input id="unit_label" name="unit_label" defaultValue={physicalRoom?.unit_label ?? ""} maxLength={80} /></Field>
        </div>
        <Field label="Ghi chú vị trí nội bộ" htmlFor="position_notes" hint="Không có trong public DTO hoặc grant anonymous."><Textarea id="position_notes" name="position_notes" defaultValue={physicalRoom?.position_notes ?? ""} maxLength={3000} /></Field>
      </Card>
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Khả năng nhận yêu cầu và xuất bản</h2>
          <p className="mt-1 text-sm text-muted">“Có thể yêu cầu đúng mã phòng” không phải tình trạng trống, cam kết giao phòng hay xác minh.</p>
        </div>
        <CheckboxField name="exact_room_bookable" label="Có thể tiếp nhận yêu cầu chọn đúng mã phòng" defaultChecked={physicalRoom?.exact_room_bookable} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Trạng thái" htmlFor="publish_status"><Select id="publish_status" name="publish_status" defaultValue={physicalRoom?.publish_status ?? "draft"}>{PUBLISH_STATUSES.map((value) => <option key={value}>{value}</option>)}</Select></Field>
          <CheckboxField name="is_active" label="Đang hoạt động" defaultChecked={physicalRoom?.is_active ?? true} hint="Bắt buộc bật trước khi published." />
        </div>
      </Card>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu phòng cụ thể" /></div></div>
    </form>
  );
}
