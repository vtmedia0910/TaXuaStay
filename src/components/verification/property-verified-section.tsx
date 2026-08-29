import { Car, CheckCircle2, Mountain, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatAccessCertainty } from "@/features/properties/access";
import {
  ROAD_GRADE_LABELS,
  ROAD_SURFACE_LABELS,
  isPropertyVerified,
} from "@/features/verification/policy";
import type { PropertyVerificationBundle } from "@/features/verification/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

export function PropertyVerifiedSection({ bundle }: { bundle: PropertyVerificationBundle }) {
  const identity = bundle.badges.find((badge) => badge.verification_type === "property_identity");
  const location = bundle.badges.find((badge) => badge.verification_type === "property_location");
  const propertyVerified = identity && location && isPropertyVerified(bundle.badges) ? { identity, location } : null;
  const road = bundle.road;
  if (!propertyVerified && !road && bundle.cloudVerifiedRoomCount === 0) return null;

  return (
    <section aria-labelledby="property-verified-title">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Tà Xùa Stay Verified</p><h2 id="property-verified-title" className="mt-2 font-display text-3xl font-bold text-pine">Thông tin đã được kiểm tra</h2></div>{propertyVerified ? <Badge className="bg-pine text-white"><ShieldCheck size={15} />Property Verified</Badge> : null}</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {propertyVerified ? <Card className="p-5"><CheckCircle2 className="text-success" aria-hidden="true" /><h3 className="mt-3 font-bold text-pine">Property Verified</h3><p className="mt-2 text-sm leading-6 text-muted">Danh tính được kiểm tra ngày {formatDate(propertyVerified.identity.verified_at)}; vị trí được kiểm tra ngày {formatDate(propertyVerified.location.verified_at)}. Kiểm tra lại trước mốc sớm hơn: {formatDate(propertyVerified.identity.expires_at < propertyVerified.location.expires_at ? propertyVerified.identity.expires_at : propertyVerified.location.expires_at)}.</p></Card> : null}
        {bundle.cloudVerifiedRoomCount > 0 ? <Card className="p-5"><Mountain className="text-copper" aria-hidden="true" /><h3 className="mt-3 font-bold text-pine">{bundle.cloudVerifiedRoomCount} loại phòng có Cloud View Verified</h3><p className="mt-2 text-sm leading-6 text-muted">Số lượng được tính từ các hồ sơ xác minh phòng còn hiệu lực, không nhập thủ công.</p></Card> : null}
      </div>
      {road ? (
        <Card className="mt-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-[0.12em] text-copper-strong">Road Verified</p><h3 className="mt-1 font-display text-2xl font-bold text-pine">{ROAD_GRADE_LABELS[road.grade]}</h3></div><Badge className="text-success">Xác minh {formatDate(road.verified_at)}</Badge></div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="font-bold">Ô tô</dt><dd className="mt-1 text-muted">{formatAccessCertainty(road.car_access)}</dd></div>
            <div><dt className="font-bold">Xe máy</dt><dd className="mt-1 text-muted">{formatAccessCertainty(road.motorbike_access)}</dd></div>
            <div><dt className="font-bold">Sedan</dt><dd className="mt-1 text-muted">{formatAccessCertainty(road.sedan_access)}</dd></div>
            <div><dt className="font-bold">Mặt đường</dt><dd className="mt-1 text-muted">{ROAD_SURFACE_LABELS[road.road_surface]}</dd></div>
          </dl>
          {road.walk_from_parking_m !== null ? <p className="mt-4 flex items-center gap-2 text-sm text-muted"><Car size={17} aria-hidden="true" />Đi bộ từ chỗ đỗ khoảng {road.walk_from_parking_m} m.</p> : null}
          {road.rain_risk_notes ? <p className="mt-3 text-sm leading-6 text-muted"><strong className="text-ink">Khi mưa:</strong> {road.rain_risk_notes}</p> : null}
          <p className="mt-4 rounded-2xl bg-mist p-3 text-sm leading-6 text-muted">Đánh giá hết hiệu lực sau {formatDate(road.expires_at)} hoặc cần xem lại sớm hơn sau thay đổi lớn về đường/thời tiết. Không phải bảo đảm an toàn trong mọi điều kiện tương lai.</p>
        </Card>
      ) : null}
    </section>
  );
}
