import Link from "next/link";
import { ArrowLeft, Bike, Clock3, ExternalLink, Gauge, HardHat, MapPin, RotateCcw, ShieldQuestion } from "lucide-react";
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

export function MotorbikeDetailExperience({ offering }: { offering: PublicMotorbikeOffering }) {
  const truth = resolveMotorbikePublicTruth(offering);
  const facts = [
    [Gauge, "Loại xe", `${MOTORBIKE_TRANSMISSION_LABELS[offering.transmission_type]}${offering.engine_class_cc ? ` · ${offering.engine_class_cc}cc` : ""}`],
    [HardHat, "Mũ bảo hiểm", MOTORBIKE_HELMET_LABELS[offering.helmet_status]],
    [MapPin, "Nhận xe", offering.pickup_summary ?? "Chưa xác nhận"],
    [RotateCcw, "Trả xe", offering.return_summary ?? "Chưa xác nhận"],
  ] as const;

  return (
    <main className="bg-cream pb-28 lg:pb-16">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <Link href="/motorbike" className="inline-flex min-h-11 items-center gap-2 font-bold text-pine">
          <ArrowLeft size={18} aria-hidden="true" />Tất cả lựa chọn xe máy
        </Link>
      </div>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-pine-soft to-mist lg:sticky lg:top-24">
          {offering.image
            ? <CmsImage media={offering.image} className="size-full" priority sizes="(min-width: 1024px) 56vw, 100vw" />
            : <div className="grid size-full place-items-center text-pine"><Bike size={72} strokeWidth={1.4} aria-hidden="true" /><span className="sr-only">Ảnh đang được cập nhật</span></div>}
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{MOTORBIKE_CATEGORY_LABELS[offering.vehicle_category]}</Badge>
            <Badge className={offering.availability_state === "unavailable" ? "bg-red-50 text-danger" : "bg-amber-50 text-warning"}>{truth.availabilityLabel}</Badge>
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-pine sm:text-5xl">{offering.display_name}</h1>
          <p className="mt-2 text-sm text-muted">Nguồn công khai: {offering.source_provider}</p>
          {offering.public_description ? <p className="mt-5 text-base leading-8 text-ink">{offering.public_description}</p> : null}
          <Card className="mt-6 p-5">
            <p className="text-sm font-bold text-muted">Giá hiển thị</p>
            <p className="mt-1 text-3xl font-bold text-pine">{truth.priceLabel}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{truth.priceNote}</p>
          </Card>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {facts.map(([Icon, label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-white p-4">
                <dt className="flex items-center gap-2 text-sm font-bold text-muted"><Icon size={18} className="text-copper" aria-hidden="true" />{label}</dt>
                <dd className="mt-2 font-bold text-pine">{value}</dd>
              </div>
            ))}
          </dl>
          {offering.suitable_for ? <Card className="mt-5 p-5"><h2 className="font-bold text-pine">Phù hợp với</h2><p className="mt-2 leading-7 text-muted">{offering.suitable_for}</p></Card> : null}
          <Card className="mt-5 border-amber-200 bg-amber-50 p-5">
            <div className="flex gap-3"><ShieldQuestion className="shrink-0 text-warning" aria-hidden="true" /><div><h2 className="font-bold text-pine">{truth.confirmationLabel}</h2><p className="mt-1 text-sm leading-6 text-muted">{truth.freshnessLabel}. Chọn yêu cầu xác nhận không tạo đơn thuê, không giữ xe và không xác nhận thanh toán.</p></div></div>
          </Card>
          <div className="mt-6 hidden lg:block">
            {truth.canRequest
              ? <a href={offering.public_request_url} target="_blank" rel="nofollow noopener noreferrer" className={buttonVariants({ size: "lg", className: "min-h-13 w-full" })}>Yêu cầu xác nhận <ExternalLink size={18} aria-hidden="true" /></a>
              : <p className="rounded-2xl bg-red-50 p-4 text-center font-bold text-danger">Tạm chưa nhận yêu cầu cho lựa chọn này.</p>}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted"><Clock3 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Trang này không đọc số xe còn lại trực tiếp từ Biker. Thông tin công khai được kiểm tra thủ công.</p>
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/96 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        {truth.canRequest
          ? <a href={offering.public_request_url} target="_blank" rel="nofollow noopener noreferrer" className={buttonVariants({ size: "lg", className: "min-h-13 w-full" })}>Yêu cầu xác nhận <ExternalLink size={18} aria-hidden="true" /></a>
          : <p className="rounded-2xl bg-red-50 p-4 text-center text-sm font-bold text-danger">Tạm chưa nhận yêu cầu</p>}
      </div>
    </main>
  );
}
