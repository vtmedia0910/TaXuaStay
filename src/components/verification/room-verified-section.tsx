import { CalendarCheck, Eye, ShieldCheck } from "lucide-react";
import { PanoramaViewer } from "@/components/media/panorama-viewer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RoomQualityPanel } from "@/components/verification/room-quality-panel";
import { RoomProfileNotes } from "@/components/verification/room-profile-notes";
import type { VerifiedRoomProfileBundle } from "@/features/room-profiles/types";
import {
  CLOUD_VIEW_FROM_BED_LABELS,
  getCloudViewLabel,
  VERIFICATION_TYPE_LABELS,
  VIEW_DIRECTION_LABELS,
  VIEWING_POSITION_LABELS,
} from "@/features/verification/policy";
import type { PublicVerificationEvidenceDto, RoomVerificationBundle } from "@/features/verification/types";

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Chưa xác nhận";
}

export function VerificationEvidenceAsset({ asset, positionLabel: explicitPositionLabel }: { asset: PublicVerificationEvidenceDto; positionLabel?: string }) {
  const positionLabel = asset.evidence_role === "room_interior_360" ? "Phòng" : "Vị trí ngắm view";
  if (asset.media_type === "panorama_360") {
    return (
      <div>
        <PanoramaViewer mediaType={asset.media_type} url={asset.url} thumbnailUrl={asset.thumbnail_url} alt={asset.alt_text} positionLabel={explicitPositionLabel ?? positionLabel} />
        <p className="mt-2 text-sm text-white/70">Chụp: {formatDate(asset.captured_at)}</p>
      </div>
    );
  }
  return (
    <figure className="overflow-hidden rounded-3xl border border-line bg-surface">
      {asset.media_type === "video" ? (
        <video className="aspect-[4/3] w-full bg-pine object-cover" controls preload="metadata" poster={asset.thumbnail_url ?? undefined}><source src={asset.url} />Trình duyệt không hỗ trợ video này.</video>
      ) : (
        // Public verification evidence is HTTPS and approved by RLS.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.thumbnail_url ?? asset.url} alt={asset.alt_text} loading="lazy" className="aspect-[4/3] w-full bg-mist object-cover" />
      )}
      <figcaption className="p-4 text-sm leading-6 text-muted"><strong className="text-ink">{asset.alt_text}</strong>{asset.caption ? <span className="mt-1 block">{asset.caption}</span> : null}<span className="mt-1 block">Chụp: {formatDate(asset.captured_at)}</span></figcaption>
    </figure>
  );
}

export function RoomVerifiedSection({ bundle, profile }: { bundle: RoomVerificationBundle; profile: VerifiedRoomProfileBundle }) {
  const cloud = bundle.cloudView;
  const cloudEvidence = cloud ? bundle.evidence.filter((item) => item.verification_id === cloud.verification_id) : [];
  const roomVerified = bundle.badges.find((badge) => badge.verification_type === "room");
  const panoramaVerified = bundle.badges.find((badge) => badge.verification_type === "media_360");

  return (
    <section aria-labelledby="verified-room-title" className="rounded-[2rem] bg-pine p-5 text-white sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper">Hồ sơ phòng đã kiểm tra</p><h2 id="verified-room-title" className="mt-2 font-display text-3xl font-bold">TÀ XÙA STAY VERIFIED</h2><p className="mt-2 text-sm leading-6 text-white/70">Áp dụng cho loại phòng. Thông tin này không bảo đảm mọi phòng vật lý trong cùng loại hoàn toàn giống nhau.</p></div>
        <div className="flex flex-wrap gap-2">{roomVerified ? <Badge className="bg-white text-pine"><ShieldCheck size={15} />{VERIFICATION_TYPE_LABELS.room}</Badge> : null}{panoramaVerified ? <Badge className="bg-white text-pine">{VERIFICATION_TYPE_LABELS.media_360}</Badge> : null}</div>
      </div>

      {roomVerified || panoramaVerified ? (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
          {roomVerified ? <span>Phòng xác minh {formatDate(roomVerified.verified_at)} · kiểm tra lại trước {formatDate(roomVerified.expires_at)}</span> : null}
          {panoramaVerified ? <span>Ảnh 360° xác minh {formatDate(panoramaVerified.verified_at)} · kiểm tra lại trước {formatDate(panoramaVerified.expires_at)}</span> : null}
        </div>
      ) : null}

      {cloud ? (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
            <Card className="bg-white p-5 text-ink">
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-copper-strong">Cloud View · áp dụng cho loại phòng</p>
              <p className="mt-3 font-display text-5xl font-bold text-pine">{Number(cloud.score_10).toFixed(1)}<span className="text-xl"> / 10</span></p>
              <p className="mt-2 text-lg font-bold text-copper-strong">{getCloudViewLabel(Number(cloud.score_10))}</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted"><CalendarCheck size={17} aria-hidden="true" />Xác minh {formatDate(cloud.verified_at)}</p>
              <p className="mt-1 text-sm text-muted">Kiểm tra lại trước {formatDate(cloud.expires_at)}</p>
            </Card>
            <Card className="bg-white p-5 text-ink">
              <h3 className="font-display text-2xl font-bold text-pine">Thông tin từ vị trí ngắm thực tế</h3>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="font-bold">Ngắm từ giường</dt><dd className="mt-1 text-muted">{CLOUD_VIEW_FROM_BED_LABELS[cloud.view_from_bed]}</dd></div>
                <div><dt className="font-bold">Không gian ngắm</dt><dd className="mt-1 text-muted">{VIEWING_POSITION_LABELS[cloud.viewing_position]}</dd></div>
                <div><dt className="font-bold">Hướng</dt><dd className="mt-1 text-muted">{VIEW_DIRECTION_LABELS[cloud.view_direction]}</dd></div>
                <div><dt className="font-bold">Góc nhìn ngang</dt><dd className="mt-1 text-muted">{cloud.horizontal_view_angle_deg === null ? "Chưa đo" : `${cloud.horizontal_view_angle_deg}°`}</dd></div>
              </dl>
              {cloud.obstruction_notes ? <p className="mt-4 text-sm leading-6 text-muted"><strong className="text-ink">Vật cản:</strong> {cloud.obstruction_notes}</p> : null}
              {cloud.cloud_view_notes ? <p className="mt-2 text-sm leading-6 text-muted">{cloud.cloud_view_notes}</p> : null}
              <p className="mt-4 rounded-2xl bg-mist p-3 text-sm leading-6 text-muted">Điểm này đo đặc tính vị trí nhìn từ phòng, không phải xác suất có mây hay dự báo thời tiết.</p>
            </Card>
          </div>
          <div className="mt-7">
            <h3 className="flex items-center gap-2 font-display text-2xl font-bold"><Eye className="text-copper" aria-hidden="true" />VIEW THẬT · Tà Xùa Stay đã kiểm tra</h3>
            {cloudEvidence.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2">{cloudEvidence.map((asset) => <VerificationEvidenceAsset key={asset.media_asset_id} asset={asset} positionLabel="View của loại phòng" />)}</div> : <p className="mt-3 text-sm text-white/70">Bằng chứng công khai đang được rà soát lại.</p>}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-3xl bg-white/10 p-5"><h3 className="font-bold">Chưa được Tà Xùa Stay xác minh view.</h3><p className="mt-2 text-sm leading-6 text-white/70">Bạn vẫn có thể xem hình ảnh và thông tin phòng hiện có, sau đó xác nhận trực tiếp với nơi lưu trú.</p></div>
      )}

      <div className="mt-6 grid gap-4">
        <RoomQualityPanel assessment={profile.roomTypeQuality} scopeLabel="Áp dụng cho loại phòng" />
        <RoomProfileNotes notes={profile.roomTypeNotes} />
      </div>
    </section>
  );
}
