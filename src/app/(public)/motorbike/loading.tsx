export default function MotorbikeLoading() {
  return (
    <main className="min-h-dvh bg-cream" aria-busy="true" aria-label="Đang tải thông tin xe máy">
      <div className="trip-detail-hero h-80 animate-pulse motion-reduce:animate-none" />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="overflow-hidden rounded-3xl border border-line bg-white"><div className="aspect-[4/3] animate-pulse bg-mist motion-reduce:animate-none" /><div className="grid gap-3 p-5"><div className="h-7 w-2/3 animate-pulse rounded bg-mist motion-reduce:animate-none" /><div className="h-4 w-full animate-pulse rounded bg-mist motion-reduce:animate-none" /><div className="h-12 animate-pulse rounded-full bg-pine-soft motion-reduce:animate-none" /></div></div>)}
      </div>
    </main>
  );
}
