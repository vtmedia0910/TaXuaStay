import Link from "next/link";
import { Pencil, Plus, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminPhysicalRoomOptions } from "@/features/physical-rooms/data";
import { getAdminPropertyOptions } from "@/features/properties/data";
import { getAdminRoomProfileNotes } from "@/features/room-profiles/data";
import { getAdminRoomOptions } from "@/features/rooms/data";

export default async function AdminRoomProfilesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [properties, rooms, physicalRooms, params] = await Promise.all([
    getAdminPropertyOptions(),
    getAdminRoomOptions(),
    getAdminPhysicalRoomOptions(),
    searchParams,
  ]);
  const notes = await getAdminRoomProfileNotes(properties, rooms, physicalRooms);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Hồ sơ phòng"
        description="Quản lý đánh giá chất lượng theo lifecycle xác minh và các điểm mạnh/điểm cần lưu ý factual."
        action={<div className="flex flex-wrap gap-2"><Link href="/admin/verification/new?type=room_quality" className={buttonVariants()}><ShieldCheck size={18} />Tạo Room Quality</Link><Link href="/admin/room-profiles/notes/new" className={buttonVariants({ variant: "secondary" })}><Plus size={18} />Thêm ghi chú</Link></div>}
      />
      <FormFeedback saved={params.saved} error={params.error} />
      <div className="mb-6 rounded-3xl border border-line bg-mist p-5 text-sm leading-6 text-muted"><strong className="text-pine">Nguyên tắc:</strong> Cloud View chỉ đo chất lượng vị trí nhìn. Room Quality không có điểm tổng. Điểm và ghi chú không phụ thuộc partner tier, tài trợ, hoa hồng hoặc quan hệ thương mại.</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {notes.map((note) => (
          <Card key={note.id} className="p-5">
            <div className="flex flex-wrap gap-2"><Badge>{note.note_type === "pro" ? "Điểm mạnh" : "Điểm cần lưu ý"}</Badge><Badge>{note.category}</Badge><Badge className={note.is_public ? "text-success" : "bg-copper/10 text-copper-strong"}>{note.is_public ? "Công khai" : "Nội bộ"}</Badge></div>
            <h2 className="mt-4 font-bold text-pine">{note.target_name}</h2>
            <p className="mt-1 text-sm text-muted">{note.property_name}</p>
            <p className="mt-3 leading-7 text-ink">{note.text}</p>
            <Link href={`/admin/room-profiles/notes/${note.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4" })}><Pencil size={16} />Chỉnh sửa</Link>
          </Card>
        ))}
        {!notes.length ? <Card className="p-6 text-center text-sm text-muted sm:col-span-2">Chưa có điểm mạnh hoặc điểm cần lưu ý. Không có dữ liệu mẫu được đưa lên production.</Card> : null}
      </div>
    </main>
  );
}
