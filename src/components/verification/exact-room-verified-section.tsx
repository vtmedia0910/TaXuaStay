import { Eye, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PublicVerifiedPhysicalRoomDto } from "@/features/physical-rooms/types";

export function ExactRoomVerifiedSection({ rooms }: { rooms: PublicVerifiedPhysicalRoomDto[] }) {
  if (!rooms.length) return null;

  return (
    <section>
      <div className="mb-5">
        <h2 className="font-display text-3xl font-bold text-pine">Phòng cụ thể đã xác minh</h2>
        <p className="mt-2 max-w-3xl leading-7 text-muted">Mỗi mã dưới đây có hồ sơ xác minh còn hiệu lực và bằng chứng của chính phòng đó. Thông tin này không thay thế xác nhận tình trạng phòng khi đặt.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rooms.map((room) => (
          <Card key={room.physical_room_id} className="p-5">
            <div className="flex flex-wrap gap-2">
              <Badge className="text-success"><ShieldCheck size={14} className="mr-1" aria-hidden="true" />Room ID đã xác minh</Badge>
              {room.cloud_view_verified ? <Badge><Eye size={14} className="mr-1" aria-hidden="true" />Cloud View của đúng phòng</Badge> : null}
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-pine">{room.display_name ?? room.room_code}</h3>
            <p className="mt-1 text-sm font-bold text-copper-strong">Mã phòng: {room.room_code}</p>
            {room.floor_label || room.unit_label ? <p className="mt-2 text-sm text-muted">{[room.floor_label, room.unit_label].filter(Boolean).join(" · ")}</p> : null}
            {room.exact_room_bookable ? <p className="mt-3 text-sm leading-6 text-muted">Có thể gửi yêu cầu chọn đúng mã phòng; nơi lưu trú cần xác nhận khi đặt.</p> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
