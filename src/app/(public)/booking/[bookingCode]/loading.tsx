import { Card } from "@/components/ui/card";

export default function MyTripLoading() {
  return (
    <main className="min-h-[60svh] bg-cream px-4 py-8 sm:px-6" aria-busy="true" aria-label="Đang tải tình trạng chuyến đi">
      <div className="mx-auto grid max-w-5xl animate-pulse gap-4">
        <div className="h-4 w-36 rounded-full bg-line" />
        <div className="h-9 w-64 max-w-full rounded-xl bg-line" />
        <Card className="mt-2 grid gap-3 p-5"><div className="h-5 w-40 rounded bg-line" /><div className="h-8 w-72 max-w-full rounded bg-line" /><div className="h-4 w-full rounded bg-line" /></Card>
        <p className="text-sm text-muted">Đang tải tình trạng chuyến đi…</p>
      </div>
    </main>
  );
}
