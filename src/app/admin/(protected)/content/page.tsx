import Link from "next/link";
import { FilePenLine, Home, Hotel, ImageIcon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card } from "@/components/ui/card";

const pages = [
  { href: "/admin/content/home", title: "Trang chủ", description: "Hero, lý do lựa chọn, khác biệt, phòng đã thẩm định, tuyên ngôn và CTA.", icon: Home },
  { href: "/admin/content/stay", title: "Lưu trú", description: "Nội dung mở đầu, thông tin cần lưu ý và metadata biên tập.", icon: Hotel },
] as const;

export default function AdminContentPage() {
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><AdminPageHeader title="Nội dung website" description="Biên tập nội dung có cấu trúc. Không có HTML/JavaScript tùy ý và không sao chép dữ liệu giá, tình trạng hay xác minh." action={<Link href="/admin/site-media" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-pine px-4 font-bold text-white"><ImageIcon size={18} /> Media website</Link>} /><div className="grid gap-4 sm:grid-cols-2">{pages.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href}><Card className="h-full p-6 hover:border-copper"><Icon className="text-copper" /><h2 className="mt-4 text-2xl font-bold text-pine">{title}</h2><p className="mt-2 leading-7 text-muted">{description}</p><p className="mt-5 flex items-center gap-2 font-bold text-pine"><FilePenLine size={18} /> Mở trình biên tập →</p></Card></Link>)}</div></main>;
}
