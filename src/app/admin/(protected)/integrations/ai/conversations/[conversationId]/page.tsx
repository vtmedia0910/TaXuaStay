import Link from "next/link";
import { ArrowLeft, Bot, UserRound } from "lucide-react";
import { AIAdminNav } from "@/components/admin/ai-admin-nav";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deleteAIConversationAction } from "@/features/ai-conversations/actions";
import { getAIConversationAdminDetail } from "@/features/ai-conversations/admin-service";

export const dynamic = "force-dynamic";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

export default async function AIConversationDetailPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const state = await getAIConversationAdminDetail(conversationId);
  const conversation = state.conversation;
  return <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
    <AdminPageHeader title="Chi tiết hội thoại" description="Chỉ hiển thị nội dung khách đã thấy sau redaction và metadata vận hành được phép lưu." />
    <AIAdminNav />
    <Link href="/admin/integrations/ai/conversations" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pine"><ArrowLeft size={17} />Quay lại danh sách</Link>
    {!conversation ? <Card className="p-5"><h2 className="font-extrabold text-pine">Không tìm thấy hội thoại</h2><p className="mt-2 text-sm text-muted">Bản ghi có thể đã hết TTL, đã bị xóa hoặc kho observability đang tạm không khả dụng.</p></Card> : <>
      <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="break-all text-xs text-muted">ID {conversation.meta.id}</p><h2 className="mt-1 font-extrabold text-pine">{conversation.meta.provider} · {conversation.meta.model}</h2></div><Badge>{conversation.meta.status}</Badge></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-muted">Hoạt động cuối</dt><dd className="font-bold">{dateTime(conversation.meta.lastMessageAt)}</dd></div><div><dt className="text-muted">Runtime / Profile</dt><dd className="font-bold">{conversation.meta.runtimeRevision} / {conversation.meta.profileRevision}</dd></div><div><dt className="text-muted">Hết hạn</dt><dd className="font-bold">{dateTime(conversation.meta.retentionExpiresAt)}</dd></div></dl></Card>
      <section className="mt-4 grid gap-3" aria-label="Nội dung hội thoại">{conversation.messages.map((message) => <Card key={message.id} className={`p-4 sm:p-5 ${message.role === "assistant" ? "ml-0 sm:ml-10" : "mr-0 sm:mr-10"}`}><div className="flex items-center gap-2 font-extrabold text-pine">{message.role === "assistant" ? <Bot size={18} /> : <UserRound size={18} />}{message.role === "assistant" ? "Assistant" : "Customer"}<span className="ml-auto text-xs font-normal text-muted">{dateTime(message.createdAt)}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{message.contentRedacted}</p>{message.contentTruncated ? <p className="mt-2 text-xs font-semibold text-warning">Bản lưu đã được cắt ngắn theo giới hạn an toàn.</p> : null}{message.role === "assistant" ? <div className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted"><p>{message.provider} · {message.model} · {message.latencyMs ?? "—"} ms</p><p>Input {message.inputTokens ?? "—"} / Output {message.outputTokens ?? "—"} tokens · Runtime {message.runtimeRevision ?? "—"} / Profile {message.profileRevision ?? "—"}</p><p>Tools: {message.toolNames.length ? message.toolNames.join(", ") : "Không dùng"} · Result: {message.normalizedResult}{message.normalizedErrorCode ? ` / ${message.normalizedErrorCode}` : ""}</p></div> : null}</Card>)}</section>
      <Card className="mt-4 border-danger/20 p-5"><h2 className="font-extrabold text-danger">Xóa hội thoại</h2><p className="mt-2 text-sm text-muted">Thao tác xóa vĩnh viễn bản ghi và không thể khôi phục.</p><form action={deleteAIConversationAction} className="mt-4"><input type="hidden" name="conversation_id" value={conversation.meta.id} /><SubmitButton label="Xóa hội thoại" variant="danger" confirmation="Xóa vĩnh viễn hội thoại này?" /></form></Card>
    </>}
  </main>;
}
