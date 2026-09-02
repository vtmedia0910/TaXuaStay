"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PUBLIC_ROUTES } from "@/config/routes";

export default function PackagesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main data-assistant-discovery="disabled" className="bg-cream px-4 py-16 sm:px-6">
      <Card className="mx-auto max-w-xl p-6 text-center sm:p-8">
        <AlertTriangle size={42} className="mx-auto text-copper" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold text-pine">Chưa thể tải gói dịch vụ</h1>
        <p className="mt-3 leading-7 text-muted">Không có dữ liệu nào được đoán thay. Bạn có thể thử lại hoặc tiếp tục xem Lưu trú.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={reset} className={buttonVariants({ size: "lg" })}><RefreshCw size={18} aria-hidden="true" />Thử lại</button>
          <Link href={PUBLIC_ROUTES.stay} className={buttonVariants({ variant: "secondary", size: "lg" })}>Xem Lưu trú</Link>
        </div>
      </Card>
    </main>
  );
}
