import { Bot, CheckCircle2, Clock3, Send, UsersRound } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { TelegramConnectionCodeForm } from "@/components/admin/telegram-connection-code-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  disableTelegramChannelAction,
  processTelegramOutboxAction,
  saveTelegramAssignmentAction,
  sendAuthorizedTelegramTestAction,
} from "@/features/telegram/actions";
import { TELEGRAM_ASSIGNMENT_LABELS, TELEGRAM_CHANNEL_STATUS_LABELS, TELEGRAM_OUTBOX_STATUS_LABELS, telegramHealthLabel } from "@/features/telegram/policy";
import type { AdminRole } from "@/features/admin/authz";
import type { TelegramDashboard as Dashboard, TelegramSystemDiagnostics } from "@/features/telegram/types";

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Chưa có";
}
export function TelegramDashboard({ dashboard, role, system }: { dashboard: Dashboard; role: AdminRole; system: TelegramSystemDiagnostics }) {
  const connected = dashboard.suppliers.filter((item) => item.channel?.status === "active").length;
  const failures = dashboard.outbox.filter((item) => item.status === "failed").length;
  const waiting = dashboard.outbox.filter((item) => ["pending", "retry", "processing"].includes(item.status)).length;
  return <div className="grid gap-6">
    <section className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><p className="text-sm text-muted">Đã kết nối</p><p className="mt-1 text-3xl font-bold text-pine">{connected}/{dashboard.suppliers.length}</p></Card>
      <Card className="p-4"><p className="text-sm text-muted">Outbox chờ xử lý</p><p className="mt-1 text-3xl font-bold text-pine">{waiting}</p></Card>
      <Card className="p-4"><p className="text-sm text-muted">Tin gửi thất bại</p><p className="mt-1 text-3xl font-bold text-danger">{failures}</p></Card>
    </section>
    <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-sky">Outbox worker</p><p className="mt-1 text-sm text-muted">Claim tối đa theo SKIP LOCKED; retry có giới hạn. Telegram nhận API không đồng nghĩa con người đã đọc.</p></div><form action={processTelegramOutboxAction} className="flex items-end gap-2"><Input className="w-20" name="limit" type="number" min={1} max={25} defaultValue={10} aria-label="Số tin tối đa" /><SubmitButton label="Xử lý hàng đợi" icon={<Send size={17} />} /></form></div></Card>
    <section className="grid gap-4">{dashboard.suppliers.map((supplier) => {
      const channel = supplier.channel;
      return <Card key={supplier.id} id={`supplier-${supplier.id}`} className="scroll-mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-sky">{supplier.supplier_code}</p><h2 className="mt-1 text-xl font-bold text-pine">{supplier.display_name}</h2></div><Badge className={channel?.status === "active" ? "text-success" : channel?.status === "error" ? "bg-red-50 text-danger" : "bg-mist text-muted"}>{channel ? TELEGRAM_CHANNEL_STATUS_LABELS[channel.status] : "Chưa kết nối"}</Badge></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-line p-4"><p className="flex items-center gap-2 font-bold text-pine"><Bot size={18} />Nhóm Supplier</p>{channel ? <div className="mt-3 grid gap-2 text-sm"><p><strong>{channel.telegram_chat_title ?? "Nhóm không có tiêu đề"}</strong></p><p className="text-muted">Chat ID được lưu tự động · {channel.telegram_chat_type}</p><p className="text-muted">{telegramHealthLabel(channel)}</p><p className="text-xs text-muted">Gửi thành công gần nhất: {dateTime(channel.last_success_at)}</p></div> : system.bot.reachable && system.bot.username ? <p className="mt-3 text-sm text-muted">Thêm đúng bot hiện tại <strong className="text-pine">@{system.bot.username}</strong> vào nhóm riêng, sau đó chạy /connect &lt;code&gt;.</p> : <p className="mt-3 text-sm text-amber-950">Chưa xác minh được bot hiện tại. Kiểm tra Telegram System trước khi tạo mã để tránh thêm nhầm bot.</p>}<div className="mt-4"><TelegramConnectionCodeForm supplierId={supplier.id} botUsername={system.bot.reachable ? system.bot.username : null} /></div>{channel && role === "admin" ? <form action={disableTelegramChannelAction} className="mt-4 grid gap-2"><input type="hidden" name="channel_id" value={channel.id} /><input type="hidden" name="supplier_id" value={supplier.id} /><Input name="reason" minLength={2} maxLength={500} required placeholder="Lý do tắt / kết nối lại" /><SubmitButton label="Tắt kênh" variant="danger" confirmation="Tắt nhóm Telegram này và hủy các tin đang chờ?" /></form> : null}</div>
          <div className="rounded-2xl border border-line p-4"><p className="flex items-center gap-2 font-bold text-pine"><UsersRound size={18} />Nhân sự Tà Xùa Trip</p>{supplier.assignments.length ? <ul className="mt-3 grid gap-2 text-sm">{supplier.assignments.map((item) => <li key={item.id}>{TELEGRAM_ASSIGNMENT_LABELS[item.assignment_role]} · {item.email ?? "Tài khoản nội bộ"}</li>)}</ul> : <p className="mt-3 text-sm text-muted">Chưa phân công nhân viên.</p>}{role === "admin" ? <form action={saveTelegramAssignmentAction} className="mt-4 grid gap-2"><input type="hidden" name="supplier_id" value={supplier.id} /><input type="hidden" name="is_active" value="true" /><Select name="user_id" required defaultValue=""><option value="">Chọn tài khoản</option>{dashboard.staff.map((staff) => <option key={staff.user_id} value={staff.user_id}>{staff.email ?? staff.user_id} · {staff.app_role}</option>)}</Select><Select name="assignment_role" defaultValue="primary"><option value="primary">Phụ trách chính</option><option value="backup">Dự phòng</option><option value="observer">Theo dõi</option></Select><SubmitButton label="Lưu phân công" /></form> : null}</div></div>
        {channel && role === "admin" ? <details className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><summary className="cursor-pointer font-bold text-amber-950">Gửi tin kiểm tra — cần owner cho phép cụ thể</summary><p className="mt-2 text-sm text-amber-950">Không sử dụng trong nhóm production nếu owner chưa phê duyệt chính tin test này.</p><form action={sendAuthorizedTelegramTestAction} className="mt-3"><input type="hidden" name="channel_id" value={channel.id} /><input type="hidden" name="supplier_id" value={supplier.id} /><input type="hidden" name="owner_authorization" value="OWNER_AUTHORIZED_TELEGRAM_TEST" /><SubmitButton label="Owner đã cho phép — gửi test" confirmation="Bạn xác nhận owner đã cho phép gửi một tin test thật vào đúng nhóm Supplier này?" /></form></details> : null}
        {supplier.outbox.length ? <div className="mt-5"><h3 className="font-bold text-pine">Giao nhận gần đây</h3><div className="mt-2 grid gap-2">{supplier.outbox.slice(0, 5).map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-mist p-3 text-sm"><span>{item.message_type} · lần {item.attempt_count}/{item.max_attempts}</span><span className="font-bold">{TELEGRAM_OUTBOX_STATUS_LABELS[item.status]}</span>{item.last_error_summary ? <span className="w-full text-danger">{item.last_error_summary}</span> : null}</div>)}</div></div> : null}
      </Card>;
    })}</section>
    {!dashboard.suppliers.length ? <Card className="p-8 text-center text-muted"><CheckCircle2 className="mx-auto mb-3" />Chưa có Supplier để kết nối. Phase 12 không tạo dữ liệu giả.</Card> : null}
    <Card className="p-5"><p className="flex items-center gap-2 font-bold text-pine"><Clock3 size={18} />Nguyên tắc vận hành</p><p className="mt-2 text-sm leading-6 text-muted">Một bot dùng chung cho toàn nền tảng; mỗi Supplier một nhóm riêng. Telegram chỉ vận chuyển thông tin tối thiểu của đúng Booking Item. Booking, Confirmation và Operations trong database luôn là nguồn sự thật.</p></Card>
  </div>;
}
