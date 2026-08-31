import type { Metadata } from "next";
import Link from "next/link";
import { randomBytes } from "node:crypto";
import { ArrowLeft, CircleHelp, ShieldCheck } from "lucide-react";
import { BookingRequestForm } from "@/components/trip/booking-request-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getBookingRequestReview } from "@/features/bookings/data";
import { publicBookingSelectionSchema } from "@/features/bookings/schema";
import type { PublicBookingSelection } from "@/features/bookings/types";

export const metadata: Metadata = { title: "Gửi yêu cầu chuyến đi", robots: { index: false, follow: false, noarchive: true, nocache: true } };

function scalar(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function positive(value: string | undefined, fallback: number, minimum = 1) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= minimum && parsed <= 100 ? parsed : fallback; }
function currentTimestamp() { return Date.now(); }

export default async function BookingRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const selections: PublicBookingSelection[] = [];
  const room = scalar(query.room); const motorbike = scalar(query.motorbike); const packageId = scalar(query.package);
  if (room) { const parsed = publicBookingSelectionSchema.safeParse({ type: "ROOM", source_id: room, quantity: scalar(query.rooms) }); if (parsed.success) selections.push(parsed.data); }
  if (motorbike) { const parsed = publicBookingSelectionSchema.safeParse({ type: "MOTORBIKE", source_slug: motorbike, quantity: scalar(query.motorbikes) ?? 1 }); if (parsed.success) selections.push(parsed.data); }
  if (packageId) { const optional = scalar(query.optional)?.split(",").filter(Boolean) ?? []; const parsed = publicBookingSelectionSchema.safeParse({ type: "PACKAGE", source_id: packageId, optional_component_keys: optional }); if (parsed.success) selections.push(parsed.data); }
  const defaults = { checkIn: scalar(query.check_in), checkOut: scalar(query.check_out), adults: positive(scalar(query.adults), 2), children: positive(scalar(query.children), 0, 0), rooms: positive(scalar(query.rooms), 1) };
  const review = await getBookingRequestReview({ selections, ...defaults });
  const requestToken = randomBytes(32).toString("base64url");
  const renderedAt = currentTimestamp();
  return <main className="bg-cream pb-20">
    <section className="trip-detail-hero px-4 py-10 text-white sm:px-6 sm:py-14"><div className="mx-auto max-w-5xl"><Link href="/trip-finder" className="inline-flex min-h-11 items-center gap-2 font-bold text-white/80"><ArrowLeft size={18} />Quay lại lựa chọn</Link><Badge className="mt-5 bg-white/15 text-white">YÊU CẦU CHUYẾN ĐI · CHƯA GIỮ CHỖ</Badge><h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">Gửi một yêu cầu cho toàn bộ chuyến đi.</h1><p className="mt-4 max-w-3xl text-base leading-7 text-white/80">Bạn chỉ cần gửi một lần. Đội ngũ sẽ kiểm tra riêng từng phòng, xe hoặc dịch vụ với đúng nguồn vận hành.</p></div></section>
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <aside className="lg:sticky lg:top-24"><Card className="p-5 sm:p-6"><p className="text-sm font-bold uppercase tracking-[0.1em] text-copper-strong">Bạn đang yêu cầu</p>{review.items.length ? <div className="mt-4 grid gap-4">{review.items.map((item, index) => <div key={`${item.type}-${index}`} className="border-t border-line pt-4 first:border-0 first:pt-0"><p className="font-bold text-pine">{item.name}</p>{item.context ? <p className="mt-1 text-sm text-muted">{item.context}</p> : null}<p className="mt-2 text-sm font-bold text-ink">{item.priceLabel}</p><p className="mt-1 text-xs leading-5 text-muted">{item.availabilityLabel}</p></div>)}</div> : <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><CircleHelp size={18} className="mb-2" /><strong className="block">Chưa có dịch vụ hợp lệ</strong>Hãy quay lại phòng, xe, gói hoặc Trip Finder để chọn nguồn thật.</div>}<div className="mt-5 border-t border-line pt-4 text-xs leading-5 text-muted"><p className="flex gap-2"><ShieldCheck size={16} className="shrink-0" />Giá thiếu vẫn là chưa có giá; website không đổi thành 0₫.</p></div></Card></aside>
      <section>{review.status === "ready" ? <BookingRequestForm review={review} requestToken={requestToken} renderedAt={renderedAt} defaults={defaults} /> : <Card className="p-6 text-center"><h2 className="text-2xl font-bold text-pine">Chưa thể tạo yêu cầu từ lựa chọn này</h2><p className="mt-3 leading-7 text-muted">Nguồn có thể chưa công khai hoặc đã thay đổi. Không có yêu cầu nào được tạo.</p><Link href="/trip-finder" className={buttonVariants({ size: "lg", className: "mt-6" })}>Chọn lại chuyến đi</Link></Card>}</section>
    </div>
  </main>;
}
