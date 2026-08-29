"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveRoomProfileNoteAction } from "@/features/room-profiles/actions";
import {
  ROOM_PROFILE_NOTE_CATEGORIES,
  ROOM_PROFILE_NOTE_TYPES,
  type RoomProfileNoteDto,
} from "@/features/room-profiles/types";
import type { PropertyOption } from "@/features/properties/types";
import type { PhysicalRoomOption } from "@/features/physical-rooms/types";
import type { AdminRoomOption } from "@/features/verification/types";

const NOTE_TYPE_LABELS = { pro: "Điểm mạnh", con: "Điểm cần lưu ý" } as const;
const CATEGORY_LABELS = {
  view: "View",
  noise: "Tiếng ồn",
  bathroom: "Phòng tắm",
  access: "Tiếp cận",
  wifi: "Wi-Fi",
  space: "Không gian",
  privacy: "Riêng tư",
  temperature: "Nhiệt độ",
  location: "Vị trí",
  other: "Khác",
} as const;

export function RoomProfileNoteForm({
  note,
  properties,
  rooms,
  physicalRooms,
}: {
  note?: RoomProfileNoteDto | null;
  properties: PropertyOption[];
  rooms: AdminRoomOption[];
  physicalRooms: PhysicalRoomOption[];
}) {
  const [scope, setScope] = useState<"room_type" | "physical_room">(
    note?.physical_room_id ? "physical_room" : "room_type",
  );
  const initialPhysical = physicalRooms.find((room) => room.id === note?.physical_room_id);
  const initialRoom = rooms.find((room) => room.id === note?.room_type_id);
  const [propertyId, setPropertyId] = useState(
    initialPhysical?.property_id ?? initialRoom?.property_id ?? properties[0]?.id ?? "",
  );
  const [roomTypeId, setRoomTypeId] = useState(note?.room_type_id ?? "");
  const [physicalRoomId, setPhysicalRoomId] = useState(note?.physical_room_id ?? "");
  const eligibleRooms = rooms.filter((room) => room.property_id === propertyId);
  const eligiblePhysicalRooms = physicalRooms.filter((room) => room.property_id === propertyId);

  function changeScope(nextScope: "room_type" | "physical_room") {
    setScope(nextScope);
    if (nextScope === "room_type") {
      setPhysicalRoomId("");
      setRoomTypeId(eligibleRooms[0]?.id ?? "");
    } else {
      setRoomTypeId("");
      setPhysicalRoomId(eligiblePhysicalRooms[0]?.id ?? "");
    }
  }

  function changeProperty(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    setRoomTypeId(rooms.find((room) => room.property_id === nextPropertyId)?.id ?? "");
    setPhysicalRoomId(physicalRooms.find((room) => room.property_id === nextPropertyId)?.id ?? "");
  }

  return (
    <form action={saveRoomProfileNoteAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={note?.id ?? ""} />
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Đối tượng áp dụng</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Ghi chú loại phòng không được trình bày như quan sát của một Room ID cụ thể và ngược lại.</p>
        </div>
        <Field label="Phạm vi" htmlFor="note_scope">
          <Select id="note_scope" value={scope} onChange={(event) => changeScope(event.target.value as "room_type" | "physical_room")}>
            <option value="room_type">Loại phòng</option>
            <option value="physical_room">Phòng cụ thể / Room ID</option>
          </Select>
        </Field>
        <Field label="Nơi lưu trú" htmlFor="note_property">
          <Select id="note_property" value={propertyId} onChange={(event) => changeProperty(event.target.value)} required>
            <option value="">Chọn nơi lưu trú</option>
            {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
          </Select>
        </Field>
        {scope === "room_type" ? (
          <>
            <input type="hidden" name="physical_room_id" value="" />
            <Field label="Loại phòng" htmlFor="room_type_id">
              <Select id="room_type_id" name="room_type_id" value={roomTypeId} onChange={(event) => setRoomTypeId(event.target.value)} required>
                <option value="">Chọn loại phòng</option>
                {eligibleRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </Select>
            </Field>
          </>
        ) : (
          <>
            <input type="hidden" name="room_type_id" value="" />
            <Field label="Phòng cụ thể" htmlFor="physical_room_id" hint="Hiển thị cả loại phòng để tránh chọn nhầm Room ID.">
              <Select id="physical_room_id" name="physical_room_id" value={physicalRoomId} onChange={(event) => setPhysicalRoomId(event.target.value)} required>
                <option value="">Chọn Room ID</option>
                {eligiblePhysicalRooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.room_code} · {rooms.find((item) => item.id === room.room_type_id)?.name ?? "Loại phòng"}</option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Loại ghi chú" htmlFor="note_type">
            <Select id="note_type" name="note_type" defaultValue={note?.note_type ?? "pro"}>
              {ROOM_PROFILE_NOTE_TYPES.map((value) => <option key={value} value={value}>{NOTE_TYPE_LABELS[value]}</option>)}
            </Select>
          </Field>
          <Field label="Nhóm thông tin" htmlFor="category">
            <Select id="category" name="category" defaultValue={note?.category ?? "other"}>
              {ROOM_PROFILE_NOTE_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
            </Select>
          </Field>
          <Field label="Thứ tự" htmlFor="sort_order"><Input id="sort_order" name="sort_order" type="number" min={0} max={10000} step={1} defaultValue={note?.sort_order ?? 0} required /></Field>
          <Field label="Công khai" htmlFor="is_public" hint="Tắt để giữ ghi chú trong Admin.">
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-4"><input id="is_public" name="is_public" type="checkbox" defaultChecked={note?.is_public ?? false} className="size-5 accent-pine" />Hiển thị trên hồ sơ phòng</label>
          </Field>
        </div>
        <Field label="Nội dung factual" htmlFor="text" hint="Không xúc phạm, cáo buộc chưa xác minh, so sánh đối thủ hoặc dùng ngôn ngữ marketing phóng đại.">
          <Textarea id="text" name="text" defaultValue={note?.text ?? ""} minLength={2} maxLength={500} required />
        </Field>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu ghi chú phòng" /></div></div>
    </form>
  );
}
