import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, Maximize2, Mountain, Users } from "lucide-react";
import { MediaGallery } from "@/components/media/media-gallery";
import { AvailabilitySummary } from "@/components/availability/availability-summary";
import { PriceSummary } from "@/components/pricing/price-summary";
import { RoomVerifiedSection } from "@/components/verification/room-verified-section";
import { ExactRoomVerifiedSection } from "@/components/verification/exact-room-verified-section";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPublicRoomAmenities } from "@/features/amenities/data";
import { getPublicAvailabilityQuotes } from "@/features/availability/data";
import { getPublicRoomMedia } from "@/features/media/data";
import { getPublicPropertyBySlug } from "@/features/properties/data";
import { getPublicPriceQuotes } from "@/features/pricing/data";
import { getPublicVerifiedPhysicalRoomsByRoomType } from "@/features/physical-rooms/data";
import { getPublicRoom } from "@/features/rooms/data";
import { BATHROOM_TYPE_LABELS, VIEW_TYPE_LABELS } from "@/features/search/labels";
import { buildRoomSearchUrl, buildStayContextQuery, DEFAULT_ROOM_SEARCH_PARAMS, parseRoomSearchParams, type RawSearchParams } from "@/features/search/params";
import { getPublicRoomVerificationBundle } from "@/features/verification/data";

type RoomParams = Promise<{ slug: string; roomSlug: string }>;

export async function generateMetadata({ params }: { params: RoomParams }): Promise<Metadata> {
  const { slug, roomSlug } = await params;
  const property = await getPublicPropertyBySlug(slug);
  if (!property) return { title: "Không tìm thấy phòng" };
  const room = await getPublicRoom(property.id, roomSlug);
  if (!room) return { title: "Không tìm thấy phòng" };

  return {
    title: `${room.name} — ${property.name}`,
    description: room.short_description ?? `Thông tin phòng ${room.name} tại ${property.name}.`,
    alternates: { canonical: `/homestay/${property.slug}/phong/${room.slug}` },
  };
}

export default async function RoomPage({ params, searchParams }: { params: RoomParams; searchParams: Promise<RawSearchParams> }) {
  const { slug, roomSlug } = await params;
  const pricingContext = parseRoomSearchParams(await searchParams).params;
  const property = await getPublicPropertyBySlug(slug);
  if (!property) notFound();
  const room = await getPublicRoom(property.id, roomSlug);
  if (!room) notFound();

  const [amenities, media, verification, exactRooms, priceQuotes, availabilityQuotes] = await Promise.all([
    getPublicRoomAmenities(room.id),
    getPublicRoomMedia(room.id),
    getPublicRoomVerificationBundle(room.id),
    getPublicVerifiedPhysicalRoomsByRoomType(room.id),
    getPublicPriceQuotes({ roomTypeIds: [room.id], checkIn: pricingContext.checkIn, checkOut: pricingContext.checkOut }),
    getPublicAvailabilityQuotes({ roomTypeIds: [room.id], checkIn: pricingContext.checkIn, checkOut: pricingContext.checkOut, requestedRooms: pricingContext.rooms }),
  ]);
  const relatedSearchUrl = buildRoomSearchUrl({
    ...DEFAULT_ROOM_SEARCH_PARAMS,
    checkIn: pricingContext.checkIn,
    checkOut: pricingContext.checkOut,
    adults: pricingContext.adults,
    children: pricingContext.children,
    rooms: pricingContext.rooms,
    area: property.area_name,
  });
  const contextQuery = buildStayContextQuery(pricingContext);

  return (
    <main className="bg-cream pb-20">
      <section className="bg-pine px-5 py-12 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <Link href={`/homestay/${property.slug}?${contextQuery}`} className="text-sm font-bold text-white/70 hover:text-white">← {property.name}</Link>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold sm:text-6xl">{room.name}</h1>
          {room.short_description ? <p className="mt-5 max-w-3xl text-lg leading-8 text-white/80">{room.short_description}</p> : null}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-10">
          <section>
            <h2 className="mb-5 font-display text-3xl font-bold text-pine">Hình ảnh của loại phòng</h2>
            <MediaGallery assets={media} />
          </section>
          <RoomVerifiedSection bundle={verification} />
          <ExactRoomVerifiedSection rooms={exactRooms} />
          {room.description ? (
            <section><h2 className="font-display text-3xl font-bold text-pine">Chi tiết phòng</h2><p className="mt-4 whitespace-pre-line leading-8 text-muted">{room.description}</p></section>
          ) : null}
        </div>

        <aside className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="font-display text-2xl font-bold text-pine">Thông số thực tế</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div className="flex gap-3"><Users className="text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Sức chứa</dt><dd className="text-muted">{room.capacity_adults} người lớn · {room.capacity_children} trẻ em · tối đa {room.max_guests}</dd></div></div>
              <div className="flex gap-3"><BedDouble className="text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Giường</dt><dd className="text-muted">{room.bed_count ? `${room.bed_count} · ${room.bed_type ?? "chưa ghi loại"}` : "Chưa có dữ liệu"}</dd></div></div>
              <div className="flex gap-3"><Bath className="text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Phòng tắm</dt><dd className="text-muted">{BATHROOM_TYPE_LABELS[room.bathroom_type]}</dd></div></div>
              {room.size_m2 ? <div className="flex gap-3"><Maximize2 className="text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Diện tích</dt><dd className="text-muted">{room.size_m2} m²</dd></div></div> : null}
              <div className="flex gap-3"><Mountain className="text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Hướng nhìn đã ghi nhận</dt><dd className="text-muted">{VIEW_TYPE_LABELS[room.view_type]}</dd></div></div>
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-2xl font-bold text-pine">Tiện nghi</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {room.has_private_balcony ? <Badge>Ban công riêng</Badge> : null}
              {amenities.map((amenity) => <Badge key={amenity.id}>{amenity.name}</Badge>)}
              {!room.has_private_balcony && !amenities.length ? <p className="text-sm text-muted">Chưa có thông tin tiện ích cho phòng này.</p> : null}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-2xl font-bold text-pine">Giá theo ngày</h2>
            <form method="get" className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-bold text-pine">Nhận phòng<input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 font-normal" type="date" name="check_in" defaultValue={pricingContext.checkIn} /></label>
              <label className="text-sm font-bold text-pine">Trả phòng<input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 font-normal" type="date" name="check_out" defaultValue={pricingContext.checkOut} /></label>
              <label className="text-sm font-bold text-pine">Số phòng cần<input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3 font-normal" type="number" name="rooms" min={1} max={10} defaultValue={pricingContext.rooms} /></label>
              <input type="hidden" name="adults" value={pricingContext.adults} />
              <input type="hidden" name="children" value={pricingContext.children} />
              <button className="min-h-11 rounded-full bg-pine px-5 text-sm font-bold text-white sm:col-span-3">Xem giá và tình trạng</button>
            </form>
            <div className="mt-4"><PriceSummary quote={priceQuotes.get(room.id)} /></div>
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-2xl font-bold text-pine">Tình trạng phòng theo ngày</h2>
            <div className="mt-4"><AvailabilitySummary quote={availabilityQuotes.get(room.id)} detailed /></div>
          </Card>
          <p className="rounded-3xl border border-line bg-surface p-4 text-sm leading-6 text-muted">Giá và tình trạng phòng là hai thông tin riêng. Tình trạng có thể thay đổi cho tới khi yêu cầu đặt phòng được xác nhận; trang này không giữ chỗ.</p>
          <Link href={relatedSearchUrl} className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-pine hover:bg-mist">Tìm phòng liên quan tại {property.area_name}</Link>
        </aside>
      </div>
    </main>
  );
}
