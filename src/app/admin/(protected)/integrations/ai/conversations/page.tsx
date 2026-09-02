import Link from "next/link";
import { ArrowRight, Clock3, MessageSquareWarning, MessagesSquare, TimerReset, type LucideIcon } from "lucide-react";
import { AIAdminNav } from "@/components/admin/ai-admin-nav";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deleteAIConversationsAction } from "@/features/ai-conversations/actions";
import { getAIConversationAdminDashboard } from "@/features/ai-conversations/admin-service";
import { AI_CONVERSATION_ENTRY_POINTS } from "@/features/ai-conversations/types";

export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  deleted: "Đã xóa hội thoại.", "delete-partial": "Một phần thao tác xóa thất bại. Vui lòng kiểm tra lại.",
  "invalid-selection": "Hãy chọn ít nhất một hội thoại hợp lệ.", "store-not-configured": "Kho hội thoại chưa được cấu hình.",
  "store-unavailable": "Kho hội thoại tạm không khả dụng; không có dữ liệu nào được báo là đã xóa.",
};

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "—";
}

function number(value: number | null) { return value === null ? "—" : new Intl.NumberFormat("vi-VN").format(value); }
function money(value: number | null) { return value === null ? "—" : `$${value.toFixed(value < 0.01 ? 6 : 2)}`; }

export default async function AIConversationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const state = await getAIConversationAdminDashboard(query);
  const result = query.result;
  const message = result ? resultMessages[result] ?? (result.startsWith("deleted-") ? `Đã xóa ${result.slice(8)} hội thoại.` : null) : null;
  const nextQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value && key !== "cursor" && key !== "result") nextQuery.set(key, value);
  if (state.page?.nextCursor) nextQuery.set("cursor", state.page.nextCursor);
  const summaryCards: Array<{ label: string; value: string | number; Icon: LucideIcon }> = state.summary ? [
    { label: "Hội thoại hôm nay", value: state.summary.conversationsToday, Icon: MessagesSquare },
    { label: "Tin nhắn hôm nay", value: state.summary.messagesToday, Icon: MessagesSquare },
    { label: "Lỗi Assistant hôm nay", value: state.summary.assistantErrorsToday, Icon: MessageSquareWarning },
    { label: "Độ trễ trung bình", value: state.summary.averageLatencyMs === null ? "—" : `${state.summary.averageLatencyMs} ms`, Icon: TimerReset },
    { label: "Hội thoại đang lưu", value: state.summary.storedConversations, Icon: MessagesSquare },
    { label: "Cũ nhất còn lưu", value: dateTime(state.summary.oldestRetainedAt), Icon: Clock3 },
  ] : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader title="AI Conversations" description="Bản ghi đã redaction phục vụ QA hỗ trợ. Không có system prompt, hidden reasoning hay raw tool payload." />
      <AIAdminNav />
      {message ? <p role="status" className="mb-4 rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-ink">{message}</p> : null}
      {state.error ? <Card className="p-5"><h2 className="font-extrabold text-pine">Observability không khả dụng</h2><p className="mt-2 text-sm leading-6 text-muted">{state.error === "not_configured" ? "Cần cấu hình dedicated conversation Redis ở Vercel. Trợ lý khách hàng vẫn hoạt động độc lập." : state.error === "invalid_filters" ? "Bộ lọc không hợp lệ; hãy đặt lại bộ lọc." : "Không đọc được kho hội thoại lúc này. Trợ lý khách hàng không bị ảnh hưởng."}</p></Card> : null}

      {state.summary ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map(({ label, value, Icon }) => <Card key={label} className="p-4"><div className="flex items-center gap-2 text-muted"><Icon size={17} aria-hidden="true" /><p className="text-xs font-bold uppercase tracking-[0.08em]">{label}</p></div><p className="mt-2 text-xl font-extrabold text-pine">{String(value)}</p></Card>)}
      </div> : null}

      {state.page ? <>
        <Card className="mt-4 p-4 sm:p-5">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold text-ink">Từ ngày<input type="date" name="from" defaultValue={query.from} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" /></label>
            <label className="text-sm font-semibold text-ink">Đến ngày<input type="date" name="to" defaultValue={query.to} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" /></label>
            <label className="text-sm font-semibold text-ink">Điểm vào<select name="entryPoint" defaultValue={query.entryPoint ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3"><option value="">Tất cả</option>{AI_CONVERSATION_ENTRY_POINTS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-sm font-semibold text-ink">Trạng thái<select name="status" defaultValue={query.status ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3"><option value="">Tất cả</option><option value="success">success</option><option value="error">error</option></select></label>
            <label className="text-sm font-semibold text-ink">Provider<input name="provider" defaultValue={query.provider} maxLength={40} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" /></label>
            <label className="text-sm font-semibold text-ink">Model<input name="model" defaultValue={query.model} maxLength={120} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" /></label>
            <label className="text-sm font-semibold text-ink">Behavior rev<input name="profileRevision" type="number" min="1" defaultValue={query.profileRevision} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" /></label>
            <label className="text-sm font-semibold text-ink">Lỗi<select name="hasError" defaultValue={query.hasError ?? ""} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3"><option value="">Tất cả</option><option value="yes">Có lỗi</option><option value="no">Không lỗi</option></select></label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><button className="min-h-11 rounded-full bg-pine px-5 text-sm font-bold text-white">Lọc</button><Link href="/admin/integrations/ai/conversations" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-bold text-pine">Đặt lại</Link></div>
          </form>
        </Card>

        <form action={deleteAIConversationsAction} className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Tối đa 25 mục mỗi trang; xóa lặp lại an toàn.</p><SubmitButton label="Xóa các mục đã chọn" variant="danger" confirmation="Xóa vĩnh viễn các hội thoại đã chọn?" /></div>
          <div className="grid gap-3">
            {state.page.items.length ? state.page.items.map((item) => <Card key={item.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><input type="checkbox" name="conversation_ids" value={item.id} aria-label={`Chọn hội thoại ${item.id}`} className="mt-1 size-5 shrink-0" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-extrabold text-pine">{dateTime(item.lastMessageAt)}</p><p className="mt-1 break-all text-xs text-muted">{item.provider} · {item.model} · Runtime {item.runtimeRevision} / Profile {item.profileRevision}</p></div><Badge className={item.status === "error" ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-success"}>{item.status}</Badge></div><dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div><dt className="text-muted">Điểm vào</dt><dd className="font-semibold text-ink">{item.entryPoint}</dd></div><div><dt className="text-muted">Tin nhắn</dt><dd className="font-semibold text-ink">{item.messageCount}</dd></div><div><dt className="text-muted">Tokens</dt><dd className="font-semibold text-ink">{number(item.totalInputTokens)} / {number(item.totalOutputTokens)}</dd></div><div><dt className="text-muted">Chi phí ước tính</dt><dd className="font-semibold text-ink">{money(item.totalEstimatedCostUsd)}</dd></div></dl><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">Hết hạn {dateTime(item.retentionExpiresAt)}{item.lastErrorCode ? ` · ${item.lastErrorCode}` : ""}</p><Link href={`/admin/integrations/ai/conversations/${item.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-pine-soft px-4 text-sm font-bold text-pine">Mở hội thoại <ArrowRight size={16} /></Link></div></div></div></Card>) : <Card className="p-5 text-sm text-muted">Chưa có hội thoại phù hợp.</Card>}
          </div>
        </form>
        {state.page.nextCursor ? <div className="mt-5 flex justify-center"><Link href={`?${nextQuery.toString()}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 text-sm font-bold text-pine">Trang tiếp theo</Link></div> : null}
      </> : null}
    </main>
  );
}
