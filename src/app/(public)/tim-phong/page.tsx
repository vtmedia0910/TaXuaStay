import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Info, Users } from "lucide-react";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import { CmsImage } from "@/components/cms/cms-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicPageRobots } from "@/config/seo";
import { findCmsSection } from "@/features/cms/defaults";
import { getPublicCmsPage } from "@/features/cms/data";
import { resolveCmsMediaUrl } from "@/features/cms/media-url";
import type { CmsPage } from "@/features/cms/types";
import { getPublicSearchOptions, searchPublicRooms } from "@/features/search/data";
import { parseRoomSearchParams, type RawSearchParams } from "@/features/search/params";
import { SEO_LANDING_PAGES, SEO_LANDING_SLUGS } from "@/features/search/seo";

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const [raw, cms] = await Promise.all([searchParams, getPublicCmsPage("stay")]);
  const hasQuery = Object.values(raw).some((value) => value !== undefined);
  const image = resolveCmsMediaUrl(cms.og_media);
  return {
    title: cms.seo_title,
    description: cms.seo_description ?? undefined,
    alternates: { canonical: "/stay" },
    robots: getPublicPageRobots(
      hasQuery ? { index: false, follow: true } : { index: true, follow: true },
    ),
    openGraph: { title: cms.seo_title ?? cms.title, description: cms.seo_description ?? undefined, images: image ? [{ url: image, alt: cms.og_media?.alt_text }] : undefined },
  };
}

export function StayIntro({ cms, preview = false }: { cms: CmsPage; preview?: boolean }) {
  const intro = findCmsSection(cms, "stay_intro");
  const notes = findCmsSection(cms, "stay_notes");
  if (!intro) return preview ? <div className="bg-copper px-5 py-3 text-center text-sm font-bold text-white">Section mở đầu đang tắt trong bản nháp</div> : null;
  const desktop = intro?.desktop_media;
  const mobile = intro?.mobile_media ?? desktop;
  return <>{preview ? <div className="bg-copper px-5 py-3 text-center text-sm font-bold text-white">Bản xem trước nội dung nháp · không công khai · SEO: {cms.seo_title ?? cms.title}</div> : null}<section className="trip-detail-hero relative isolate overflow-hidden px-5 py-12 text-white sm:px-8 sm:py-16">{desktop ? <div className="absolute inset-0 -z-20 hidden sm:block"><CmsImage media={desktop} priority sizes="100vw" /></div> : null}{mobile ? <div className="absolute inset-0 -z-20 sm:hidden"><CmsImage media={mobile} priority sizes="100vw" /></div> : null}{desktop || mobile ? <div className="absolute inset-0 -z-10 bg-pine/78" /> : null}<div className="mx-auto max-w-6xl"><Badge className="bg-white/15 text-white">{intro.eyebrow}</Badge><h1 className="mt-5 max-w-4xl font-display text-4xl font-bold sm:text-6xl">{intro.heading}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-white/80">{intro.body}</p>{notes ? <div className="mt-7 max-w-3xl rounded-2xl border border-white/20 bg-white/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">{notes.eyebrow}</p><p className="mt-1 font-bold">{notes.heading}</p><p className="mt-2 text-sm leading-6 text-white/75">{notes.body}</p></div> : null}</div></section></>;
}

export default async function RoomSearchPage({ searchParams }: {
  searchParams: Promise<RawSearchParams>;
}) {
  const parsed = parseRoomSearchParams(await searchParams);
  const [response, options, cms] = await Promise.all([
    searchPublicRooms(parsed.params),
    getPublicSearchOptions(),
    getPublicCmsPage("stay"),
  ]);

  return (
    <main className="bg-cream pb-20">
      <StayIntro cms={cms} />

      <div id="stay-search" className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-5 lg:self-start">
          <SearchForm params={parsed.params} options={options} />
        </aside>

        <div className="min-w-0">
          {parsed.issues.length ? (
            <div className="mb-5 rounded-3xl border border-copper/30 bg-copper/10 p-4" role="alert">
              <p className="font-bold text-copper-strong">Một số tham số đã được đưa về giá trị an toàn:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {parsed.issues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            </div>
          ) : null}

          <Card className="mb-7 grid gap-4 p-5 sm:grid-cols-3">
            <div className="flex gap-3"><CalendarDays className="shrink-0 text-copper" aria-hidden="true" /><div><p className="font-bold">Lịch trình</p><p className="mt-1 text-sm text-muted">{parsed.params.checkIn ?? "Chưa chọn"} → {parsed.params.checkOut ?? "Chưa chọn"}</p></div></div>
            <div className="flex gap-3"><Users className="shrink-0 text-copper" aria-hidden="true" /><div><p className="font-bold">Khách</p><p className="mt-1 text-sm text-muted">{parsed.params.adults} người lớn · {parsed.params.children} trẻ em</p></div></div>
            <div className="flex gap-3"><Info className="shrink-0 text-copper" aria-hidden="true" /><div><p className="font-bold">Yêu cầu phòng</p><p className="mt-1 text-sm text-muted">{parsed.params.rooms} phòng · kiểm tra trên mọi đêm</p></div></div>
          </Card>

          <SearchResults response={response} params={parsed.params} />
        </div>
      </div>

      <section className="border-t border-line bg-surface px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-bold text-pine">Khám phá theo nhu cầu rõ ràng</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEO_LANDING_SLUGS.map((slug) => {
              const page = SEO_LANDING_PAGES[slug];
              return <Link key={slug} href={`/${slug}`} className="rounded-2xl border border-line bg-cream p-4 font-bold text-pine hover:border-copper">{page.h1} →</Link>;
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
