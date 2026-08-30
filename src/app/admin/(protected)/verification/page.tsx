import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminPhysicalRoomOptions } from "@/features/physical-rooms/data";
import { getAdminRoomOptions } from "@/features/rooms/data";
import { isVerificationExpiringSoon, VERIFICATION_STATE_LABELS, VERIFICATION_TYPE_LABELS } from "@/features/verification/policy";
import { getAdminVerificationRecords } from "@/features/verification/data";
import { VERIFICATION_STATUSES } from "@/features/verification/types";

type Params = { saved?: string; error?: string; status?: string; property_id?: string; room_type_id?: string; physical_room_id?: string };

export default async function AdminVerificationPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [properties, rooms, physicalRooms, params] = await Promise.all([getAdminPropertyOptions(), getAdminRoomOptions(), getAdminPhysicalRoomOptions(), searchParams]);
  const records = await getAdminVerificationRecords(properties, rooms, physicalRooms);
  const filtered = records.filter((record) => {
    if (params.status === "current" && record.resolved_state !== "current") return false;
    if (params.status === "expired" && record.resolved_state !== "expired") return false;
    if (params.status === "not_yet_valid" && record.resolved_state !== "not_yet_valid") return false;
    if (params.status && !["current", "expired", "not_yet_valid"].includes(params.status) && record.status !== params.status) return false;
    if (params.property_id && record.property_id !== params.property_id && !rooms.some((room) => room.id === record.room_type_id && room.property_id === params.property_id)) return false;
    if (params.room_type_id && record.room_type_id !== params.room_type_id) return false;
    if (params.physical_room_id && record.physical_room_id !== params.physical_room_id) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Verification" description="Lifecycle, bằng chứng và độ mới cho tiêu chuẩn thẩm định Tà Xùa Trip." action={<Link href="/admin/verification/new" className={buttonVariants()}><Plus size={18} />Tạo xác minh</Link>} />
      <FormFeedback saved={params.saved} error={params.error} />
      <form className="mb-6 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-5" method="get">
        <Select name="status" defaultValue={params.status ?? ""}><option value="">Tất cả trạng thái</option><option value="current">Còn hiệu lực</option><option value="not_yet_valid">Ngày xác minh chưa có hiệu lực</option><option value="expired">Đã hết hạn</option>{VERIFICATION_STATUSES.filter((value) => !["verified", "expired"].includes(value)).map((value) => <option key={value}>{value}</option>)}</Select>
        <Select name="property_id" defaultValue={params.property_id ?? ""}><option value="">Tất cả nơi lưu trú</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select>
        <Select name="room_type_id" defaultValue={params.room_type_id ?? ""}><option value="">Tất cả loại phòng</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</Select>
        <Select name="physical_room_id" defaultValue={params.physical_room_id ?? ""}><option value="">Tất cả Room ID</option>{physicalRooms.map((room) => <option key={room.id} value={room.id}>{room.room_code}</option>)}</Select>
        <button className={buttonVariants({ variant: "secondary" })} type="submit">Lọc</button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((record) => (
          <Card key={record.id} className="p-5">
            <div className="flex flex-wrap gap-2"><Badge>{VERIFICATION_TYPE_LABELS[record.verification_type]}</Badge><Badge className={record.resolved_state === "current" ? "text-success" : "bg-copper/10 text-copper-strong"}>{VERIFICATION_STATE_LABELS[record.resolved_state]}</Badge>{record.resolved_state === "current" && isVerificationExpiringSoon(record.expires_at) ? <Badge className="bg-copper/10 text-copper-strong">Sắp hết hạn</Badge> : null}</div>
            <h2 className="mt-4 font-bold text-pine">{record.target_name}</h2>
            {record.property_name && record.property_name !== record.target_name ? <p className="mt-1 text-sm text-muted">{record.property_name}</p> : null}
            <p className="mt-3 text-sm text-muted">Xác minh: {record.verified_at ? new Date(record.verified_at).toLocaleDateString("vi-VN") : "Chưa có"} · Hết hạn: {record.expires_at ? new Date(record.expires_at).toLocaleDateString("vi-VN") : "Chưa có"}</p>
            <Link href={`/admin/verification/${record.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4" })}><Pencil size={16} />Mở hồ sơ</Link>
          </Card>
        ))}
        {!filtered.length ? <Card className="p-6 text-center text-sm text-muted sm:col-span-2">Chưa có hồ sơ phù hợp. Không tự động xác minh dữ liệu cũ.</Card> : null}
      </div>
    </main>
  );
}
