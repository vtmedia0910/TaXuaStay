import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, DatabaseZap, RefreshCw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { OperationsQueue } from "@/components/admin/operations-queue";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { processOperationalExpiriesAction } from "@/features/operations/actions";
import { getAdminDataHealth, getAdminOperationsView } from "@/features/operations/data";
import { ATTENTION_REASON_LABELS, PRIORITY_LABELS } from "@/features/operations/policy";
import { operationsQuerySchema } from "@/features/operations/schema";

function queryHref(query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  params.set("page", String(page));
  return `/admin/operations?${params.toString()}`;
}

export default async function AdminOperationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const parsed = operationsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : {};
  const filters = { ...query, view: query.view ?? "needs_attention" };
  const [view, health] = await Promise.all([getAdminOperationsView(filters), getAdminDataHealth(50)]);
  const urgent = view.decisions.filter((item) => item.priority_bucket === "urgent" && item.attention_reasons.length).slice(0, 3);
  return <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
    <AdminPageHeader title="Điều hành chuyến đi" description="Operational truth → việc cần chú ý → hành động an toàn → audit. Không ưu tiên theo margin hoặc Partner tier." />
    <FormFeedback saved={raw.saved} error={raw.error} />

    <Card className="overflow-hidden border-red-200 bg-gradient-to-br from-red-50 to-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-red-700"><AlertTriangle size={18} />Cần xử lý ngay</p><p className="mt-2 text-4xl font-bold text-pine">{view.urgent_count}</p><p className="mt-1 text-sm text-muted">Booking thuộc bucket khẩn cấp theo phase11-operations-priority-v1.</p></div>
        <form action={processOperationalExpiriesAction}><input type="hidden" name="limit" value="200" /><SubmitButton label="Đồng bộ hết hạn" confirmation="Xử lý các mốc hết hạn hiện có? Hàm an toàn để chạy lại và không gửi thông báo ra ngoài." /></form>
      </div>
      <div className="mt-5"><OperationsQueue items={urgent} emptyMessage="Không có Booking khẩn cấp. Queue vẫn phản ánh dữ liệu thật, không tạo cảnh báo mẫu." /></div>
    </Card>

    <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8" aria-label="Chỉ số vận hành">
      {[
        ["Cần chú ý", view.metrics.bookings_needing_attention],
        ["Chờ Supplier", view.metrics.pending_confirmations],
        ["Quá hạn", view.metrics.overdue_confirmations],
        ["Quote sắp hết", view.metrics.quote_expiring_count],
        ["Cần requote", view.metrics.needs_requote_count],
        ["Declined / thay", view.metrics.replacement_required_count],
        ["Checkout ready", view.metrics.checkout_ready_count],
        ["Data Health", health.total_issues],
      ].map(([label, value]) => <Card key={String(label)} className="min-w-0 p-3"><p className="break-words text-xs font-bold uppercase text-muted">{label}</p><p className="mt-2 text-2xl font-bold text-pine">{value}</p></Card>)}
    </section>

    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><p className="flex items-center gap-2 font-bold text-pine"><Clock3 size={18} />Phản hồi trung bình</p><p className="mt-2 text-sm text-muted">{view.metrics.average_confirmation_response_minutes === null ? "Chưa đủ dữ liệu" : `${view.metrics.average_confirmation_response_minutes} phút`}</p></Card>
      <Card className="p-4"><p className="flex items-center gap-2 font-bold text-pine"><CheckCircle2 size={18} />Tỷ lệ decline</p><p className="mt-2 text-sm text-muted">{view.metrics.decline_rate_percent === null ? "Chưa đủ dữ liệu" : `${view.metrics.decline_rate_percent}%`}</p></Card>
      <Link href="/admin/operations/data-health" className="block"><Card className="h-full p-4 transition hover:border-copper"><p className="flex items-center gap-2 font-bold text-pine"><DatabaseZap size={18} />Data Health</p><p className="mt-2 text-sm text-muted">{health.total_issues} vấn đề cụ thể · xem chi tiết</p></Card></Link>
    </div>

    <Card className="mt-6 p-4">
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.9fr_0.8fr_0.9fr_0.9fr_auto]">
        <Input name="q" defaultValue={query.q} placeholder="Mã, khách, SĐT, ngày, phòng, Supplier" />
        <Select name="view" defaultValue={query.view ?? "needs_attention"}><option value="all">Tất cả</option><option value="needs_attention">Cần chú ý</option><option value="pending">Chờ xác nhận</option><option value="overdue">Quá hạn</option><option value="needs_requote">Cần requote</option><option value="quote_expiring">Quote sắp hết hạn</option><option value="declined">Declined</option><option value="replacement">Cần replacement</option><option value="checkout_blocked">Checkout blocked</option><option value="ready">Checkout ready</option><option value="cancelled">Đã hủy</option><option value="completed">Hoàn tất</option></Select>
        <Select name="priority" defaultValue={query.priority ?? ""}><option value="">Mọi ưu tiên</option>{Object.entries(PRIORITY_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <Select name="reason" defaultValue={query.reason ?? ""}><option value="">Mọi lý do</option>{Object.entries(ATTENTION_REASON_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <Select name="sort" defaultValue={query.sort ?? "priority"}><option value="priority">Ưu tiên</option><option value="oldest_pending">Chờ lâu nhất</option><option value="trip_date">Ngày đi gần nhất</option><option value="quote_expiry">Quote hết hạn gần nhất</option><option value="newest">Booking mới nhất</option></Select>
        <div className="flex gap-2"><Button type="submit">Lọc</Button><Link href="/admin/operations" className={buttonVariants({ variant: "secondary" })}><RefreshCw size={16} />Xóa</Link></div>
      </form>
    </Card>

    <section className="mt-6" aria-labelledby="operations-queue-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 id="operations-queue-heading" className="text-2xl font-bold text-pine">Work queue</h2><p className="text-sm text-muted">{view.total_filtered} kết quả · trang {view.page}/{view.page_count}</p></div>{view.source_truncated ? <Badge className="bg-amber-50 text-warning">Đang xem {view.source_total} Booking mới nhất</Badge> : null}</div>
      <OperationsQueue items={view.page_items} />
      {view.page_count > 1 ? <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Phân trang queue"><Link className={buttonVariants({ variant: "secondary" })} aria-disabled={view.page <= 1} href={queryHref(raw, Math.max(1, view.page - 1))}>Trang trước</Link><span className="text-sm font-bold text-muted">{view.page}/{view.page_count}</span><Link className={buttonVariants({ variant: "secondary" })} aria-disabled={view.page >= view.page_count} href={queryHref(raw, Math.min(view.page_count, view.page + 1))}>Trang sau</Link></nav> : null}
    </section>
  </main>;
}
