import Link from "next/link";
import { Bike, Gauge, HardHat, MapPin, ShieldQuestion } from "lucide-react";
import { CmsImage } from "@/components/cms/cms-image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MOTORBIKE_CATEGORY_LABELS,
  MOTORBIKE_HELMET_LABELS,
  MOTORBIKE_TRANSMISSION_LABELS,
  resolveMotorbikePublicTruth,
} from "@/features/motorbike/policy";
import type { PublicMotorbikeOffering } from "@/features/motorbike/types";

export function MotorbikeOfferingCard({ offering }: { offering: PublicMotorbikeOffering }) {
  const truth = resolveMotorbikePublicTruth(offering);
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-gradient-to-br from-pine-soft to-mist">
        {offering.image ? <CmsImage media={offering.image} className="size-full" sizes="(min-width: 1024px) 400px, 100vw" /> : <div className="grid size-full place-items-center text-pine"><Bike size={54} strokeWidth={1.5} aria-hidden="true" /><span className="sr-only">Ảnh đang được cập nhật</span></div>}
        <Badge className="absolute left-3 top-3 bg-white/95 text-pine shadow-sm">{MOTORBIKE_CATEGORY_LABELS[offering.vehicle_category]}</Badge>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-2xl font-bold text-pine">{offering.display_name}</h2><p className="mt-1 text-sm text-muted">Nguồn: {offering.source_provider}</p></div>
          <Badge className={offering.availability_state === "unavailable" ? "bg-red-50 text-danger" : "bg-amber-50 text-warning"}>{truth.availabilityLabel}</Badge>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-ink">
          <p className="flex min-h-8 items-center gap-2"><Gauge size={17} className="text-copper" aria-hidden="true" />{MOTORBIKE_TRANSMISSION_LABELS[offering.transmission_type]}{offering.engine_class_cc ? ` · ${offering.engine_class_cc}cc` : ""}</p>
          <p className="flex min-h-8 items-center gap-2"><HardHat size={17} className="text-copper" aria-hidden="true" />{MOTORBIKE_HELMET_LABELS[offering.helmet_status]}</p>
          {offering.pickup_summary ? <p className="flex min-h-8 items-center gap-2"><MapPin size={17} className="text-copper" aria-hidden="true" />{offering.pickup_summary}</p> : null}
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-2xl font-bold text-pine">{truth.priceLabel}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{truth.confirmationLabel} · {truth.freshnessLabel}</p>
        </div>
        <Link href={`/motorbike/${offering.slug}`} className={buttonVariants({ size: "lg", className: "mt-5 min-h-12 w-full" })}>Xem chi tiết</Link>
      </div>
    </Card>
  );
}

export function MotorbikeTruthStrip() {
  return (
    <div className="grid gap-3 rounded-3xl border border-line bg-white p-4 text-sm sm:grid-cols-3 sm:p-5">
      <p className="flex items-start gap-2"><ShieldQuestion className="mt-0.5 shrink-0 text-copper" size={18} aria-hidden="true" /><span><strong className="block text-pine">Không giả định còn xe</strong><span className="text-muted">Mọi lựa chọn đều cần nhà vận hành xác nhận.</span></span></p>
      <p className="flex items-start gap-2"><Bike className="mt-0.5 shrink-0 text-copper" size={18} aria-hidden="true" /><span><strong className="block text-pine">Biker vận hành</strong><span className="text-muted">Xe thực tế và quy trình thuê vẫn do Tà Xùa Biker quản lý.</span></span></p>
      <p className="flex items-start gap-2"><Gauge className="mt-0.5 shrink-0 text-copper" size={18} aria-hidden="true" /><span><strong className="block text-pine">Giá có thời hạn</strong><span className="text-muted">Giá cũ được ẩn và chuyển thành cần xác nhận.</span></span></p>
    </div>
  );
}
