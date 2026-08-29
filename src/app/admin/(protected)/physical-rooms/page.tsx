import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminPhysicalRooms } from "@/features/physical-rooms/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function AdminPhysicalRoomsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [properties, rooms, params] = await Promise.all([getAdminPropertyOptions(), getAdminRoomOptions(), searchParams]);
  const physicalRooms = await getAdminPhysicalRooms(properties, rooms);
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Phòng cụ thể / Room ID" description="Danh tính phòng thật nằm dưới loại phòng; không thay thế giá hoặc tồn kho gộp theo loại phòng." action={<Link href="/admin/physical-rooms/new" className={buttonVariants()}><Plus size={18} />Thêm phòng cụ thể</Link>} />
      <FormFeedback saved={params.saved} error={params.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {physicalRooms.map((room) => (
          <Card key={room.id} className="p-5">
            <div className="flex flex-wrap gap-2"><Badge>{room.room_code}</Badge><Badge className={room.publish_status === "published" ? "text-success" : "bg-copper/10 text-copper-strong"}>{room.publish_status}</Badge>{room.exact_room_bookable ? <Badge>Có thể nhận yêu cầu đúng mã</Badge> : null}</div>
            <h2 className="mt-4 font-bold text-pine">{room.display_name ?? room.room_code}</h2>
            <p className="mt-1 text-sm text-muted">{room.property_name} · {room.room_type_name}</p>
            <p className="mt-2 text-xs text-muted">{room.media_count} media exact-room · {room.verification_count} hồ sơ xác minh</p>
            <Link href={`/admin/physical-rooms/${room.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4" })}><Pencil size={16} />Sửa</Link>
          </Card>
        ))}
        {!physicalRooms.length ? <Card className="p-6 text-center text-sm text-muted sm:col-span-2">Chưa có phòng cụ thể. Hệ thống không tạo Room ID giả từ quantity.</Card> : null}
      </div>
    </main>
  );
}
