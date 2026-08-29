import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info, ListFilter } from "lucide-react";
import { SearchResults } from "@/components/search/search-results";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { searchPublicRooms } from "@/features/search/data";
import { parseRoomSearchParams, type RawSearchParams } from "@/features/search/params";
import {
  getSeoLandingConfig,
  getSeoLandingSearchParams,
  SEO_LANDING_SLUGS,
} from "@/features/search/seo";

type SeoPageProps = {
  params: Promise<{ seoSlug: string }>;
  searchParams: Promise<RawSearchParams>;
};

export function generateStaticParams() {
  return SEO_LANDING_SLUGS.map((seoSlug) => ({ seoSlug }));
}

export async function generateMetadata({ params }: SeoPageProps): Promise<Metadata> {
  const { seoSlug } = await params;
  const config = getSeoLandingConfig(seoSlug);
  if (!config) return { title: "Không tìm thấy trang", robots: { index: false, follow: false } };
  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: `/${config.slug}` },
    openGraph: {
      title: config.title,
      description: config.description,
      url: `/${config.slug}`,
    },
  };
}

export default async function SeoLandingPage({ params, searchParams }: SeoPageProps) {
  const { seoSlug } = await params;
  const config = getSeoLandingConfig(seoSlug);
  if (!config) notFound();

  const page = parseRoomSearchParams({ page: (await searchParams).page }).params.page;
  const search = getSeoLandingSearchParams(config, page);
  const response = await searchPublicRooms(search, config.preset);

  return (
    <main className="bg-cream pb-20">
      <section className="bg-pine px-5 py-12 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Badge className="bg-white/15 text-white">Chọn theo nhu cầu</Badge>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold sm:text-6xl">{config.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/80">{config.intro}</p>
          <Link href="/tim-phong" className={buttonVariants({ variant: "accent", size: "lg", className: "mt-7" })}>
            MỞ BỘ LỌC TÌM PHÒNG
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <Card className="flex gap-3 p-5">
            <ListFilter className="shrink-0 text-copper" aria-hidden="true" />
            <div><h2 className="font-bold text-pine">Cách chọn phòng</h2><p className="mt-2 text-sm leading-6 text-muted">{config.criteria}</p></div>
          </Card>
          <Card className="flex gap-3 p-5">
            <Info className="shrink-0 text-copper" aria-hidden="true" />
            <div><h2 className="font-bold text-pine">Thông tin cần lưu ý</h2><p className="mt-2 text-sm leading-6 text-muted">{config.note ?? "Kết quả chưa bao gồm giá hoặc tình trạng phòng theo ngày; cần xác nhận trực tiếp với nơi lưu trú."}</p></div>
          </Card>
        </div>

        <SearchResults response={response} params={search} landingSlug={config.slug} />

        <nav className="mt-14 border-t border-line pt-8" aria-label="Trang khám phá liên quan">
          <h2 className="font-display text-2xl font-bold text-pine">Khám phá liên quan</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {config.related.map((slug) => {
              const related = getSeoLandingConfig(slug);
              return related ? <Link key={slug} href={`/${slug}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>{related.h1}</Link> : null;
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
