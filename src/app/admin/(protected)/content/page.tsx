import Link from "next/link";
import { FilePenLine, Home, Hotel, ImageIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminCmsPageSummaries } from "@/features/cms/data";
import { formatCmsDate } from "@/features/cms/ui";

const pages = [
  { href: "/admin/content/home", title: "Trang chủ", description: "Hero, lý do lựa chọn, khác biệt, phòng đã thẩm định, tuyên ngôn và CTA.", icon: Home },
  { href: "/admin/content/stay", title: "Lưu trú", description: "Nội dung mở đầu, thông tin cần lưu ý và metadata biên tập.", icon: Hotel },
] as const;

export default async function AdminContentPage() {
  const summaries = await getAdminCmsPageSummaries();
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Nội dung website" description="Biên tập nội dung có cấu trúc. Giá, tình trạng phòng và dữ liệu thẩm định vẫn do hệ thống vận hành quản lý." action={<Link href="/admin/site-media" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-pine px-4 font-bold text-white"><ImageIcon size={18} /> Media website</Link>} /><div className="grid gap-4 sm:grid-cols-2">{pages.map(({ href, title, description, icon: Icon }) => { const summary = summaries.find((item) => href.endsWith(item.page_key)); return <Link key={href} href={href}><Card className="h-full p-6 hover:border-copper"><div className="flex items-start justify-between gap-3"><Icon className="text-copper" /><Badge className={!summary ? "bg-mist text-muted" : summary.status === "draft" ? "bg-copper/10 text-copper-strong" : summary.status === "archived" ? "bg-red-50 text-danger" : "text-success"}>{!summary ? "Chưa có dữ liệu" : summary.status === "draft" ? "Có bản nháp" : summary.status === "archived" ? "Đang lưu trữ" : "Đã xuất bản"}</Badge></div><h2 className="mt-4 text-2xl font-bold text-pine">{title}</h2><p className="mt-2 leading-7 text-muted">{description}</p><p className="mt-3 text-xs text-muted">Xuất bản gần nhất: {formatCmsDate(summary?.published_at)}</p><p className="mt-5 flex items-center gap-2 font-bold text-pine"><FilePenLine size={18} /> Mở trình biên tập →</p></Card></Link>; })}</div></main>;
}
