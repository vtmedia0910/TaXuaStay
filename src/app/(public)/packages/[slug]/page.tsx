import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleHelp, ExternalLink, PackageCheck, ShieldQuestion } from "lucide-react";
import { CmsImage } from "@/components/cms/cms-image";
import { PackageSelectionSheet } from "@/components/trip/package-selection-sheet";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicPageRobots } from "@/config/seo";
import { getPublicPackageBySlug, getPublicPackageFactsByIds, getPublicPackageQuote } from "@/features/packages/data";
import { PACKAGE_AVAILABILITY_LABELS, PACKAGE_COMPONENT_LABELS, formatPackageVnd } from "@/features/packages/policy";
import { packageQuoteInputSchema, packageSlugSchema } from "@/features/packages/schema";

function scalar(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!packageSlugSchema.safeParse(slug).success) return { title: "Không tìm thấy gói" };
  const item = await getPublicPackageBySlug(slug);
  if (!item) return { title: "Không tìm thấy gói" };
  return {
    title: `${item.name} | Combo Tà Xùa`,
    description: item.proposition,
    alternates: { canonical: `/packages/${item.slug}` },
    robots: getPublicPageRobots(),
    openGraph: { title: `${item.name} | Tà Xùa Trip`, description: item.proposition },
  };
}

export default async function PackageDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  if (!packageSlugSchema.safeParse(slug).success) notFound();
  const item = await getPublicPackageBySlug(slug);
  if (!item) notFound();
  const query = await searchParams;
  const facts = await getPublicPackageFactsByIds([item.id]);
  const optionalValue = query.optional;
  const parsed = packageQuoteInputSchema.safeParse({
    check_in: scalar(query.check_in), check_out: scalar(query.check_out),
    adults: scalar(query.adults) ?? 2, children: scalar(query.children) ?? 0,
    rooms: scalar(query.rooms) ?? 1, selected_optional_component_keys: optionalValue ?? [],
  });
  const quote = parsed.success ? await getPublicPackageQuote({ package: item, quoteInput: { package_id: item.id, ...parsed.data } }) : null;
  const optionalComponents = facts.components.filter((component) => !component.is_required);
  const selected = new Set(parsed.success ? parsed.data.selected_optional_component_keys : []);
  const visibleComponents = facts.components.filter((component) => component.is_required || selected.has(component.component_key));
  return <main className="bg-cream pb-28 sm:pb-16">
    <section className="bg-white"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><Link href="/packages" className="inline-flex min-h-11 items-center gap-2 font-bold text-pine"><ArrowLeft size={18} />Tất cả gói</Link></div><div className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">{item.image ? <div className="relative aspect-[16/11] overflow-hidden rounded-[2rem] bg-mist"><CmsImage media={item.image} className="size-full" sizes="(min-width: 1024px) 700px, 100vw" priority /></div> : <div className="grid aspect-[16/11] place-items-center rounded-[2rem] bg-mist text-pine"><PackageCheck size={72} strokeWidth={1.3} /><span className="sr-only">Ảnh đang được cập nhật</span></div>}<div><Badge className="bg-pine-soft text-pine">{item.destination_name}</Badge><h1 className="mt-4 text-4xl font-bold leading-tight text-pine sm:text-6xl">{item.name}</h1><p className="mt-4 text-xl leading-8 text-ink">{item.proposition}</p>{item.description ? <p className="mt-4 leading-7 text-muted">{item.description}</p> : null}<div className="mt-6"><PackageSelectionSheet action={`/packages/${item.slug}`} optionalComponents={optionalComponents} defaults={parsed.success ? { checkIn: parsed.data.check_in, checkOut: parsed.data.check_out, adults: parsed.data.adults, children: parsed.data.children, rooms: parsed.data.rooms, optional: parsed.data.selected_optional_component_keys } : undefined} label={parsed.success ? "Đổi cấu hình" : "Chọn ngày & số khách"} /></div></div></div></section>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem] lg:items-start"><section aria-labelledby="package-components-title"><p className="text-sm font-bold uppercase tracking-[0.14em] text-copper-strong">Bao gồm những gì</p><h2 id="package-components-title" className="mt-2 text-3xl font-bold text-pine sm:text-4xl">Từng thành phần được nói rõ.</h2><div className="mt-6 grid gap-4">{visibleComponents.map((component) => {
      const resolution = quote?.components.find((line) => line.component_key === component.component_key);
      return <Card key={component.component_key} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge>{PACKAGE_COMPONENT_LABELS[component.component_type]}</Badge><Badge className={component.is_required ? "bg-pine-soft text-pine" : "bg-mist text-muted"}>{component.is_required ? "Bao gồm" : "Đã chọn thêm"}</Badge></div><h3 className="mt-3 text-2xl font-bold text-pine">{component.quantity} × {component.source_name}</h3>{component.source_parent_name ? <p className="mt-1 text-sm text-muted">{component.source_parent_name}</p> : null}</div>{component.source_path ? <Link href={component.source_path} className="inline-flex min-h-11 items-center font-bold text-pine">Xem nguồn →</Link> : null}</div>{component.public_copy_override ?? component.custom_description ? <p className="mt-4 text-sm leading-6 text-ink">{component.public_copy_override ?? component.custom_description}</p> : null}<p className="mt-4 flex items-start gap-2 rounded-2xl bg-mist/70 p-3 text-sm leading-6 text-muted"><ShieldQuestion size={17} className="mt-1 shrink-0 text-copper" />{resolution?.caveat ?? "Chọn ngày để kiểm tra tình trạng theo thông tin hiện có."}</p></Card>;
    })}</div>{optionalComponents.some((component) => !selected.has(component.component_key)) ? <Card className="mt-4 border-dashed p-5"><h3 className="font-bold text-pine">Có lựa chọn thêm chưa chọn</h3><p className="mt-2 text-sm leading-6 text-muted">Mở “Đổi cấu hình” để chọn; giá chỉ được báo nếu có quy tắc đúng với lựa chọn đó.</p></Card> : null}</section>
      <aside className="lg:sticky lg:top-24"><Card className="p-5 sm:p-6"><p className="text-sm font-bold uppercase tracking-[0.12em] text-copper-strong">Giá & xác nhận</p><p className="mt-3 text-3xl font-bold text-pine">{quote ? quote.sell_price.total_vnd === null ? "Cần xác nhận giá" : formatPackageVnd(quote.sell_price.total_vnd) : "Chọn ngày để kiểm tra"}</p>{quote ? <><p className="mt-2 text-sm font-bold text-ink">{PACKAGE_AVAILABILITY_LABELS[quote.availability_state]}</p><p className="mt-1 text-sm leading-6 text-muted">{quote.confirmation_label}</p><div className="mt-5 grid gap-2 border-t border-line pt-4 text-sm">{quote.caveats.map((caveat) => <p key={caveat} className="flex items-start gap-2 text-muted"><CircleHelp size={15} className="mt-1 shrink-0" />{caveat}</p>)}</div>{quote.can_request && quote.request_url ? <a href={quote.request_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "lg", className: "mt-5 w-full" })}>Gửi yêu cầu xác nhận <ExternalLink size={17} /></a> : <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><AlertTriangle size={18} className="mb-2" /><strong className="block">Chưa có kênh yêu cầu an toàn</strong>Hãy xem lại sau; website không tạo yêu cầu ngầm.</div>}</> : <p className="mt-3 text-sm leading-6 text-muted">Chúng tôi cần ngày đi và số khách để chọn đúng mức giá và kiểm tra từng nguồn.</p>}<div className="mt-5 border-t border-line pt-4"><p className="flex items-start gap-2 text-xs leading-5 text-muted"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />Thông tin này không tạo đặt chỗ hoặc xác nhận thanh toán.</p></div></Card></aside>
    </div>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"><PackageSelectionSheet action={`/packages/${item.slug}`} optionalComponents={optionalComponents} defaults={parsed.success ? { checkIn: parsed.data.check_in, checkOut: parsed.data.check_out, adults: parsed.data.adults, children: parsed.data.children, rooms: parsed.data.rooms, optional: parsed.data.selected_optional_component_keys } : undefined} label={parsed.success ? "Đổi ngày hoặc lựa chọn" : "Kiểm tra gói này"} /></div>
  </main>;
}
