import Link from "next/link";
import { ImageOff, Pencil, Plus, Sparkles, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRooms } from "@/features/rooms/data";

export default async function AdminRoomsPage({ searchParams }: { searchParams: Promise<{ property?: string; saved?: string; error?: string }> }) {
  const params = await searchParams;
  const properties = await getAdminPropertyOptions();
  const rooms = await getAdminRooms(properties);
  const filtered = params.property ? rooms.filter((room) => room.property_id === params.property) : rooms;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AdminPageHeader title="Phòng" description="Room type là đơn vị phòng vật lý; quantity chưa phải availability theo ngày." action={<Link href="/admin/rooms/new" className={buttonVariants()}><Plus size={18} aria-hidden="true" />Thêm loại phòng</Link>} />
      <FormFeedback saved={params.saved} error={params.error} />
      <form className="mb-5 flex flex-wrap items-end gap-3" method="get">
        <label className="grid min-w-64 gap-2 text-sm font-bold">Lọc theo nơi lưu trú<Select name="property" defaultValue={params.property ?? ""}><option value="">Tất cả</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</Select></label>
        <button className={buttonVariants({ variant: "secondary" })}>Lọc</button>
      </form>
      <div className="grid gap-4">
        {filtered.map((room) => (
          <Card key={room.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2"><Badge>{room.property_name}</Badge><Badge className={room.publish_status === "published" ? "text-success" : "bg-copper/10 text-copper-strong"}>{room.publish_status}</Badge></div>
                <h2 className="mt-3 font-display text-2xl font-bold text-pine">{room.name}</h2>
                <p className="mt-2 text-sm text-muted">Quantity {room.quantity} · tối đa {room.max_guests} khách · {room.bathroom_type}</p>
              </div>
              <Link href={`/admin/rooms/${room.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}><Pencil size={16} aria-hidden="true" />Sửa</Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {room.media_count === 0 ? <Badge className="bg-red-50 text-danger"><ImageOff size={14} className="mr-1" />Thiếu media</Badge> : null}
              {room.amenity_count === 0 ? <Badge className="bg-red-50 text-danger"><Sparkles size={14} className="mr-1" />Chưa có amenity</Badge> : null}
              {room.max_guests < 1 ? <Badge className="bg-red-50 text-danger"><Users size={14} className="mr-1" />Thiếu sức chứa</Badge> : null}
              {room.media_count > 0 && room.amenity_count > 0 ? <span className="text-sm font-bold text-success">✓ Dữ liệu nền tảng đã đủ</span> : null}
            </div>
          </Card>
        ))}
        {!filtered.length ? <Card className="p-6 text-center text-sm text-muted">Chưa có loại phòng phù hợp bộ lọc.</Card> : null}
      </div>
    </main>
  );
}
