import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { TripLogo } from "@/components/trip/trip-logo";
import { buttonVariants } from "@/components/ui/button";
import { PUBLIC_ROUTES } from "@/config/routes";

const navigation = [
  { label: "Khám phá", href: "/#explore" },
  { label: "Lưu trú", href: PUBLIC_ROUTES.stay },
  { label: "Combo", href: "/#services" },
  { label: "Xe khách", href: "/#services" },
  { label: "Xe máy", href: "/#services" },
  { label: "Cẩm nang", href: PUBLIC_ROUTES.verification },
  { label: "Về chúng tôi", href: "/#about" },
] as const;

export function TripHeader() {
  return (
    <header className="trip-site-header sticky inset-x-0 top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href={PUBLIC_ROUTES.home} className="mr-auto inline-flex min-h-11 min-w-0 items-center" aria-label="Tà Xùa Trip — Trang chủ">
          <TripLogo />
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Điều hướng chính">
          {navigation.map((item) => (
            <Link key={item.label} href={item.href} className="trip-site-nav-link inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-ink hover:bg-pine-soft hover:text-pine">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href={PUBLIC_ROUTES.stay} className={buttonVariants({ size: "sm", className: "trip-site-search-cta max-sm:hidden" })}>
          <Search size={17} aria-hidden="true" />Tìm chuyến đi
        </Link>

        <details className="trip-mobile-menu group relative xl:hidden">
          <summary className="trip-site-menu-toggle grid size-11 cursor-pointer list-none place-items-center rounded-full border border-line text-pine marker:hidden" aria-label="Mở menu">
            <Menu className="group-open:hidden" size={21} aria-hidden="true" />
            <X className="hidden group-open:block" size={21} aria-hidden="true" />
          </summary>
          <div className="trip-mobile-menu-panel absolute right-0 top-[calc(100%+0.75rem)] w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-line bg-white p-3 shadow-xl">
            <nav className="grid" aria-label="Điều hướng di động">
              {navigation.map((item) => (
                <Link key={item.label} href={item.href} className="inline-flex min-h-12 items-center rounded-2xl px-4 font-semibold text-ink hover:bg-pine-soft hover:text-pine">
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link href={PUBLIC_ROUTES.stay} className={buttonVariants({ className: "mt-3 w-full sm:hidden" })}>
              Tìm chuyến đi
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
