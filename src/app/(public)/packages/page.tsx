import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, PackageCheck, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PackageCard } from "@/components/trip/package-card";
import { PackageSelectionSheet } from "@/components/trip/package-selection-sheet";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicPageRobots } from "@/config/seo";
import { PUBLIC_ROUTES } from "@/config/routes";
import { getPublicPackageCatalog, getPublicPackageFactsByIds, getPublicPackageQuotes } from "@/features/packages/data";
import { packageQuoteInputSchema } from "@/features/packages/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Combo Tà Xùa có thành phần và giá rõ ràng",
  description: "Xem gói dịch vụ Tà Xùa với phòng, xe máy hoặc nội dung đi kèm được chỉ rõ; giá và tình trạng được tách biệt.",
  alternates: { canonical: "/packages" },
  robots: getPublicPageRobots(),
  openGraph: { title: "Combo Tà Xùa | Tà Xùa Trip", description: "Biết rõ từng thành phần, giá gói và bước cần xác nhận trước chuyến đi." },
};

function scalar(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PackagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const catalog = await getPublicPackageCatalog();
  const facts = await getPublicPackageFactsByIds(catalog.packages.map((item) => item.id));
  const parsed = packageQuoteInputSchema.safeParse({
    check_in: scalar(params.check_in), check_out: scalar(params.check_out),
    adults: scalar(params.adults) ?? 2, children: scalar(params.children) ?? 0,
    rooms: scalar(params.rooms) ?? 1, selected_optional_component_keys: [],
  });
  const quotes = parsed.success
    ? await getPublicPackageQuotes({ packages: catalog.packages, quoteInput: parsed.data })
    : new Map();
  return <main className="bg-cream pb-16">
    <section className="trip-detail-hero px-4 pb-12 pt-12 text-white sm:px-6 sm:pb-16 sm:pt-16"><div className="mx-auto max-w-7xl"><Badge className="bg-white/12 text-white">COMBO · THÀNH PHẦN RÕ RÀNG</Badge><div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end"><div><h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">Chọn một gói phù hợp, biết rõ từng phần cần xác nhận.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">Mỗi gói có tên, thành phần và mức giá riêng. Giá không được suy ra từ giá lẻ và không đồng nghĩa dịch vụ còn chỗ.</p><div className="mt-6"><PackageSelectionSheet action="/packages" defaults={parsed.success ? { checkIn: parsed.data.check_in, checkOut: parsed.data.check_out, adults: parsed.data.adults, children: parsed.data.children, rooms: parsed.data.rooms } : undefined} label={parsed.success ? "Đổi ngày & số khách" : "Chọn ngày & số khách"} /></div></div><Card className="border-white/20 bg-white/10 p-5 text-white backdrop-blur-sm"><ShieldCheck size={36} className="text-trip-sunrise" /><h2 className="mt-4 text-2xl font-bold">Đây chưa phải đặt chuyến</h2><p className="mt-2 leading-7 text-white/75">Website chỉ giúp kiểm tra thông tin hiện có và mở bước xác nhận phù hợp. Không giữ phòng, giữ xe hoặc thu tiền.</p></Card></div></div></section>
    <div className="mx-auto max-w-7xl px-4 sm:px-6"><section className="py-12 sm:py-16" aria-labelledby="package-list-title"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Gói đang công khai</p><h2 id="package-list-title" className="mt-2 text-3xl font-bold text-pine sm:text-5xl">So sánh bằng dữ liệu, không bằng giảm giá giả.</h2></div>{parsed.success ? <p className="text-sm font-bold text-muted">{parsed.data.adults} người lớn · {parsed.data.children} trẻ em · {parsed.data.rooms} phòng</p> : null}</div>
      {catalog.status === "ready" ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{catalog.packages.map((item) => <PackageCard key={item.id} item={item} components={facts.components.filter((component) => component.package_id === item.id)} quote={quotes.get(item.id)} />)}</div> : <div className="mt-8"><EmptyState title={catalog.status === "error" ? "Gói dịch vụ tạm thời chưa tải được" : catalog.status === "unconfigured" ? "Thông tin gói đang được cập nhật" : "Chưa có gói dịch vụ được công khai"} description={catalog.status === "empty" ? "Chúng tôi không tạo combo, giá hoặc ưu đãi mẫu. Khi phòng, xe và điều kiện thật đã sẵn sàng, gói sẽ xuất hiện tại đây." : "Bạn có thể xem Lưu trú trong lúc đội ngũ kiểm tra lại thông tin."} action={<Link href={PUBLIC_ROUTES.stay} className={buttonVariants({ variant: "secondary", size: "lg" })}>Xem Lưu trú</Link>} /></div>}
    </section><section className="grid gap-4 sm:grid-cols-3"><Card className="p-5"><PackageCheck className="text-copper" /><h2 className="mt-3 font-bold text-pine">Thành phần thật</h2><p className="mt-2 text-sm leading-6 text-muted">Phòng và xe máy tham chiếu đúng nguồn thông tin hiện có; nội dung riêng được ghi rõ là cần xác nhận.</p></Card><Card className="p-5"><CircleHelp className="text-copper" /><h2 className="mt-3 font-bold text-pine">Giá gói độc lập</h2><p className="mt-2 text-sm leading-6 text-muted">Không có mức giá phù hợp thì hiển thị “Cần xác nhận giá”, không cộng giá lẻ hoặc tạo số giảm.</p></Card><Card className="p-5"><ShieldCheck className="text-copper" /><h2 className="mt-3 font-bold text-pine">Xác nhận theo nguồn</h2><p className="mt-2 text-sm leading-6 text-muted">Một thành phần chưa chắc chắn khiến toàn gói cần kiểm tra lại trước chuyến đi.</p></Card></section></div>
  </main>;
}
