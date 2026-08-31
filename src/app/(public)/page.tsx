import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Bike,
  BusFront,
  Camera,
  CheckCircle2,
  CloudSun,
  Compass,
  Eye,
  Info,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CmsImage } from "@/components/cms/cms-image";
import { TripHero } from "@/components/trip/trip-hero";
import { VerifiedStayCard } from "@/components/trip/verified-stay-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { PUBLIC_ROUTES, buildRoomPath } from "@/config/routes";
import { getPublicPageRobots } from "@/config/seo";
import { findCmsSection } from "@/features/cms/defaults";
import { getPublicCmsPage } from "@/features/cms/data";
import { resolveCmsMediaUrl } from "@/features/cms/media-url";
import type { CmsPage } from "@/features/cms/types";
import { searchPublicRooms } from "@/features/search/data";
import { DEFAULT_ROOM_SEARCH_PARAMS } from "@/features/search/params";
import type { RoomSearchResponse } from "@/features/search/types";
import { getPublicSiteSettings } from "@/features/settings/data";
import { hasPublicPackages } from "@/features/packages/data";
import type { PublicSiteSettings } from "@/features/settings/types";
import { CLOUD_VIEW_FROM_BED_LABELS } from "@/features/verification/policy";

export async function generateMetadata(): Promise<Metadata> {
  const cms = await getPublicCmsPage("home");
  const image = resolveCmsMediaUrl(cms.og_media);
  return {
    title: cms.seo_title,
    description: cms.seo_description ?? undefined,
    alternates: { canonical: "/" },
    robots: getPublicPageRobots(),
    openGraph: { title: cms.seo_title ?? cms.title, description: cms.seo_description ?? undefined, images: image ? [{ url: image, alt: cms.og_media?.alt_text }] : undefined },
  };
}

export default async function HomePage() {
  const [settings, roomResponse, cms, packagesAvailable] = await Promise.all([
    getPublicSiteSettings(),
    searchPublicRooms(DEFAULT_ROOM_SEARCH_PARAMS),
    getPublicCmsPage("home"),
    hasPublicPackages(),
  ]);
  return <HomeExperience settings={settings} roomResponse={roomResponse} cms={cms} packagesAvailable={packagesAvailable} />;
}

export function HomeExperience({ settings, roomResponse, cms, preview = false, packagesAvailable = false }: {
  settings: PublicSiteSettings;
  roomResponse: RoomSearchResponse;
  cms: CmsPage;
  preview?: boolean;
  packagesAvailable?: boolean;
}) {
  const hero = findCmsSection(cms, "hero");
  const why = findCmsSection(cms, "why_choose_us");
  const differentiators = findCmsSection(cms, "differentiators");
  const verifiedRooms = findCmsSection(cms, "verified_rooms");
  const brandStatement = findCmsSection(cms, "brand_statement");
  const finalCta = findCmsSection(cms, "final_cta");
  const selectedRoomIds = verifiedRooms?.items.filter((item) => item.is_enabled !== false).map((item) => item.room_type_id).filter(Boolean) as string[] | undefined;
  const allCloudRooms = roomResponse.items.filter((item) => item.cloudView);
  const orderedCloudRooms = selectedRoomIds?.length
    ? selectedRoomIds.flatMap((id) => allCloudRooms.filter((item) => item.room.id === id))
    : allCloudRooms;
  const cloudRooms = orderedCloudRooms.slice(0, verifiedRooms?.max_items ?? 3);
  const differentiatorDefaults: { Icon: LucideIcon; title: string; description: string; media?: CmsPage["sections"][number]["items"][number]["media"] }[] = [
    { Icon: ShieldCheck, title: "THẨM ĐỊNH TẠI CHỖ", description: "Ghi nhận đúng nơi, đúng loại phòng và đúng phạm vi." },
    { Icon: Camera, title: "XEM TRƯỚC BẰNG 360°", description: "Ảnh toàn cảnh được gắn nhãn phòng hoặc vị trí ngắm." },
    { Icon: Info, title: "NÓI CẢ ĐIỂM CHƯA TỐT", description: "Ưu điểm và điều cần lưu ý cùng xuất hiện khi có dữ liệu." },
    { Icon: Compass, title: "CHUẨN BỊ CẢ CHUYẾN ĐI", description: "Hệ thống đang mở rộng từng bước; hiện Lưu trú là luồng hoạt động đầy đủ." },
  ];
  const enabledDifferentiators = differentiators?.items.filter((item) => item.is_enabled !== false) ?? [];
  const differentiatorCards = enabledDifferentiators.length
    ? enabledDifferentiators.map((item, index) => ({ Icon: [ShieldCheck, Camera, Info, Compass][index % 4], title: item.title, description: item.body ?? "", media: item.media }))
    : differentiatorDefaults;

  return (
    <main>
      {preview ? <div className="sticky top-0 z-50 bg-copper px-5 py-3 text-center text-sm font-bold text-white">Bản xem trước nội dung nháp · không công khai · SEO: {cms.seo_title ?? cms.title}</div> : null}
      {settings.announcement_enabled && settings.announcement ? (
        <div className="bg-pine px-5 py-3 text-center text-sm font-bold text-white" role="status">
          {settings.announcement}
        </div>
      ) : null}

      <TripHero hero={hero} packagesAvailable={packagesAvailable} />

      {why ? <section id="about" className="bg-cream px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">{why?.eyebrow}</p><h2 className="mt-3 text-4xl font-bold text-pine sm:text-5xl">{why?.heading}</h2></div>
          <Card className="overflow-hidden">{why.desktop_media ? <div className="relative aspect-[16/8] bg-mist"><CmsImage media={why.desktop_media} sizes="(min-width: 1024px) 700px, 100vw" /></div> : null}<div className="p-6 sm:p-8"><p className="text-lg leading-8 text-ink">Một dòng “view núi” chưa cho bạn biết có nhìn thấy cảnh từ giường, góc nhìn có bị che, đường vào có khó, phòng có khớp ảnh hay dữ liệu còn mới không.</p><p className="mt-4 leading-7 text-muted">{why?.body}</p></div></Card>
        </div>
      </section> : null}

      {differentiators ? <section id="principles" className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">{differentiators?.eyebrow}</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-bold text-pine sm:text-5xl">{differentiators?.heading}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {differentiatorCards.map(({ Icon, title, description, media }) => <Card key={title} className="overflow-hidden">{media ? <div className="relative aspect-[4/3] bg-mist"><CmsImage media={media} sizes="(min-width: 1024px) 300px, 50vw" /></div> : null}<div className="p-5"><Icon className="text-copper" aria-hidden="true" /><h3 className="mt-4 text-lg font-bold text-pine">{title}</h3><p className="mt-2 text-sm leading-6 text-muted">{description}</p></div></Card>)}
          </div>
        </div>
      </section> : null}

      {verifiedRooms ? <section id="verified-stays" className="bg-cream px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">{verifiedRooms?.eyebrow}</p><h2 className="mt-2 text-3xl font-bold text-pine sm:text-5xl">{verifiedRooms?.heading}</h2><p className="mt-3 max-w-3xl leading-7 text-muted">{verifiedRooms?.body}</p></div>
            <Link href={verifiedRooms?.cta_href ?? PUBLIC_ROUTES.stay} className="inline-flex min-h-11 items-center font-bold text-pine hover:text-copper-strong">{verifiedRooms?.cta_label ?? "Xem toàn bộ Lưu trú"} →</Link>
          </div>
          {cloudRooms.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{cloudRooms.map((result) => <VerifiedStayCard key={result.room.id} result={result} />)}</div> : <div className="mt-8"><EmptyState title={roomResponse.status === "error" ? "Dữ liệu hiện chưa tải được" : "Chưa có phòng Cloud View đang công khai"} description={roomResponse.status === "unconfigured" ? "Nguồn dữ liệu Lưu trú chưa được cấu hình. Trang vẫn hoạt động và không hiển thị dữ liệu thay thế." : "Khi có hồ sơ thẩm định còn hiệu lực, phòng sẽ xuất hiện tại đây. Chúng tôi không tạo điểm hoặc thẻ mẫu."} action={<Link href={PUBLIC_ROUTES.stay} className={buttonVariants({ variant: "secondary" })}>Mở Lưu trú</Link>} /></div>}
        </div>
      </section> : null}

      <section id="services" className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Một chuyến Tà Xùa trọn vẹn</p>
          <h2 className="mt-3 text-4xl font-bold text-pine sm:text-5xl">Mỗi dịch vụ đều nói rõ trạng thái.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5"><BedDouble className="text-copper" aria-hidden="true" /><Badge className="mt-4 text-success">Đang hoạt động</Badge><h3 className="mt-3 text-2xl font-bold text-pine">Lưu trú</h3><p className="mt-2 text-sm leading-6 text-muted">Tìm theo phòng, ngày, bằng chứng, giá và tình trạng được ghi nhận.</p><Link href={PUBLIC_ROUTES.stay} className="mt-4 inline-flex min-h-11 items-center font-bold text-pine">Tìm phòng →</Link></Card>
            <Card className="p-5"><BusFront className="text-copper" aria-hidden="true" /><Badge className="mt-4 bg-mist text-muted">Sắp có</Badge><h3 className="mt-3 text-2xl font-bold text-pine">Xe khách</h3><p className="mt-2 text-sm leading-6 text-muted">Lịch trình và tồn chỗ chưa được kết nối; chưa nhận đặt trên website.</p></Card>
            <Card className="p-5"><Bike className="text-copper" aria-hidden="true" /><Badge className="mt-4 bg-amber-50 text-warning">Cần xác nhận</Badge><h3 className="mt-3 text-2xl font-bold text-pine">Xe máy</h3><p className="mt-2 text-sm leading-6 text-muted">Xem thông tin công khai từ Tà Xùa Biker; giá và tình trạng thực tế được xác nhận thủ công.</p><Link href={PUBLIC_ROUTES.motorbike} className="mt-4 inline-flex min-h-11 items-center font-bold text-pine">Xem dịch vụ →</Link></Card>
            {packagesAvailable ? <Card className="p-5"><Package className="text-copper" aria-hidden="true" /><Badge className="mt-4 bg-amber-50 text-warning">Cần xác nhận</Badge><h3 className="mt-3 text-2xl font-bold text-pine">Combo</h3><p className="mt-2 text-sm leading-6 text-muted">Xem từng thành phần, giá gói và điều cần xác nhận trước chuyến đi.</p><Link href={PUBLIC_ROUTES.packages} className="mt-4 inline-flex min-h-11 items-center font-bold text-pine">Xem gói dịch vụ →</Link></Card> : <Card className="p-5"><Package className="text-copper" aria-hidden="true" /><Badge className="mt-4 bg-mist text-muted">Sắp có</Badge><h3 className="mt-3 text-2xl font-bold text-pine">Combo</h3><p className="mt-2 text-sm leading-6 text-muted">Chưa có gói dịch vụ thật đang được công khai.</p></Card>}
          </div>
        </div>
      </section>

      <section id="explore" className="bg-cream px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="trip-detail-hero p-6 text-white sm:p-8"><ShieldCheck className="text-trip-sunrise" size={32} aria-hidden="true" /><p className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-white/70">Cách chúng tôi thẩm định</p><h2 className="mt-2 text-4xl font-bold">Biết thông tin thuộc đúng phạm vi nào.</h2><p className="mt-4 leading-8 text-white/80">Danh tính phòng, bằng chứng đúng phòng, Cloud View, đường vào, chất lượng và độ mới được giữ tách biệt.</p><Link href={PUBLIC_ROUTES.verification} className={buttonVariants({ variant: "secondary", size: "lg", className: "mt-6 border-white/30 bg-white text-pine" })}>Xem phương pháp thẩm định</Link></Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [BedDouble, "Loại phòng / phòng mẫu"],
              [CheckCircle2, "Phòng cụ thể / Room ID"],
              [Eye, "View Thật & Cloud View"],
              [Route, "Đường vào đã thẩm định"],
              [Sparkles, "Chất lượng từng chiều"],
              [CloudSun, "Ngày xác minh & độ mới"],
            ].map(([Icon, label]) => <Card key={String(label)} className="flex items-center gap-3 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-pine-soft text-pine"><Icon size={20} aria-hidden="true" /></span><h3 className="font-bold text-pine">{String(label)}</h3></Card>)}
          </div>
        </div>
      </section>

      <section id="cloud-view" className="bg-white px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Cloud View</p><h2 className="mt-3 text-4xl font-bold text-pine sm:text-5xl">Chất lượng góc nhìn, không phải dự báo thời tiết.</h2><p className="mt-3 max-w-3xl leading-7 text-muted">Điểm Cloud View chỉ mô tả vị trí nhìn vật lý khi điều kiện phù hợp. Nó không nói xác suất có mây và không bảo đảm săn mây thành công.</p>
          {cloudRooms.length ? <div className="mt-8 grid gap-4 md:grid-cols-3">{cloudRooms.map((result) => <Link key={result.room.id} href={buildRoomPath(result.property.slug, result.room.slug)} className="rounded-3xl border border-line bg-cream p-5 hover:border-copper"><p className="text-sm font-semibold text-muted">{result.property.name}</p><h3 className="mt-1 text-xl font-bold text-pine">{result.room.name}</h3><p className="mt-4 text-3xl font-bold text-copper-strong">{Number(result.cloudView?.score_10).toFixed(1)} / 10</p><p className="mt-2 text-sm text-muted">View từ giường: {result.cloudView ? CLOUD_VIEW_FROM_BED_LABELS[result.cloudView.view_from_bed] : "Chưa xác minh"}</p></Link>)}</div> : <p className="mt-6 rounded-3xl border border-line bg-cream p-5 text-sm leading-6 text-muted">Chưa có hồ sơ Cloud View còn hiệu lực để giới thiệu. Xem danh sách Lưu trú để kiểm tra dữ liệu từng phòng.</p>}
        </div>
      </section>

      {brandStatement ? <section className="bg-cream px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-5xl text-center"><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">{brandStatement?.eyebrow}</p><h2 className="mt-4 whitespace-pre-line text-4xl font-bold text-pine sm:text-6xl">{brandStatement?.heading}</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted">{brandStatement?.body}</p></div>
      </section> : null}

      {finalCta ? <section id="final-cta" className="trip-detail-hero px-5 py-16 text-white sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 md:flex-row md:items-center"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-white/70">{finalCta?.eyebrow}</p><h2 className="mt-3 text-4xl font-bold sm:text-5xl">{finalCta?.heading}</h2><p className="mt-4 max-w-2xl leading-7 text-white/80">{finalCta?.body}</p></div><Link href={finalCta?.cta_href ?? PUBLIC_ROUTES.stay} className={buttonVariants({ variant: "secondary", size: "lg", className: "shrink-0 border-white/30 bg-white text-pine" })}>{finalCta?.cta_label ?? "Bắt đầu tìm chuyến"}<ArrowRight size={18} aria-hidden="true" /></Link></div>
      </section> : null}
    </main>
  );
}
