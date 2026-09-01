import Link from "next/link";
import { DatabaseZap } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminDataHealth } from "@/features/operations/data";

export default async function AdminDataHealthPage() {
  const health = await getAdminDataHealth(500);
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <AdminPageHeader title="Data Health" description="Các vấn đề cụ thể từ dữ liệu hiện có. Không có điểm chất lượng hoặc cảnh báo được tạo giả." />
    <Card className="mb-5 p-5"><p className="flex items-center gap-2 font-bold text-pine"><DatabaseZap size={20} />{health.total_issues} vấn đề đang mở</p>{health.truncated ? <p className="mt-2 text-sm text-warning">Danh sách đã đạt giới hạn 500 mục.</p> : null}</Card>
    {health.issues.length ? <div className="grid gap-3">{health.issues.map((issue) => <Link key={issue.fingerprint} href={issue.path}><Card className="p-4 transition hover:border-copper"><div className="flex flex-wrap gap-2"><Badge>{issue.category}</Badge><Badge className="bg-amber-50 text-warning">{issue.label}</Badge></div><h2 className="mt-3 break-words font-bold text-pine">{issue.entity_label}</h2><p className="mt-1 text-xs text-muted">{issue.code}</p></Card></Link>)}</div> : <Card className="p-8 text-center"><h2 className="text-xl font-bold text-pine">Không có vấn đề Data Health trong phạm vi hiện tại</h2><p className="mt-2 text-sm text-muted">Kết quả này phản ánh dữ liệu thật tại thời điểm tải trang.</p></Card>}
  </main>;
}
