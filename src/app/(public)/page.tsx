import Link from "next/link";
import { BedDouble, Car, Eye, ListFilter, Mountain } from "lucide-react";
import { SearchEntryForm } from "@/components/search/search-entry-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SEO_LANDING_PAGES, SEO_LANDING_SLUGS } from "@/features/search/seo";
import { getPublicSiteSettings } from "@/features/settings/data";

export default async function HomePage() {
  const settings = await getPublicSiteSettings();

  return (
    <main>
      {settings.announcement_enabled && settings.announcement ? (
        <div className="bg-pine px-5 py-3 text-center text-sm font-bold text-white" role="status">
          {settings.announcement}
        </div>
      ) : null}

      <section className="stay-backdrop px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <Badge className="bg-white/65 uppercase tracking-[0.14em]">Room-first discovery</Badge>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-pine sm:text-7xl">
            Tìm chỗ ở Tà Xùa từ đúng loại phòng
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-bold leading-8 text-copper-strong sm:text-xl">
            {settings.tagline}
          </p>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
            Lọc theo sức chứa, room facts, khu vực, tiếp cận và tiện ích đã công khai. Ngày đi là ngữ cảnh cho phase availability sau, chưa phải cam kết còn phòng.
          </p>
          <div className="mt-8"><SearchEntryForm /></div>
        </div>
      </section>

      <section className="bg-surface px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">PHASE 3</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-pine sm:text-4xl">Thông tin đang dùng để thu hẹp lựa chọn</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [BedDouble, "Room type", "Sức chứa, giường, phòng tắm và ban công của đúng loại phòng."],
              [Eye, "View cơ bản", "Dùng view_type đã ghi nhận; chưa phải Cloud View Verified."],
              [Car, "Tiếp cận rõ trạng thái", "Có, Không và Chưa xác nhận luôn được tách biệt."],
              [ListFilter, "URL có thể chia sẻ", "Ngày, khách và bộ lọc được giữ trong đường dẫn tìm kiếm."],
            ].map(([Icon, title, description]) => (
              <Card key={String(title)} className="p-5">
                <Icon className="text-copper" aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl font-bold text-pine">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{String(description)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Khám phá</p><h2 className="mt-2 font-display text-3xl font-bold text-pine sm:text-4xl">Bắt đầu từ nhu cầu cụ thể</h2></div>
            <Link href="/tim-phong" className="inline-flex min-h-11 items-center font-bold text-pine hover:text-copper-strong">Xem toàn bộ bộ lọc →</Link>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_LANDING_SLUGS.map((slug) => {
              const page = SEO_LANDING_PAGES[slug];
              return (
                <Link key={slug} href={`/${slug}`} className="group rounded-[1.75rem] border border-line bg-surface p-5 shadow-sm hover:border-copper">
                  <Mountain className="text-copper" aria-hidden="true" />
                  <h3 className="mt-5 font-display text-2xl font-bold text-pine group-hover:text-copper-strong">{page.h1}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{page.intro}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
