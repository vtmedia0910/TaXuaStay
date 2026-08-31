import type { Metadata } from "next";
import Link from "next/link";
import { Bike, ChevronRight, CircleHelp, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { MotorbikeOfferingCard, MotorbikeTruthStrip } from "@/components/trip/motorbike-offering-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PUBLIC_ROUTES } from "@/config/routes";
import { getPublicPageRobots } from "@/config/seo";
import { getPublicMotorbikeCatalog } from "@/features/motorbike/public-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Xe máy cho chuyến đi Tà Xùa",
  description: "Xem lựa chọn xe máy được Tà Xùa Trip công khai qua nguồn Tà Xùa Biker, với giá và trạng thái xác nhận minh bạch.",
  alternates: { canonical: "/motorbike" },
  robots: getPublicPageRobots(),
};

export default async function MotorbikePage() {
  const catalog = await getPublicMotorbikeCatalog();
  return (
    <main className="bg-cream pb-16">
      <section className="trip-detail-hero px-4 pb-12 pt-12 text-white sm:px-6 sm:pb-16 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <Badge className="bg-white/12 text-white">XE MÁY · XÁC NHẬN THỦ CÔNG</Badge>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div><h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">Chọn xe phù hợp, biết rõ điều gì còn phải xác nhận.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">Tà Xùa Trip chỉ hiển thị lựa chọn được chủ sở hữu công khai. Tà Xùa Biker vẫn quản lý xe, tình trạng thực tế và quy trình thuê.</p><a href="#motorbike-options" className={buttonVariants({ size: "lg", variant: "secondary", className: "mt-6 min-h-13 w-full bg-white text-pine sm:w-auto" })}>Xem xe phù hợp <ChevronRight size={18} aria-hidden="true" /></a></div>
            <Card className="border-white/20 bg-white/10 p-5 text-white backdrop-blur-sm"><Bike size={36} className="text-trip-sunrise" aria-hidden="true" /><h2 className="mt-4 text-2xl font-bold">Đây chưa phải đặt xe</h2><p className="mt-2 leading-7 text-white/75">Chọn một lựa chọn sẽ mở kênh liên hệ đã được phê duyệt. Website chưa tạo yêu cầu thuê, giữ xe hay thanh toán.</p></Card>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative -mt-5"><MotorbikeTruthStrip /></div>
        <section id="motorbike-options" className="scroll-mt-24 py-12 sm:py-16" aria-labelledby="motorbike-options-title">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Lựa chọn đang công khai</p><h2 id="motorbike-options-title" className="mt-2 text-3xl font-bold text-pine sm:text-5xl">Thông tin gọn để quyết định trên điện thoại.</h2></div>{catalog.status === "ready" ? <p className="text-sm font-bold text-muted">{catalog.offerings.length} lựa chọn · không phải số xe còn lại</p> : null}</div>
          {catalog.status === "ready" ? <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{catalog.offerings.map((offering) => <MotorbikeOfferingCard key={offering.slug} offering={offering} />)}</div> : <div className="mt-7"><EmptyState title={catalog.status === "error" ? "Thông tin xe máy tạm thời chưa tải được" : catalog.status === "unconfigured" ? "Nguồn dữ liệu Trip chưa được cấu hình" : "Chưa có lựa chọn xe máy được công khai"} description={catalog.status === "error" ? "Bạn có thể quay lại sau hoặc xem phần Lưu trú trong lúc đội ngũ kiểm tra nguồn." : "Chúng tôi không tạo xe, giá hoặc trạng thái mẫu. Khi nguồn Tà Xùa Biker thật được xác nhận, lựa chọn sẽ xuất hiện tại đây."} action={<Link href={PUBLIC_ROUTES.stay} className={buttonVariants({ variant: "secondary", size: "lg" })}>Xem Lưu trú</Link>} /></div>}
        </section>

        <section className="grid gap-4 pb-4 sm:grid-cols-2" aria-labelledby="motorbike-process-title">
          <Card className="p-5 sm:p-6"><ShieldCheck className="text-copper" aria-hidden="true" /><h2 id="motorbike-process-title" className="mt-4 text-2xl font-bold text-pine">Luồng xác nhận</h2><ol className="mt-4 grid gap-3 text-sm leading-6 text-muted"><li><strong className="text-pine">1.</strong> Xem dữ liệu được công khai trên Trip.</li><li><strong className="text-pine">2.</strong> Chọn lựa chọn phù hợp và mở kênh xác nhận.</li><li><strong className="text-pine">3.</strong> Nhà vận hành kiểm tra xe, giá và điều kiện thực tế.</li></ol></Card>
          <Card className="p-5 sm:p-6"><CircleHelp className="text-copper" aria-hidden="true" /><h2 className="mt-4 text-2xl font-bold text-pine">Thông tin vẫn thuộc Biker</h2><p className="mt-3 text-sm leading-7 text-muted">Xe vật lý, biển số, bảo dưỡng, giao/nhận, lịch sử khách thuê, nhân sự và trạng thái tồn xe không nằm trong hệ thống Trip và không xuất hiện trên trang này.</p></Card>
        </section>
      </div>
    </main>
  );
}
