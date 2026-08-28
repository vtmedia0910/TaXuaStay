import Link from "next/link";
import { Bath, BedDouble, Car, ImageIcon, MapPin, Mountain, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ACCESS_FILTER_LABELS,
  ACCESS_FILTER_MARKS,
  BATHROOM_TYPE_LABELS,
  VIEW_TYPE_LABELS,
} from "@/features/search/labels";
import type { RoomSearchResult } from "@/features/search/types";

export function SearchResultCard({ result }: { result: RoomSearchResult }) {
  const { room, property, image } = result;
  const amenities = [...result.roomAmenities, ...result.propertyAmenities]
    .filter((amenity, index, values) => values.findIndex((item) => item.id === amenity.id) === index)
    .slice(0, 4);

  return (
    <article>
      <Card className="h-full overflow-hidden">
        {image ? (
          // Search media is HTTPS-only and exposed by the approved-media RLS policy.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.thumbnail_url ?? image.url}
            alt={image.alt_text}
            loading="lazy"
            className="aspect-[4/3] w-full bg-mist object-cover"
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center bg-mist text-muted">
            <span className="grid justify-items-center gap-2 text-sm"><ImageIcon aria-hidden="true" />Chưa có ảnh phòng đã duyệt</span>
          </div>
        )}

        <div className="grid gap-5 p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-copper-strong">
              <MapPin size={16} aria-hidden="true" />{property.name} · {property.area_name}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-pine">{room.name}</h2>
            {room.short_description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{room.short_description}</p> : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="flex items-center gap-1 font-bold"><Users size={16} aria-hidden="true" />Sức chứa</dt><dd className="mt-1 text-muted">Tối đa {room.max_guests} khách</dd></div>
            <div><dt className="flex items-center gap-1 font-bold"><Bath size={16} aria-hidden="true" />Phòng tắm</dt><dd className="mt-1 text-muted">{BATHROOM_TYPE_LABELS[room.bathroom_type]}</dd></div>
            <div><dt className="flex items-center gap-1 font-bold"><Mountain size={16} aria-hidden="true" />View cơ bản</dt><dd className="mt-1 text-muted">{VIEW_TYPE_LABELS[room.view_type]}</dd></div>
            <div><dt className="flex items-center gap-1 font-bold"><Car size={16} aria-hidden="true" />Ô tô</dt><dd className="mt-1 text-muted"><span aria-hidden="true">{ACCESS_FILTER_MARKS[property.car_access]}</span> {ACCESS_FILTER_LABELS[property.car_access]}</dd></div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {room.has_private_balcony ? <Badge>Ban công riêng</Badge> : null}
            {room.bed_count ? <Badge><BedDouble size={14} aria-hidden="true" />{room.bed_count} giường</Badge> : null}
            {amenities.map((amenity) => <Badge key={amenity.id}>{amenity.name}</Badge>)}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/homestay/${property.slug}/phong/${room.slug}`}
              className={buttonVariants({ variant: "accent", size: "sm" })}
            >
              XEM PHÒNG
            </Link>
            <Link href={`/homestay/${property.slug}`} className="inline-flex min-h-11 items-center text-sm font-bold text-pine hover:text-copper-strong">
              Xem nơi lưu trú →
            </Link>
          </div>
        </div>
      </Card>
    </article>
  );
}
