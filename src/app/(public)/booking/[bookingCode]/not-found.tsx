import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MyTripNotFound() {
  return (
    <main className="grid min-h-[60svh] place-items-center bg-cream px-4 py-10 sm:px-6">
      <Card className="w-full max-w-lg p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-copper">My Trip</p>
        <h1 className="mt-2 text-2xl font-extrabold text-pine">Không thể mở chuyến đi này.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Liên kết không hợp lệ, không còn quyền truy cập hoặc chuyến đi không tồn tại. Vì an toàn, chúng tôi không cung cấp thêm chi tiết.</p>
        <Button asChild className="mt-5 w-full sm:w-auto" variant="secondary"><Link href="/">Về trang chủ</Link></Button>
      </Card>
    </main>
  );
}
