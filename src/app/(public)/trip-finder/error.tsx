"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function TripFinderError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main data-assistant-discovery="disabled" className="grid min-h-[60vh] place-items-center bg-cream px-4 py-14">
      <div className="max-w-xl text-center">
        <AlertTriangle className="mx-auto text-warning" size={44} aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold text-pine">Chưa thể tải gợi ý lúc này</h1>
        <p className="mt-3 leading-7 text-muted">Lựa chọn của bạn vẫn nằm trong đường dẫn. Hãy thử tải lại hoặc xem danh sách Lưu trú; hệ thống không dùng dữ liệu thay thế.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className={buttonVariants({ size: "lg" })}>Thử lại</button>
          <Link href="/stay" className={buttonVariants({ variant: "secondary", size: "lg" })}>Xem Lưu trú</Link>
        </div>
      </div>
    </main>
  );
}
