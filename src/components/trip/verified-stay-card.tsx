import Link from "next/link";
import { CalendarCheck, Eye, ImageIcon, MapPin } from "lucide-react";
import { AvailabilitySummary } from "@/components/availability/availability-summary";
import { PriceSummary } from "@/components/pricing/price-summary";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildRoomPath } from "@/config/routes";
import type { RoomSearchResult } from "@/features/search/types";
import { CLOUD_VIEW_FROM_BED_LABELS, getCloudViewLabel } from "@/features/verification/policy";

export function VerifiedStayCard({ result }: { result: RoomSearchResult }) {
  const cloud = result.cloudView;
  if (!cloud) return null;

  return (
    <article>
      <Card className="h-full overflow-hidden">
        {result.image ? (
          // Public search media is HTTPS-only and already filtered by RLS.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.image.thumbnail_url ?? result.image.url}
            alt={result.image.alt_text}
            loading="lazy"
            className="aspect-[4/3] w-full bg-mist object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center bg-mist text-muted">
            <span className="grid justify-items-center gap-2 text-sm"><ImageIcon aria-hidden="true" />Chưa có ảnh phòng công khai</span>
          </div>
        )}
        <div className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-copper-strong"><MapPin size={16} aria-hidden="true" />{result.property.name} · {result.property.area_name}</p>
          <h3 className="mt-2 text-2xl font-bold text-pine">{result.room.name}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-pine text-white"><Eye size={14} aria-hidden="true" />Cloud View {Number(cloud.score_10).toFixed(1)} / 10</Badge>
            <Badge>{getCloudViewLabel(Number(cloud.score_10))}</Badge>
          </div>
          <dl className="mt-4 grid gap-2 text-sm text-muted">
            <div className="flex items-center justify-between gap-3"><dt>View từ giường</dt><dd className="font-semibold text-ink">{CLOUD_VIEW_FROM_BED_LABELS[cloud.view_from_bed]}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="flex items-center gap-1"><CalendarCheck size={15} aria-hidden="true" />Xác minh</dt><dd className="font-semibold text-ink">{new Date(cloud.verified_at).toLocaleDateString("vi-VN")}</dd></div>
          </dl>
          {result.priceQuote ? <div className="mt-4"><PriceSummary quote={result.priceQuote} compact /></div> : null}
          {result.availabilityQuote ? <div className="mt-3"><AvailabilitySummary quote={result.availabilityQuote} /></div> : null}
          <Link href={buildRoomPath(result.property.slug, result.room.slug)} className={buttonVariants({ size: "sm", className: "mt-5" })}>
            Xem phòng và bằng chứng
          </Link>
        </div>
      </Card>
    </article>
  );
}
