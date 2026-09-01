import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FormFeedback } from "@/components/admin/form-feedback";
import { OperationsQueue } from "@/components/admin/operations-queue";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getAdminOperationsView } from "@/features/operations/data";
import { operationsQuerySchema } from "@/features/operations/schema";

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const parsed = operationsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : {};
  const view = await getAdminOperationsView(query);
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <AdminPageHeader title="Yêu cầu chuyến đi" description="Inbox vận hành có lý do chú ý, deadline và hành động tiếp theo; Booking, Supplier Confirmation và Checkout Readiness vẫn là các state machine riêng." />
    <FormFeedback error={raw.error} saved={raw.saved} />
    <Card className="mb-5 p-4"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.9fr_0.9fr_auto]">
      <Input name="q" defaultValue={query.q} placeholder="Mã, khách, SĐT, ngày, phòng, gói, Supplier" />
      <Select name="view" defaultValue={query.view ?? "all"}><option value="all">Tất cả Booking</option><option value="needs_attention">Cần chú ý</option><option value="pending">Pending confirmation</option><option value="overdue">Overdue confirmation</option><option value="needs_requote">Needs requote</option><option value="quote_expiring">Quote expiring</option><option value="declined">Declined</option><option value="replacement">Replacement required</option><option value="checkout_blocked">Checkout blocked</option><option value="ready">Ready for payment</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option></Select>
      <Select name="sort" defaultValue={query.sort ?? "priority"}><option value="priority">Priority</option><option value="oldest_pending">Oldest pending</option><option value="trip_date">Nearest trip date</option><option value="quote_expiry">Quote expiry</option><option value="newest">Newest Booking</option></Select>
      <div className="flex gap-2"><Button type="submit">Lọc</Button><Link href="/admin/bookings" className={buttonVariants({ variant: "secondary" })}>Xóa</Link></div>
    </form></Card>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><p className="text-sm text-muted">{view.total_filtered} kết quả · trang {view.page}/{view.page_count}</p><Link href="/admin/operations" className={buttonVariants({ variant: "secondary" })}>Mở Operations</Link></div>
    <OperationsQueue items={view.page_items} emptyMessage={view.source_total ? "Không có Booking phù hợp với bộ lọc." : "Chưa có Booking thật. Hệ thống không tạo dữ liệu mẫu."} />
  </main>;
}
