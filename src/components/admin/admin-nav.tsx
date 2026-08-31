import Link from "next/link";
import {
  BedDouble,
  CircleGauge,
  ExternalLink,
  House,
  ImageIcon,
  MountainSnow,
  BadgeDollarSign,
  CalendarCheck,
  DoorOpen,
  MapPinned,
  Settings,
  ShieldCheck,
  ListChecks,
  FilePenLine,
  Sparkles,
  Handshake,
  ChartNoAxesCombined,
  Bike,
} from "lucide-react";
import { logoutAction } from "@/features/admin/auth-actions";
import type { AdminRole } from "@/features/admin/authz";

const contentLinks = [
  { label: "Tổng quan", href: "/admin", icon: CircleGauge },
  { label: "Điểm đến", href: "/admin/destinations", icon: MapPinned },
  { label: "Homestays", href: "/admin/properties", icon: House },
  { label: "Phòng", href: "/admin/rooms", icon: BedDouble },
  { label: "Room ID", href: "/admin/physical-rooms", icon: DoorOpen },
  { label: "Amenities", href: "/admin/amenities", icon: Sparkles },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Verification", href: "/admin/verification", icon: ShieldCheck },
  { label: "Hồ sơ phòng", href: "/admin/room-profiles", icon: ListChecks },
  { label: "Giá", href: "/admin/rates", icon: BadgeDollarSign },
  { label: "Chi phí & biên", href: "/admin/economics", icon: ChartNoAxesCombined },
  { label: "Tình trạng", href: "/admin/availability", icon: CalendarCheck },
  { label: "Nhà cung cấp", href: "/admin/suppliers", icon: Handshake },
  { label: "Xe máy", href: "/admin/motorbike", icon: Bike },
] as const;

const cmsLinks = [
  { label: "Nội dung web", href: "/admin/content", icon: FilePenLine },
  { label: "Media website", href: "/admin/site-media", icon: ImageIcon },
] as const;

const adminLinks = [{ label: "Cấu hình", href: "/admin/settings", icon: Settings }] as const;
const publicLink = { label: "Trang chủ", href: "/", icon: ExternalLink } as const;

export function AdminNav({ role }: { role: AdminRole }) {
  const links = role === "admin" ? [...contentLinks, ...cmsLinks, ...adminLinks, publicLink] : [...contentLinks, ...cmsLinks, publicLink];
  const tailLinks = role === "admin" ? [...adminLinks, publicLink] : [publicLink];

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-pine p-4 text-white lg:block">
        <Link href="/admin" className="flex min-h-12 items-center gap-3 font-display text-lg font-bold">
          <MountainSnow size={22} aria-hidden="true" />
          TÀ XÙA TRIP
        </Link>
        <nav className="mt-6 grid gap-1" aria-label="Admin">
          {contentLinks.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-12 items-center gap-3 rounded-2xl px-3 font-bold text-white/85 hover:bg-white/10"
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          ))}
          <p className="mt-4 px-3 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/45">Nội dung website</p>
          {cmsLinks.map(({ label, href, icon: Icon }) => (
            <Link key={`group-${href}`} href={href} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 font-bold text-white/85 hover:bg-white/10"><Icon size={20} aria-hidden="true" />{label}</Link>
          ))}
          {tailLinks.map(({ label, href, icon: Icon }) => (
            <Link key={`tail-${href}`} href={href} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 font-bold text-white/85 hover:bg-white/10"><Icon size={20} aria-hidden="true" />{label}</Link>
          ))}
        </nav>
        <form className="mt-8" action={logoutAction}>
          <button className="min-h-11 px-3 text-sm font-bold text-white/70 hover:text-white">
            Đăng xuất
          </button>
        </form>
      </aside>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex overflow-x-auto border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Admin di động"
      >
        {links.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-16 min-w-20 flex-1 flex-col items-center justify-center gap-1 px-2 text-center text-xs font-bold text-pine"
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
