import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, Bike, Car, Clock3, MapPin, Mountain, ParkingCircle, Wifi } from "lucide-react";
import { MediaGallery } from "@/components/media/media-gallery";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getSiteUrl } from "@/config/site";
import { getPublicPropertyAmenities } from "@/features/amenities/data";
import { getPublicPropertyMedia } from "@/features/media/data";
import { formatAccessCertainty } from "@/features/properties/access";
import { getPublicPropertyBySlug } from "@/features/properties/data";
import { getPublicRoomsByProperty } from "@/features/rooms/data";
import { buildRoomSearchUrl, DEFAULT_ROOM_SEARCH_PARAMS } from "@/features/search/params";
import { buildPropertyStructuredData, serializeStructuredData } from "@/features/search/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);
  if (!property) return { title: "Không tìm thấy nơi lưu trú" };

  return {
    title: property.name,
    description: property.short_description ?? `Thông tin thực tế về ${property.name} tại ${property.area_name}.`,
    alternates: { canonical: `/homestay/${property.slug}` },
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);
  if (!property) notFound();

  const [rooms, amenities, media] = await Promise.all([
    getPublicRoomsByProperty(property.id),
    getPublicPropertyAmenities(property.id),
    getPublicPropertyMedia(property.id),
  ]);

  const facilities = [
    property.wifi && "Wi-Fi",
    property.parking === "yes" && "Chỗ đỗ xe",
    property.breakfast && "Bữa sáng",
    property.restaurant && "Nhà hàng",
    property.bbq && "BBQ",
  ].filter((value): value is string => Boolean(value));
  const canonicalUrl = new URL(`/homestay/${property.slug}`, getSiteUrl()).toString();
  const structuredData = buildPropertyStructuredData(property, media, canonicalUrl);
  const areaSearchUrl = buildRoomSearchUrl({
    ...DEFAULT_ROOM_SEARCH_PARAMS,
    area: property.area_name,
  });

  return (
    <main className="bg-cream pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(structuredData) }}
      />
      <section className="bg-pine px-5 py-12 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/15 text-white">{property.property_type}</Badge>
            {property.is_featured ? <Badge className="bg-copper text-white">Nổi bật</Badge> : null}
          </div>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-bold sm:text-6xl">{property.name}</h1>
          <p className="mt-4 flex items-center gap-2 text-white/75"><MapPin size={18} aria-hidden="true" />{property.area_name}{property.address ? ` · ${property.address}` : ""}</p>
          {property.short_description ? <p className="mt-6 max-w-3xl text-lg leading-8 text-white/85">{property.short_description}</p> : null}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-10">
          <section aria-labelledby="gallery-title">
            <h2 id="gallery-title" className="mb-5 font-display text-3xl font-bold text-pine">Hình ảnh đã duyệt</h2>
            <MediaGallery assets={media} />
          </section>

          {property.description ? (
            <section>
              <h2 className="font-display text-3xl font-bold text-pine">Về nơi lưu trú</h2>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-muted">{property.description}</p>
            </section>
          ) : null}

          <section aria-labelledby="rooms-title">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="rooms-title" className="font-display text-3xl font-bold text-pine">Loại phòng</h2>
              <Link href={areaSearchUrl} className="inline-flex min-h-11 items-center text-sm font-bold text-copper-strong hover:text-pine">Tìm phòng cùng khu vực →</Link>
            </div>
            {rooms.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {rooms.map((room) => (
                  <Card key={room.id} className="p-5">
                    <BedDouble className="text-copper" aria-hidden="true" />
                    <h3 className="mt-4 font-display text-2xl font-bold text-pine">{room.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{room.short_description ?? "Thông tin phòng đang được hoàn thiện."}</p>
                    <p className="mt-4 text-sm font-bold text-ink">Tối đa {room.max_guests} khách</p>
                    <Link href={`/homestay/${property.slug}/phong/${room.slug}`} className="mt-5 inline-flex min-h-11 items-center font-bold text-copper-strong hover:text-pine">Xem phòng →</Link>
                  </Card>
                ))}
              </div>
            ) : <p className="mt-4 text-muted">Chưa có loại phòng đã xuất bản.</p>}
          </section>
        </div>

        <aside className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="font-display text-2xl font-bold text-pine">Thông tin nhanh</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div className="flex gap-3"><Clock3 className="shrink-0 text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Nhận / trả phòng</dt><dd className="mt-1 text-muted">{property.check_in_time.slice(0, 5)} / {property.check_out_time.slice(0, 5)}</dd></div></div>
              <div className="flex gap-3"><Car className="shrink-0 text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Ô tô tiếp cận</dt><dd className="mt-1 text-muted">{formatAccessCertainty(property.car_access)}</dd></div></div>
              <div className="flex gap-3"><Bike className="shrink-0 text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Xe máy tiếp cận</dt><dd className="mt-1 text-muted">{formatAccessCertainty(property.motorbike_access)}</dd></div></div>
              <div className="flex gap-3"><ParkingCircle className="shrink-0 text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Chỗ đỗ xe</dt><dd className="mt-1 text-muted">{formatAccessCertainty(property.parking)}</dd></div></div>
              <div className="flex gap-3"><Mountain className="shrink-0 text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Đường vào sơ bộ</dt><dd className="mt-1 text-muted">{property.road_access_grade.toUpperCase()} · chưa phải Road Verified</dd></div></div>
              {property.wifi ? <div className="flex gap-3"><Wifi className="shrink-0 text-copper" size={20} aria-hidden="true" /><div><dt className="font-bold">Wi-Fi</dt><dd className="mt-1 text-muted">Có</dd></div></div> : null}
            </dl>
          </Card>

          {facilities.length || amenities.length ? (
            <Card className="p-5">
              <h2 className="font-display text-2xl font-bold text-pine">Tiện nghi</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[...facilities, ...amenities.map((amenity) => amenity.name)].map((name) => <Badge key={name}>{name}</Badge>)}
              </div>
            </Card>
          ) : null}

          {property.google_maps_url ? (
            <a href={property.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full bg-copper px-5 text-sm font-bold text-white hover:bg-copper-strong">Mở Google Maps</a>
          ) : null}

          {property.public_phone || property.public_zalo_url ? (
            <Card className="p-5">
              <h2 className="font-display text-2xl font-bold text-pine">Liên hệ công khai</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {property.public_phone ? (
                  <a href={`tel:${property.public_phone.replace(/[^+\d]/g, "")}`} className="inline-flex min-h-11 items-center font-bold text-copper-strong hover:text-pine">
                    {property.public_phone}
                  </a>
                ) : null}
                {property.public_zalo_url ? (
                  <a href={property.public_zalo_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-bold text-copper-strong hover:text-pine">
                    Mở Zalo
                  </a>
                ) : null}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
