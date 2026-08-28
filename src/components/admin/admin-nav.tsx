import Link from "next/link";
import { CircleGauge, ExternalLink, MountainSnow } from "lucide-react";
import { logoutAction } from "@/features/admin/auth-actions";

const links = [
  { label: "Tổng quan", href: "/admin", icon: CircleGauge },
  { label: "Trang chủ", href: "/", icon: ExternalLink },
] as const;

export function AdminNav() {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-pine p-4 text-white lg:block">
        <Link href="/admin" className="flex min-h-12 items-center gap-3 font-display text-lg font-bold">
          <MountainSnow size={22} aria-hidden="true" />
          TÀ XÙA STAY
        </Link>
        <nav className="mt-6 grid gap-1" aria-label="Admin">
          {links.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 items-center gap-3 rounded-2xl px-3 font-bold text-white/85 hover:bg-white/10"
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <form className="mt-8" action={logoutAction}>
          <button className="min-h-11 px-3 text-sm font-bold text-white/70 hover:text-white">
            Đăng xuất
          </button>
        </form>
      </aside>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Admin di động"
      >
        {links.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-center text-xs font-bold text-pine"
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
