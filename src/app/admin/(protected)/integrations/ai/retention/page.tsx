import { DatabaseZap, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { AIAdminNav } from "@/components/admin/ai-admin-nav";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  deleteAIConversationsBeforeAction,
  deleteAllAIConversationsAction,
  updateAIConversationRetentionAction,
} from "@/features/ai-conversations/actions";
import { getAIConversationRetentionAdminState } from "@/features/ai-conversations/admin-service";
import { AI_CONVERSATION_RETENTION_PRESETS } from "@/features/ai-conversations/types";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  "store-not-configured": "Kho hội thoại riêng chưa được cấu hình.", "invalid-retention": "Khoảng lưu trữ không hợp lệ.",
  "apply-required": "Khi giảm thời gian lưu, hãy xác nhận áp dụng cho dữ liệu hiện có.", "retention-saved": "Đã cập nhật chính sách cho dữ liệu mới.",
  "retention-partial": "Đã lưu chính sách nhưng một phần cleanup thất bại. Hãy kiểm tra lại.", "confirmation-required": "Nhập chính xác DELETE ALL để xóa toàn bộ.",
  "delete-partial": "Một phần thao tác xóa thất bại. Hãy kiểm tra lại.",
  "store-unavailable": "Kho hội thoại tạm không khả dụng; chính sách và dữ liệu không được báo sai là đã thay đổi.",
};

export default async function AIConversationRetentionPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const [state, query] = await Promise.all([getAIConversationRetentionAdminState(), searchParams]);
  const result = query.result;
  const message = result ? messages[result] ?? (result.startsWith("retention-saved-") ? `Đã lưu chính sách và xóa ${result.slice(16)} hội thoại quá hạn.` : result.startsWith("deleted-") ? `Đã xóa ${result.slice(8)} hội thoại.` : null) : null;
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <AdminPageHeader title="AI Conversation Retention" description="Kho observability riêng, logging mặc định OFF và tự hết hạn bằng Redis TTL." />
    <AIAdminNav />
    {message ? <p role="status" className="mb-4 rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-ink">{message}</p> : null}
    <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><DatabaseZap className="mt-1 text-trip-teal" size={22} /><div><h2 className="font-extrabold text-pine">Dedicated conversation store</h2><p className="mt-1 text-sm leading-6 text-muted">Tách khỏi Redis quota/budget. URL và token không được gửi tới browser hoặc lưu trong Supabase.</p></div></div><Badge className={state.configuration.configured ? "bg-emerald-100 text-success" : "bg-amber-100 text-amber-950"}>{state.configuration.status === "configured" ? "Configured" : state.configuration.status === "not_separate" ? "Must be separate" : "Missing"}</Badge></div>{state.error === "unavailable" ? <p className="mt-4 rounded-xl bg-[#fff8e8] p-3 text-sm text-ink">Kho hội thoại đang tạm không khả dụng. Customer AI vẫn độc lập.</p> : null}</Card>

    {state.config ? <>
      <Card className="mt-4 p-5 sm:p-6"><h2 className="font-extrabold text-pine">Chính sách lưu trữ</h2><form action={updateAIConversationRetentionAction} className="mt-5 grid gap-4"><label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-line p-4"><span><span className="block font-bold text-ink">Conversation logging</span><span className="mt-1 block text-sm text-muted">Tắt logging không ảnh hưởng câu trả lời AI và không xóa dữ liệu cũ.</span></span><input type="checkbox" name="logging_enabled" defaultChecked={state.config.loggingEnabled} className="size-5 shrink-0" /></label><label className="text-sm font-semibold text-ink">Thời gian lưu<select name="retention_days" defaultValue={state.config.retentionDays} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 sm:max-w-xs">{AI_CONVERSATION_RETENTION_PRESETS.map((days) => <option key={days} value={days}>{days} ngày</option>)}</select></label><label className="flex items-start gap-3 rounded-2xl bg-[#fff8e8] p-4 text-sm leading-6 text-ink"><input type="checkbox" name="apply_existing" className="mt-1 size-5 shrink-0" /><span><strong>Áp dụng cho dữ liệu hiện có.</strong> Khi giảm retention, lựa chọn này có thể xóa vĩnh viễn hội thoại cũ hơn thời hạn mới. Cleanup dùng index và batch giới hạn, không dùng KEYS.</span></label><SubmitButton label="Lưu chính sách retention" confirmation="Cập nhật logging/retention theo lựa chọn hiện tại?" /></form></Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{[["PII redaction", "ALWAYS ON"], ["Chain-of-thought", "NEVER STORED"], ["Raw tool payload", "NEVER STORED"]].map(([label, value]) => <Card key={label} className="p-4"><ShieldCheck size={19} className="text-success" /><p className="mt-2 text-sm font-bold text-pine">{label}</p><p className="mt-1 text-xs font-extrabold text-success">{value}</p></Card>)}</div>
      <Card className="mt-4 p-5 sm:p-6"><div className="flex gap-3"><Trash2 className="text-danger" size={22} /><div><h2 className="font-extrabold text-danger">Xóa dữ liệu hội thoại</h2><p className="mt-1 text-sm text-muted">Mọi thao tác là vĩnh viễn và chỉ Admin được thực hiện.</p></div></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><form action={deleteAIConversationsBeforeAction} className="rounded-2xl border border-line p-4"><h3 className="font-bold text-pine">Xóa dữ liệu cũ</h3><label className="mt-3 block text-sm font-semibold">Cũ hơn<select name="older_than_days" defaultValue={30} className="mt-1 min-h-11 w-full rounded-xl border border-line px-3">{AI_CONVERSATION_RETENTION_PRESETS.map((days) => <option key={days} value={days}>{days} ngày</option>)}</select></label><div className="mt-4"><SubmitButton label="Xóa dữ liệu cũ" variant="danger" confirmation="Xóa vĩnh viễn các hội thoại cũ hơn mốc đã chọn?" /></div></form><form action={deleteAllAIConversationsAction} className="rounded-2xl border border-danger/20 p-4"><h3 className="font-bold text-danger">Xóa toàn bộ lịch sử AI</h3><p className="mt-2 text-sm leading-6 text-muted">Nhập chính xác <strong>DELETE ALL</strong>. Không thể hoàn tác.</p><label className="mt-3 block text-sm font-semibold">Xác nhận<input name="confirmation" autoComplete="off" className="mt-1 min-h-11 w-full rounded-xl border border-danger/30 px-3" /></label><div className="mt-4"><SubmitButton label="Xóa toàn bộ" variant="danger" confirmation="Xóa vĩnh viễn toàn bộ lịch sử hội thoại AI?" /></div></form></div></Card>
    </> : <Card className="mt-4 p-5"><div className="flex gap-3"><LockKeyhole className="text-warning" size={22} /><div><h2 className="font-extrabold text-pine">Chờ cấu hình owner</h2><p className="mt-2 text-sm leading-6 text-muted">Thêm hai biến server-only của dedicated conversation Redis vào Vercel rồi redeploy. Không nhập secret trong Admin.</p></div></div></Card>}
  </main>;
}
