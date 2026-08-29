"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveVerificationAction } from "@/features/verification/actions";
import {
  ROOM_QUALITY_FRESHNESS,
  ROOM_QUALITY_LABELS,
  ROOM_QUALITY_RUBRICS,
} from "@/features/room-profiles/policy";
import { ROOM_QUALITY_DIMENSIONS } from "@/features/room-profiles/types";
import {
  calculateCloudViewScore,
  calculateCloudViewTotal,
  CLOUD_COMPONENT_LIMITS,
  getCloudViewLabel,
  VERIFICATION_FRESHNESS_MONTHS,
  VERIFICATION_TYPE_LABELS,
} from "@/features/verification/policy";
import type { PropertyOption } from "@/features/properties/types";
import type { PhysicalRoomOption } from "@/features/physical-rooms/types";
import type {
  AdminRoomOption,
  AdminVerificationRecord,
  CloudViewComponents,
  VerificationEvidenceOption,
  VerificationType,
} from "@/features/verification/types";
import {
  ROAD_GRADES,
  ROAD_SURFACES,
  SUNRISE_ORIENTATIONS,
  VERIFICATION_STATUSES,
  VERIFICATION_TYPES,
  VIEW_DIRECTIONS,
  VIEW_FROM_BED_VALUES,
  VIEWING_POSITIONS,
} from "@/features/verification/types";
import { ACCESS_CERTAINTIES } from "@/features/properties/types";

function toVietnamLocalInput(value: string | null | undefined) {
  if (!value) return "";
  return new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

const componentFields: Array<{
  key: keyof CloudViewComponents;
  label: string;
  hint: string;
}> = [
  { key: "direct_valley_points", label: "A · Thấy trực tiếp thung lũng/lòng chảo mây", hint: "0 không thấy · 10 góc hẹp · 20 rõ · 30 rộng và trực diện" },
  { key: "view_width_points", label: "B · Độ rộng góc nhìn hữu dụng", hint: "0 bị chắn · 5 dưới 30° · 10 từ 30–60° · 15 từ 60–100° · 20 trên 100°" },
  { key: "obstruction_points", label: "C · Mức độ ít vật cản", hint: "0 bị chắn nhiều · 5 vật cản đáng kể · 10 ít vật cản · 15 gần như thoáng" },
  { key: "view_from_bed_points", label: "D · View từ giường", hint: "0 không · 5 cần đứng/di chuyển · 10 thấy tự nhiên · 15 trực diện từ vị trí nghỉ" },
  { key: "private_position_points", label: "E · Vị trí ngắm riêng tư", hint: "0 khu chung · 5 cửa sổ/bán riêng tư · 10 ban công, sân hiên hoặc cửa sổ riêng tốt" },
  { key: "orientation_points", label: "F · Hướng đón bình minh", hint: "0 không phù hợp/chưa biết · 3 một phần · 5 phù hợp rõ" },
  { key: "evidence_points", label: "G · Chất lượng và độ mới bằng chứng", hint: "0 thiếu/cũ · 2 ảnh thường gần đây · 5 evidence gần đây có metadata hoặc panorama" },
];

function initialComponents(record?: AdminVerificationRecord | null): CloudViewComponents {
  return {
    direct_valley_points: record?.cloud_view?.direct_valley_points ?? 0,
    view_width_points: record?.cloud_view?.view_width_points ?? 0,
    obstruction_points: record?.cloud_view?.obstruction_points ?? 0,
    view_from_bed_points: record?.cloud_view?.view_from_bed_points ?? 0,
    private_position_points: record?.cloud_view?.private_position_points ?? 0,
    orientation_points: record?.cloud_view?.orientation_points ?? 0,
    evidence_points: record?.cloud_view?.evidence_points ?? 0,
  };
}

function isPropertyVerification(type: VerificationType) {
  return ["property_identity", "property_location", "road_access"].includes(type);
}

export function VerificationForm({
  record,
  initialType,
  properties,
  rooms,
  physicalRooms,
  evidence,
}: {
  record?: AdminVerificationRecord | null;
  initialType?: VerificationType;
  properties: PropertyOption[];
  rooms: AdminRoomOption[];
  physicalRooms: PhysicalRoomOption[];
  evidence: VerificationEvidenceOption[];
}) {
  const [type, setType] = useState<VerificationType>(record?.verification_type ?? initialType ?? "property_identity");
  const [status, setStatus] = useState(record?.status ?? "pending");
  const [propertyId, setPropertyId] = useState(record?.property_id ?? "");
  const [roomTypeId, setRoomTypeId] = useState(record?.room_type_id ?? "");
  const [physicalRoomId, setPhysicalRoomId] = useState(record?.physical_room_id ?? "");
  const [roomScope, setRoomScope] = useState<"room_type" | "physical_room">(
    record?.physical_room_id ? "physical_room" : "room_type",
  );
  const initialPhysicalRoom = physicalRooms.find((room) => room.id === record?.physical_room_id);
  const [physicalPropertyId, setPhysicalPropertyId] = useState(
    initialPhysicalRoom?.property_id ?? properties[0]?.id ?? "",
  );
  const [components, setComponents] = useState(() => initialComponents(record));
  const previouslyCurrent = record?.resolved_state === "current";
  const initiallyStartsFreshCycle = record?.status === "verified" && !previouslyCurrent;
  const originalVerifiedAt = toVietnamLocalInput(record?.verified_at);
  const originalExpiresAt = toVietnamLocalInput(record?.expires_at);
  const [verifiedAt, setVerifiedAt] = useState(initiallyStartsFreshCycle ? "" : originalVerifiedAt);
  const [expiresAt, setExpiresAt] = useState(initiallyStartsFreshCycle ? "" : originalExpiresAt);
  const [useCustomDates, setUseCustomDates] = useState(false);
  const existingEvidence = new Set(record?.evidence_ids ?? []);
  const propertyMap = new Map(properties.map((property) => [property.id, property.name]));
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const editing = Boolean(record);
  const propertyTarget = isPropertyVerification(type);
  const startsFreshCycle = status === "verified" && !previouslyCurrent;
  const eligiblePhysicalRooms = physicalRooms.filter((room) => room.property_id === physicalPropertyId);

  function changeRoomScope(nextScope: "room_type" | "physical_room") {
    setRoomScope(nextScope);
    if (nextScope === "room_type") setPhysicalRoomId("");
    else setRoomTypeId("");
  }

  function changePhysicalProperty(nextPropertyId: string) {
    setPhysicalPropertyId(nextPropertyId);
    setPhysicalRoomId(physicalRooms.find((room) => room.property_id === nextPropertyId)?.id ?? "");
  }

  function changeStatus(nextStatus: AdminVerificationRecord["status"]) {
    setStatus(nextStatus);
    setUseCustomDates(false);
    if (nextStatus === "verified" && !previouslyCurrent) {
      setVerifiedAt("");
      setExpiresAt("");
    } else if (!previouslyCurrent) {
      setVerifiedAt(originalVerifiedAt);
      setExpiresAt(originalExpiresAt);
    }
  }

  const eligibleEvidence = useMemo(() => evidence.filter((asset) => {
    if (propertyTarget) {
      if (!propertyId || asset.property_id !== propertyId || asset.room_type_id || asset.physical_room_id) return false;
    } else if (roomScope === "physical_room") {
      if (!physicalRoomId || asset.physical_room_id !== physicalRoomId || asset.property_id || asset.room_type_id) return false;
    } else {
      if (!roomTypeId || asset.room_type_id !== roomTypeId || asset.property_id || asset.physical_room_id) return false;
    }
    if (type === "cloud_view") return ["view_from_room", "view_from_bed", "balcony", "sunrise", "verification"].includes(asset.evidence_type);
    if (type === "road_access") return ["road_access", "parking", "verification"].includes(asset.evidence_type);
    if (type === "room_quality") return ["room", "bathroom", "view_from_room", "view_from_bed", "balcony", "verification"].includes(asset.evidence_type);
    if (type === "media_360") return asset.media_type === "panorama_360";
    return true;
  }), [evidence, physicalRoomId, propertyId, propertyTarget, roomScope, roomTypeId, type]);

  const scorePreview = useMemo(() => {
    try {
      return {
        total: calculateCloudViewTotal(components),
        score: calculateCloudViewScore(components),
      };
    } catch {
      return null;
    }
  }, [components]);

  return (
    <form action={saveVerificationAction} className="grid gap-5 pb-24">
      <input type="hidden" name="id" value={record?.id ?? ""} />
      {editing ? <input type="hidden" name="verification_type" value={type} /> : null}
      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Loại và đối tượng xác minh</h2>
          <p className="mt-1 text-sm text-muted">Loại và target không thể đổi sau khi tạo để bảo toàn lịch sử.</p>
        </div>
        <Field label="Loại xác minh" htmlFor="verification_type">
          <Select
            id="verification_type"
            name={editing ? undefined : "verification_type"}
            value={type}
            disabled={editing}
            onChange={(event) => setType(event.target.value as VerificationType)}
          >
            {VERIFICATION_TYPES.map((value) => <option key={value} value={value}>{VERIFICATION_TYPE_LABELS[value]}</option>)}
          </Select>
        </Field>
        {propertyTarget ? (
          <>
            {editing ? <input type="hidden" name="property_id" value={propertyId} /> : null}
            <input type="hidden" name="room_type_id" value="" />
            <input type="hidden" name="physical_room_id" value="" />
            <Field label="Nơi lưu trú" htmlFor="property_id">
              <Select id="property_id" name={editing ? undefined : "property_id"} value={propertyId} disabled={editing} onChange={(event) => setPropertyId(event.target.value)} required>
                <option value="">Chọn nơi lưu trú</option>
                {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
              </Select>
            </Field>
          </>
        ) : (
          <>
            <input type="hidden" name="property_id" value="" />
            {editing ? <input type="hidden" name="room_type_id" value={roomTypeId} /> : null}
            {editing ? <input type="hidden" name="physical_room_id" value={physicalRoomId} /> : null}
            <Field label="Phạm vi phòng" htmlFor="room_scope" hint="Loại phòng là nhóm gộp; phòng cụ thể chỉ áp dụng cho đúng Room ID.">
              <Select id="room_scope" value={roomScope} disabled={editing} onChange={(event) => changeRoomScope(event.target.value as "room_type" | "physical_room")}>
                <option value="room_type">Loại phòng</option>
                <option value="physical_room">Phòng cụ thể / Room ID</option>
              </Select>
            </Field>
            {roomScope === "room_type" ? (
              <Field label="Loại phòng" htmlFor="room_type_id">
                <Select id="room_type_id" name={editing ? undefined : "room_type_id"} value={roomTypeId} disabled={editing} onChange={(event) => setRoomTypeId(event.target.value)} required>
                  <option value="">Chọn loại phòng</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{propertyMap.get(room.property_id) ?? "Nơi lưu trú"} · {room.name}</option>)}
                </Select>
              </Field>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nơi lưu trú (lọc Room ID)" htmlFor="physical_property_filter">
                  <Select id="physical_property_filter" value={physicalPropertyId} disabled={editing} onChange={(event) => changePhysicalProperty(event.target.value)}>
                    <option value="">Chọn nơi lưu trú</option>
                    {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
                  </Select>
                </Field>
                <Field label="Phòng cụ thể" htmlFor="physical_room_id">
                  <Select id="physical_room_id" name={editing ? undefined : "physical_room_id"} value={physicalRoomId} disabled={editing} onChange={(event) => setPhysicalRoomId(event.target.value)} required>
                    <option value="">Chọn Room ID</option>
                    {eligiblePhysicalRooms.map((room) => <option key={room.id} value={room.id}>{room.room_code} · {roomMap.get(room.room_type_id)?.name ?? "Loại phòng"}{room.display_name ? ` · ${room.display_name}` : ""}</option>)}
                  </Select>
                </Field>
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="font-display text-xl font-bold text-pine">Lifecycle và audit</h2>
          <p className="mt-1 text-sm text-muted">Thời hạn mặc định: {VERIFICATION_FRESHNESS_MONTHS[type]} tháng. Để trống ngày hết hạn khi xác minh mới để DB áp dụng chính sách này.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Trạng thái" htmlFor="status">
            <Select id="status" name="status" value={status} onChange={(event) => changeStatus(event.target.value as AdminVerificationRecord["status"])}>
              {VERIFICATION_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Phương pháp" htmlFor="method">
            <Input id="method" name="method" defaultValue={record?.method ?? "Kiểm tra trực tiếp"} maxLength={200} required />
          </Field>
          <Field label="Xác minh lúc" htmlFor="verified_at" hint={startsFreshCycle ? "Mặc định hệ thống ghi thời điểm lưu hiện tại." : "Múi giờ Việt Nam; không được chọn thời điểm tương lai."}>
            <Input id="verified_at" name="verified_at" type="datetime-local" value={verifiedAt} disabled={startsFreshCycle && !useCustomDates} required={startsFreshCycle && useCustomDates} onChange={(event) => setVerifiedAt(event.target.value)} />
          </Field>
          <Field label="Hết hạn lúc" htmlFor="expires_at" hint={startsFreshCycle ? `Mặc định là ${VERIFICATION_FRESHNESS_MONTHS[type]} tháng từ lần xác minh mới.` : "Có thể điều chỉnh khi có lý do nghiệp vụ; phải còn ở tương lai khi lưu verified."}>
            <Input id="expires_at" name="expires_at" type="datetime-local" value={expiresAt} disabled={startsFreshCycle && !useCustomDates} required={startsFreshCycle && useCustomDates} onChange={(event) => setExpiresAt(event.target.value)} />
          </Field>
        </div>
        {startsFreshCycle ? (
          <div className="grid gap-3 rounded-2xl bg-pine-soft p-4 text-sm text-pine">
            <p className="font-bold">Chu kỳ xác minh mới</p>
            <p className="leading-6 text-muted">Khi lưu, hệ thống mặc định lấy thời điểm hiện tại và tạo hạn mới theo chính sách {VERIFICATION_FRESHNESS_MONTHS[type]} tháng. Ngày của chu kỳ cũ không được tự động giữ lại.</p>
            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
              <input name="use_custom_verification_dates" type="checkbox" checked={useCustomDates} onChange={(event) => setUseCustomDates(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-pine" />
              <span><span className="font-bold">Dùng ngày tùy chỉnh</span><span className="mt-1 block leading-5 text-muted">Chỉ bật khi chủ động ghi nhận một lần kiểm tra đã diễn ra trước đây; cần nhập cả ngày xác minh hợp lệ và hạn còn ở tương lai.</span></span>
            </label>
          </div>
        ) : null}
        <Field label="Ghi chú nội bộ" htmlFor="notes" hint="Không được trả về public DTO.">
          <Textarea id="notes" name="notes" defaultValue={record?.notes ?? ""} maxLength={5000} />
        </Field>
      </Card>

      {type === "cloud_view" ? (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 className="font-display text-xl font-bold text-pine">Cloud View · điểm thành phần</h2><p className="mt-1 text-sm text-muted">Chỉ nhập số nguyên trong khoảng; không có ô nhập điểm cuối.</p></div>
            <div className="rounded-2xl bg-pine px-5 py-3 text-white"><p className="text-sm text-white/70">Tự động tính</p>{scorePreview ? <><p className="font-display text-2xl font-bold">{scorePreview.total}/100 · {scorePreview.score.toFixed(1)}/10</p><p className="text-sm font-bold text-copper">{getCloudViewLabel(scorePreview.score)}</p></> : <p className="font-bold text-copper">Có thành phần ngoài khoảng cho phép</p>}</div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {componentFields.map(({ key, label, hint }) => (
              <Field key={key} label={label} htmlFor={key} hint={hint}>
                <Input id={key} name={key} type="number" min={0} max={CLOUD_COMPONENT_LIMITS[key]} step={1} value={components[key]} onChange={(event) => setComponents((current) => ({ ...current, [key]: Number(event.target.value) }))} required />
              </Field>
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Ngắm từ giường" htmlFor="view_from_bed"><Select id="view_from_bed" name="view_from_bed" defaultValue={record?.cloud_view?.view_from_bed ?? "no"}>{VIEW_FROM_BED_VALUES.map((value) => <option key={value}>{value}</option>)}</Select></Field>
            <Field label="Vị trí ngắm" htmlFor="viewing_position"><Select id="viewing_position" name="viewing_position" defaultValue={record?.cloud_view?.viewing_position ?? "none"}>{VIEWING_POSITIONS.map((value) => <option key={value}>{value}</option>)}</Select></Field>
            <Field label="Hướng" htmlFor="view_direction"><Select id="view_direction" name="view_direction" defaultValue={record?.cloud_view?.view_direction ?? "unknown"}>{VIEW_DIRECTIONS.map((value) => <option key={value}>{value}</option>)}</Select></Field>
            <Field label="Góc nhìn ngang (độ)" htmlFor="horizontal_view_angle_deg"><Input id="horizontal_view_angle_deg" name="horizontal_view_angle_deg" type="number" min={0} max={360} step="0.01" defaultValue={record?.cloud_view?.horizontal_view_angle_deg ?? ""} /></Field>
            <Field label="Hướng bình minh" htmlFor="sunrise_orientation"><Select id="sunrise_orientation" name="sunrise_orientation" defaultValue={record?.cloud_view?.sunrise_orientation ?? "unknown"}>{SUNRISE_ORIENTATIONS.map((value) => <option key={value}>{value}</option>)}</Select></Field>
          </div>
          <Field label="Ghi chú vật cản công khai" htmlFor="obstruction_notes"><Textarea id="obstruction_notes" name="obstruction_notes" defaultValue={record?.cloud_view?.obstruction_notes ?? ""} maxLength={2000} /></Field>
          <Field label="Ghi chú Cloud View công khai" htmlFor="cloud_view_notes"><Textarea id="cloud_view_notes" name="cloud_view_notes" defaultValue={record?.cloud_view?.cloud_view_notes ?? ""} maxLength={3000} /></Field>
        </Card>
      ) : null}

      {type === "road_access" ? (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div><h2 className="font-display text-xl font-bold text-pine">Road Verified</h2><p className="mt-1 text-sm text-muted">Hồ sơ còn hiệu lực được ưu tiên khi hiển thị công khai. Dữ liệu tiếp cận sơ bộ được giữ nguyên để làm nguồn dự phòng sau khi xác minh hết hạn.</p></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Grade" htmlFor="grade"><Select id="grade" name="grade" defaultValue={record?.road?.grade ?? "b"}>{ROAD_GRADES.map((value) => <option key={value}>{value.toUpperCase()}</option>)}</Select></Field>
            {(["car_access", "motorbike_access", "sedan_access", "parking"] as const).map((field) => <Field key={field} label={field.replaceAll("_", " ")} htmlFor={field}><Select id={field} name={field} defaultValue={record?.road?.[field] ?? "unknown"}>{ACCESS_CERTAINTIES.map((value) => <option key={value}>{value}</option>)}</Select></Field>)}
            <Field label="Mặt đường" htmlFor="road_surface"><Select id="road_surface" name="road_surface" defaultValue={record?.road?.road_surface ?? "unknown"}>{ROAD_SURFACES.map((value) => <option key={value}>{value}</option>)}</Select></Field>
            <Field label="Đi bộ từ chỗ đỗ (m)" htmlFor="walk_from_parking_m"><Input id="walk_from_parking_m" name="walk_from_parking_m" type="number" min={0} step={1} defaultValue={record?.road?.walk_from_parking_m ?? ""} /></Field>
          </div>
          <Field label="Độ dốc" htmlFor="steepness_notes"><Textarea id="steepness_notes" name="steepness_notes" defaultValue={record?.road?.steepness_notes ?? ""} maxLength={2000} /></Field>
          <Field label="Đoạn hẹp/khó nhất" htmlFor="narrow_section_notes"><Textarea id="narrow_section_notes" name="narrow_section_notes" defaultValue={record?.road?.narrow_section_notes ?? ""} maxLength={2000} /></Field>
          <Field label="Rủi ro khi mưa" htmlFor="rain_risk_notes"><Textarea id="rain_risk_notes" name="rain_risk_notes" defaultValue={record?.road?.rain_risk_notes ?? ""} maxLength={2000} /></Field>
          <Field label="Vị trí đỗ xe" htmlFor="parking_location"><Input id="parking_location" name="parking_location" defaultValue={record?.road?.parking_location ?? ""} maxLength={1000} /></Field>
          <Field label="Ghi chú đường công khai" htmlFor="road_notes"><Textarea id="road_notes" name="road_notes" defaultValue={record?.road?.notes ?? ""} maxLength={3000} /></Field>
        </Card>
      ) : null}

      {type === "room_quality" ? (
        <Card className="grid gap-5 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-bold text-pine">Room Quality · từng chiều độc lập</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Nhập số nguyên 0–100; hệ thống hiển thị tương ứng trên thang 10. Để trống chiều chưa quan sát, không nhập 0 thay cho chưa biết. Không có điểm tổng.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {ROOM_QUALITY_DIMENSIONS.map((dimension) => {
              const field = `${dimension}_score` as const;
              return (
                <Field
                  key={dimension}
                  label={ROOM_QUALITY_LABELS[dimension]}
                  htmlFor={field}
                  hint={`${ROOM_QUALITY_RUBRICS[dimension]} Độ mới: ${ROOM_QUALITY_FRESHNESS[dimension].label}.`}
                >
                  <Input
                    id={field}
                    name={field}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    defaultValue={record?.room_quality?.[field] ?? ""}
                    placeholder="Chưa xác minh"
                  />
                </Field>
              );
            })}
          </div>
          <Field label="Ghi chú chất lượng công khai" htmlFor="quality_notes_public" hint="Quan sát ngắn, factual; không dùng ngôn ngữ quảng cáo hoặc so sánh đối thủ.">
            <Textarea id="quality_notes_public" name="quality_notes_public" defaultValue={record?.room_quality?.notes_public ?? ""} maxLength={3000} />
          </Field>
          <Field label="Ghi chú đánh giá nội bộ" htmlFor="quality_notes_internal" hint="Không nằm trong public DTO.">
            <Textarea id="quality_notes_internal" name="quality_notes_internal" defaultValue={record?.room_quality?.notes_internal ?? ""} maxLength={5000} />
          </Field>
          <p className="rounded-2xl bg-mist p-4 text-sm leading-6 text-muted"><strong className="text-ink">Room Accuracy:</strong> so sánh phòng thực tế với diện tích, cấu hình giường, loại phòng tắm, ban công/cửa sổ/view, nội thất, bố cục và ảnh đã công bố. Không đo mức hài lòng, giá hoặc Cloud View.</p>
        </Card>
      ) : null}

      <Card className="grid gap-4 p-5 sm:p-6">
        <div><h2 className="font-display text-xl font-bold text-pine">Bằng chứng đúng target</h2><p className="mt-1 text-sm text-muted">Chỉ media gắn chính xác target và phù hợp loại xác minh mới xuất hiện. Exact-room không dùng media của property, loại phòng hoặc Room ID khác. Media chưa duyệt có thể lưu cho pending/review nhưng không thể tạo badge public.</p></div>
        {eligibleEvidence.map((asset) => (
          <div key={asset.id} className="flex min-h-12 items-start gap-3 rounded-2xl border border-line p-3">
            <input id={`evidence-${asset.id}`} type="checkbox" name="evidence_ids" value={asset.id} defaultChecked={existingEvidence.has(asset.id)} className="mt-1 size-5 accent-pine" />
            <div className="min-w-0 flex-1"><label htmlFor={`evidence-${asset.id}`} className="font-bold text-ink">{asset.alt_text}</label><span className="mt-1 flex flex-wrap gap-2 text-xs text-muted"><Badge>{asset.media_type}</Badge><Badge>{asset.evidence_type}</Badge><Badge className={asset.is_verified ? "text-success" : "bg-copper/10 text-copper-strong"}>{asset.is_verified ? "Đã duyệt public" : "Chưa duyệt"}</Badge></span><a href={asset.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-9 items-center text-sm font-bold text-copper-strong hover:text-pine">Mở bằng chứng ↗</a></div>
          </div>
        ))}
        {!eligibleEvidence.length ? <p className="rounded-2xl bg-mist p-4 text-sm text-muted">Chưa có media phù hợp với target này. Hãy tạo/duyệt media đúng phòng hoặc nơi lưu trú trước khi chuyển sang verified.</p> : null}
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64"><div className="mx-auto flex max-w-5xl justify-end"><SubmitButton label="Lưu xác minh" /></div></div>
    </form>
  );
}
