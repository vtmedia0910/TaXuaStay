import { Card } from "@/components/ui/card";

export default function PackagesLoading() {
  return <main className="bg-cream pb-16" aria-busy="true" aria-label="Đang tải gói dịch vụ">
    <section className="trip-detail-hero px-4 py-14 sm:px-6 sm:py-20"><div className="mx-auto max-w-7xl"><div className="h-6 w-44 animate-pulse rounded-full bg-white/20 motion-reduce:animate-none" /><div className="mt-6 h-12 max-w-3xl animate-pulse rounded-2xl bg-white/20 motion-reduce:animate-none" /><div className="mt-4 h-6 max-w-xl animate-pulse rounded-xl bg-white/15 motion-reduce:animate-none" /></div></section>
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="h-9 max-w-lg animate-pulse rounded-xl bg-pine/10 motion-reduce:animate-none" /><div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <Card key={item} className="overflow-hidden"><div className="aspect-[16/10] animate-pulse bg-pine/10 motion-reduce:animate-none" /><div className="grid gap-3 p-5"><div className="h-7 w-2/3 animate-pulse rounded bg-pine/10 motion-reduce:animate-none" /><div className="h-5 w-full animate-pulse rounded bg-pine/10 motion-reduce:animate-none" /><div className="h-12 w-full animate-pulse rounded-full bg-pine/10 motion-reduce:animate-none" /></div></Card>)}</div></section>
  </main>;
}
