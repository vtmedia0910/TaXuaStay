import Link from "next/link";
import { CalendarCheck, CircleHelp, PackageCheck } from "lucide-react";
import { CmsImage } from "@/components/cms/cms-image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PACKAGE_AVAILABILITY_LABELS, formatPackageVnd } from "@/features/packages/policy";
import type { PublicPackage, PublicPackageComponent, PublicPackageQuote } from "@/features/packages/types";

export function PackageCard({ item, components, quote }: { item: PublicPackage; components: PublicPackageComponent[]; quote?: PublicPackageQuote | null }) {
  const price = quote?.sell_price.total_vnd ?? null;
  return <Card className="overflow-hidden">
    <div className="relative aspect-[16/10] bg-gradient-to-br from-pine-soft to-mist">{item.image ? <CmsImage media={item.image} className="size-full" sizes="(min-width: 1024px) 420px, 100vw" /> : <div className="grid size-full place-items-center text-pine"><PackageCheck size={56} strokeWidth={1.4} aria-hidden="true" /><span className="sr-only">Ảnh đang được cập nhật</span></div>}<Badge className="absolute left-3 top-3 bg-white/95 text-pine shadow-sm">{item.destination_name}</Badge></div>
    <div className="p-5"><h2 className="text-2xl font-bold text-pine">{item.name}</h2><p className="mt-2 text-sm leading-6 text-muted">{item.proposition}</p>
      <div className="mt-4 flex flex-wrap gap-2">{components.slice(0, 4).map((component) => <Badge key={component.component_key} className="bg-mist text-pine">{component.quantity} × {component.source_name}</Badge>)}</div>
      <div className="mt-5 border-t border-line pt-4"><p className="text-2xl font-bold text-pine">{quote ? price === null ? "Cần xác nhận giá" : formatPackageVnd(price) : "Chọn ngày để kiểm tra giá"}</p>{quote ? <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-muted"><CalendarCheck size={15} className="mt-0.5 shrink-0" />{PACKAGE_AVAILABILITY_LABELS[quote.availability_state]}</p> : <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-muted"><CircleHelp size={15} className="mt-0.5 shrink-0" />Giá gói chỉ xuất hiện khi có quy tắc phù hợp.</p>}</div>
      <Link href={`/packages/${item.slug}${quote ? `?check_in=${encodeURIComponent(quote.input.check_in)}&check_out=${encodeURIComponent(quote.input.check_out)}&adults=${quote.input.adults}&children=${quote.input.children}&rooms=${quote.input.rooms}` : ""}`} className={buttonVariants({ size: "lg", className: "mt-5 min-h-12 w-full" })}>Xem chi tiết gói</Link>
    </div>
  </Card>;
}
