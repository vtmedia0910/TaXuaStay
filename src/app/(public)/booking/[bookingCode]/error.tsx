"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MyTripError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="grid min-h-[60svh] place-items-center bg-cream px-4 py-10 sm:px-6">
      <Card className="w-full max-w-lg p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-copper">My Trip</p>
        <h1 className="mt-2 text-2xl font-extrabold text-pine">Chưa thể tải tình trạng chuyến đi.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Bạn có thể thử lại. Nếu vẫn gặp lỗi, hãy mở lại liên kết gốc đã nhận.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2"><Button type="button" onClick={retry}>Thử lại</Button><Button asChild variant="secondary"><Link href="/">Về trang chủ</Link></Button></div>
      </Card>
    </main>
  );
}
