import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Info, Users } from "lucide-react";
import { SearchForm } from "@/components/search/search-form";
import { SearchResults } from "@/components/search/search-results";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicSearchOptions, searchPublicRooms } from "@/features/search/data";
import { parseRoomSearchParams, type RawSearchParams } from "@/features/search/params";
import { SEO_LANDING_PAGES, SEO_LANDING_SLUGS } from "@/features/search/seo";

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const hasQuery = Object.values(raw).some((value) => value !== undefined);
  return {
    title: "Tìm phòng Tà Xùa theo nhu cầu",
    description: "Tìm room type tại Tà Xùa theo sức chứa, loại property, khu vực, phòng tắm, view cơ bản, đường vào và tiện ích đang được ghi nhận.",
    alternates: { canonical: "/tim-phong" },
    robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function RoomSearchPage({ searchParams }: {
  searchParams: Promise<RawSearchParams>;
}) {
  const parsed = parseRoomSearchParams(await searchParams);
  const [response, options] = await Promise.all([
    searchPublicRooms(parsed.params),
    getPublicSearchOptions(),
  ]);

  return (
    <main className="bg-cream pb-20">
      <section className="bg-pine px-5 py-12 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Badge className="bg-white/15 text-white">PHASE 3 · ROOM-FIRST</Badge>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold sm:text-6xl">Tìm loại phòng phù hợp nhu cầu</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/80">
            Bắt đầu từ room type, sức chứa và các facts đã xuất bản. Ngày đi được giữ trong URL để dùng cho availability ở phase sau, không phải cam kết còn phòng.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
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
            <div className="flex gap-3"><Info className="shrink-0 text-copper" aria-hidden="true" /><div><p className="font-bold">Yêu cầu phòng</p><p className="mt-1 text-sm text-muted">{parsed.params.rooms} phòng · cần xác nhận trực tiếp</p></div></div>
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
