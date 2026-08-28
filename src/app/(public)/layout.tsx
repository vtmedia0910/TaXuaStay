import Link from "next/link";
import { MountainSnow } from "lucide-react";
import { SITE } from "@/config/site";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-3 text-pine">
            <span className="grid size-10 place-items-center rounded-full bg-pine text-white">
              <MountainSnow size={20} aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-bold tracking-[0.12em]">{SITE.name}</span>
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-pine hover:bg-white/45"
          >
            Quản trị
          </Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-line bg-pine px-5 py-6 text-sm text-white/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-white">{SITE.name}</p>
          <p>Ứng dụng độc lập dành cho chỗ ở tại Tà Xùa.</p>
        </div>
      </footer>
    </div>
  );
}
