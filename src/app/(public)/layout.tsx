import Link from "next/link";
import { MountainSnow } from "lucide-react";
import { SITE } from "@/config/site";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky inset-x-0 top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-3 text-pine">
            <span className="grid size-10 place-items-center rounded-full bg-pine text-white">
              <MountainSnow size={20} aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-[0.12em]">{SITE.name}</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Điều hướng chính">
            <Link href="/tim-phong" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-pine hover:bg-pine-soft">Tìm phòng</Link>
            <Link href="/verified" className="hidden min-h-11 items-center rounded-full px-4 text-sm font-bold text-pine hover:bg-pine-soft md:inline-flex">Verified Standard</Link>
            <Link href="/homestay-ta-xua" className="hidden min-h-11 items-center rounded-full px-4 text-sm font-bold text-pine hover:bg-pine-soft sm:inline-flex">Khám phá</Link>
            <Link href="/admin/login" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-muted hover:bg-pine-soft hover:text-pine">Quản trị</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-line bg-pine px-5 py-6 text-sm text-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <p className="font-bold text-white">{SITE.name}</p>
          <nav className="flex flex-wrap gap-4" aria-label="Liên kết cuối trang">
            <Link href="/tim-phong" className="hover:text-white">Tìm phòng</Link>
            <Link href="/homestay-ta-xua" className="hover:text-white">Homestay Tà Xùa</Link>
            <Link href="/khach-san-ta-xua" className="hover:text-white">Khách sạn Tà Xùa</Link>
            <Link href="/verified" className="hover:text-white">Verified Standard</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
