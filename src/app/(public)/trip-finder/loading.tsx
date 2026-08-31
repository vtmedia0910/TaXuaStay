export default function TripFinderLoading() {
  return <main className="min-h-[60vh] bg-cream px-4 py-14 sm:px-6"><div className="mx-auto max-w-4xl animate-pulse"><div className="h-6 w-32 rounded-full bg-mist" /><div className="mt-5 h-12 max-w-2xl rounded-2xl bg-mist" /><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="h-80 rounded-3xl bg-white" /><div className="h-80 rounded-3xl bg-white" /></div><p className="sr-only" role="status">Đang đối chiếu dữ liệu chuyến đi</p></div></main>;
}
