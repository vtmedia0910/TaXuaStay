import { ArrowDown, CheckCircle2, Mountain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
      <section className="stay-backdrop min-h-[calc(100dvh-73px)] px-5 pb-14 pt-32 sm:px-8 sm:pt-40">
        <div className="mx-auto grid max-w-6xl items-end gap-12 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <Badge className="bg-white/65 uppercase tracking-[0.14em]">Nền tảng độc lập mới</Badge>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-pine sm:text-7xl lg:text-8xl">
              {settings.site_name}
            </h1>
            <p className="mt-7 max-w-2xl text-xl font-bold leading-8 text-copper-strong sm:text-2xl">
              {settings.tagline}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              {settings.hero_subtitle}
            </p>
            <a
              href="#baseline-status"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-pine px-6 text-sm font-bold text-white hover:bg-pine-strong"
            >
              Xem trạng thái nền tảng
              <ArrowDown size={17} aria-hidden="true" />
            </a>
          </div>

          <Card className="overflow-hidden border-white/55 bg-white/55 p-6 backdrop-blur-sm sm:p-8">
            <Mountain className="text-copper" size={30} aria-hidden="true" />
            <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Tà Xùa · Sơn La
            </p>
            <p className="mt-3 font-display text-3xl font-bold leading-tight text-pine">
              {settings.hero_title}
            </p>
          </Card>
        </div>
      </section>

      <section id="baseline-status" className="bg-surface px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-1 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">
                PHASE 2
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-pine sm:text-4xl">
                Miền nội dung lưu trú đã sẵn sàng
              </h2>
              <p className="mt-4 text-base leading-8 text-muted">
                Hệ thống đã có property, room type, amenity và media cơ bản với vòng đời xuất bản
                an toàn. Search, giá, tình trạng phòng, Verified Standard và booking chưa được triển
                khai trong phase này.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
