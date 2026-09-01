"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleMore } from "lucide-react";
import { PUBLIC_ROUTES } from "@/config/routes";

export function AssistantLauncher() {
  const pathname = usePathname();
  if (pathname === PUBLIC_ROUTES.assistant || pathname.startsWith("/booking") || pathname === PUBLIC_ROUTES.tripFinder) return null;

  return (
    <Link
      href={PUBLIC_ROUTES.assistant}
      className="fixed right-4 z-40 inline-flex min-h-14 items-center gap-2 rounded-full border border-white/30 bg-pine px-4 font-bold text-white shadow-[0_1rem_2.5rem_rgb(3_31_63_/_28%)] transition hover:bg-pine-strong motion-reduce:transition-none sm:right-6"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
      aria-label="Mở Trợ lý Tà Xùa Trip"
    >
      <MessageCircleMore size={22} aria-hidden="true" />
      <span className="max-sm:sr-only">Hỏi Tà Xùa Trip</span>
    </Link>
  );
}
