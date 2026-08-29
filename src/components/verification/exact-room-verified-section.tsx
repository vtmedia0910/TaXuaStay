import { CalendarCheck, Eye, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VerificationEvidenceAsset } from "@/components/verification/room-verified-section";
import { RoomProfileNotes } from "@/components/verification/room-profile-notes";
import { RoomQualityPanel } from "@/components/verification/room-quality-panel";
import { getCloudViewLabel } from "@/features/verification/policy";
import type { ExactRoomProfileDto } from "@/features/room-profiles/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function ExactRoomVerifiedSection({ rooms }: { rooms: ExactRoomProfileDto[] }) {
  if (!rooms.length) return null;

  return (
    <section>
      <div className="mb-5">
        <h2 className="font-display text-3xl font-bold text-pine">Phòng cụ thể đã xác minh</h2>
        <p className="mt-2 max-w-3xl leading-7 text-muted">Mỗi mã dưới đây có hồ sơ xác minh còn hiệu lực và bằng chứng của chính phòng đó. Thông tin này không thay thế xác nhận tình trạng phòng khi đặt.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rooms.map((profile) => {
          const { room } = profile;
          const panorama = profile.evidence.filter((asset) => asset.media_type === "panorama_360");
          const viewEvidence = profile.evidence.filter((asset) => asset.media_type !== "panorama_360");
          const uniqueEvidence = [...new Map([...viewEvidence, ...panorama].map((asset) => [asset.media_asset_id, asset])).values()];
          return (
          <Card key={room.physical_room_id} className="p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge className="text-success"><ShieldCheck size={14} className="mr-1" aria-hidden="true" />Đã xác minh phòng cụ thể</Badge>
              {profile.cloudView ? <Badge><Eye size={14} className="mr-1" aria-hidden="true" />Cloud View của đúng phòng</Badge> : null}
              {profile.quality ? <Badge>Room Quality đã kiểm tra</Badge> : null}
            </div>
            <h3 className="mt-4 font-display text-xl font-bold text-pine">{room.display_name ?? room.room_code}</h3>
            <p className="mt-1 text-sm font-bold text-copper-strong">Mã phòng: {room.room_code}</p>
            {room.floor_label || room.unit_label ? <p className="mt-2 text-sm text-muted">{[room.floor_label, room.unit_label].filter(Boolean).join(" · ")}</p> : null}
            <p className="mt-3 flex items-center gap-2 text-sm text-muted"><CalendarCheck size={16} aria-hidden="true" />Xác minh {formatDate(room.verified_at)} · kiểm tra lại trước {formatDate(room.expires_at)}</p>
            {room.exact_room_bookable ? <p className="mt-3 text-sm leading-6 text-muted">Có thể gửi yêu cầu chọn đúng mã phòng; nơi lưu trú cần xác nhận khi đặt.</p> : null}
            {profile.cloudView ? <div className="mt-5 rounded-3xl bg-pine p-4 text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-copper">Cloud View của phòng {room.room_code}</p><p className="mt-2 font-display text-3xl font-bold">{Number(profile.cloudView.score_10).toFixed(1)} / 10</p><p className="mt-1 text-sm text-white/70">{getCloudViewLabel(Number(profile.cloudView.score_10))} · tách biệt với chất lượng phòng</p></div> : null}
            <div className="mt-5"><RoomQualityPanel assessment={profile.quality} scopeLabel={`Phòng cụ thể ${room.room_code}`} compact /></div>
            <div className="mt-5"><RoomProfileNotes notes={profile.notes} /></div>
            {uniqueEvidence.length ? <div className="mt-6"><h4 className="font-display text-lg font-bold text-pine">View Thật và bằng chứng của phòng {room.room_code}</h4><div className="mt-3 grid gap-4">{uniqueEvidence.map((asset) => <VerificationEvidenceAsset key={asset.media_asset_id} asset={asset} positionLabel={asset.media_type === "panorama_360" ? `360° phòng cụ thể ${room.room_code}` : `View Thật của phòng ${room.room_code}`} />)}</div></div> : null}
          </Card>
          );
        })}
      </div>
    </section>
  );
}
