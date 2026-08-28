import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { buildRoomSearchUrl } from "@/features/search/params";
import { buildSeoLandingPageUrl } from "@/features/search/seo";
import type { RoomSearchParams } from "@/features/search/types";

export function SearchPagination({ params, totalPages, landingSlug }: {
  params: RoomSearchParams;
  totalPages: number;
  landingSlug?: string;
}) {
  if (totalPages <= 1) return null;
  const href = (page: number) => landingSlug
    ? buildSeoLandingPageUrl(landingSlug, page)
    : buildRoomSearchUrl(params, page);

  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Phân trang kết quả phòng">
      {params.page > 1 ? (
        <Link href={href(params.page - 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          <ChevronLeft size={17} aria-hidden="true" />Trang trước
        </Link>
      ) : <span />}
      <p className="text-sm font-bold text-muted">Trang {params.page} / {totalPages}</p>
      {params.page < totalPages ? (
        <Link href={href(params.page + 1)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Trang sau<ChevronRight size={17} aria-hidden="true" />
        </Link>
      ) : <span />}
    </nav>
  );
}
