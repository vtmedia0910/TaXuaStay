import { AlertTriangle, CheckCircle2, Clock3, GitPullRequestArrow, RefreshCw } from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  applyBookingChangeRequestAction,
  createBookingChangeRequestAction,
  followUpSupplierConfirmationAction,
  reviewBookingChangeRequestAction,
} from "@/features/operations/actions";
import {
  ATTENTION_REASON_LABELS,
  NEXT_ACTION_LABELS,
  PRIORITY_LABELS,
} from "@/features/operations/policy";
import type { BookingOperationsDecision } from "@/features/operations/types";
import type { AdminBookingBundle } from "@/features/bookings/types";

type ReplacementOptions = {
  rooms: Array<{ id: string; label: string }>;
  motorbikes: Array<{ id: string; label: string }>;
};

function formatDateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
    : "Chưa có";
}

const priorityClass = {
  urgent: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-900",
  normal: "border-sky-200 bg-sky-50 text-sky-900",
  low: "border-line bg-mist text-pine",
} as const;

export function BookingOperationsPanel({
  decision,
  bundle,
  replacementOptions,
  userRole,
}: {
  decision: BookingOperationsDecision | null;
  bundle: AdminBookingBundle;
  replacementOptions: ReplacementOptions;
  userRole: "admin" | "staff";
}) {
  const { booking, items, changeRequests } = bundle;
  const activeReplaceableItems = items.filter((item) => item.operational_status === "active" && ["ROOM", "MOTORBIKE"].includes(item.component_type));
  const openRequests = changeRequests.filter((item) => ["requested", "reviewing", "approved"].includes(item.status));
  const requestedConfirmations = items.flatMap((item) => item.confirmation?.status === "requested" && item.operational_status === "active" ? [{ item, confirmation: item.confirmation }] : []);

  return <section className="grid gap-4" aria-labelledby="booking-operations-heading">
    <Card className="border-copper/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-copper">Operations</p><h2 id="booking-operations-heading" className="mt-1 text-2xl font-bold text-pine">Điều hành Booking</h2></div>
        {decision ? <Badge className={priorityClass[decision.priority_bucket]}>{PRIORITY_LABELS[decision.priority_bucket]}</Badge> : <Badge>Chưa có quyết định</Badge>}
      </div>
      {decision ? <>
        <p className="mt-4 font-bold text-pine">Hành động tiếp theo: {NEXT_ACTION_LABELS[decision.next_action]}</p>
        <div className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-3">
          <p><strong className="text-ink">Revision:</strong> {booking.operations_revision}</p>
          <p><strong className="text-ink">Deadline:</strong> {formatDateTime(decision.deadline_at)}</p>
          <p><strong className="text-ink">Chờ lâu nhất:</strong> {decision.confirmation_aging.max_age_minutes === null ? "Chưa có" : `${decision.confirmation_aging.max_age_minutes} phút`}</p>
        </div>
        {decision.attention_reasons.length ? <ul className="mt-4 flex flex-wrap gap-2">
          {decision.attention_reasons.map((reason) => <li key={reason}><Badge className="bg-amber-50 text-warning">{ATTENTION_REASON_LABELS[reason]}</Badge></li>)}
        </ul> : <p className="mt-4 flex items-center gap-2 text-sm font-bold text-success"><CheckCircle2 size={17} />Không có blocker vận hành đang mở.</p>}
      </> : <p className="mt-4 text-sm text-muted">Booking nằm ngoài cửa sổ queue được tải. Dữ liệu Booking bên dưới vẫn là dữ liệu có thẩm quyền.</p>}
    </Card>

    {requestedConfirmations.length ? <Card className="p-5"><h3 className="flex items-center gap-2 text-lg font-bold text-pine"><Clock3 size={19} />Theo dõi Supplier Confirmation</h3><div className="mt-4 grid gap-4">
      {requestedConfirmations.map(({ item, confirmation }) => <form key={confirmation.id} action={followUpSupplierConfirmationAction} className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="confirmation_id" value={confirmation.id} /><input type="hidden" name="expected_updated_at" value={confirmation.updated_at} />
        <div><p className="font-bold text-pine">{item.display_name}</p><p className="mt-1 text-xs text-muted">Hạn nội bộ: {formatDateTime(confirmation.due_at)} · đã nhắc {confirmation.reminder_count} lần</p></div>
        <Input name="reason" required minLength={2} maxLength={500} placeholder="Lý do follow-up nội bộ" />
        <SubmitButton label="Ghi nhận follow-up" confirmation="Ghi nhận một lần follow-up nội bộ? Thao tác không tự gửi tin cho Supplier." />
      </form>)}
    </div></Card> : null}

    <Card className="p-5"><h3 className="flex items-center gap-2 text-lg font-bold text-pine"><GitPullRequestArrow size={19} />Yêu cầu thay đổi có kiểm soát</h3><p className="mt-2 text-sm leading-6 text-muted">Staff có thể tạo/đưa vào review. Chỉ Admin được duyệt, từ chối hoặc áp dụng. Khi áp dụng, hệ thống re-resolve nguồn thật, vô hiệu quote/checkout cũ và ghi audit trong cùng giao dịch.</p>
      <form action={createBookingChangeRequestAction} className="mt-5 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="expected_revision" value={booking.operations_revision} />
        <Select name="change_type" defaultValue="dates"><option value="dates">Đổi ngày đi</option><option value="guest_count">Đổi số khách</option><option value="room_quantity">Đổi số lượng dịch vụ</option><option value="replace_item">Thay thế dịch vụ</option></Select>
        <div className="grid grid-cols-2 gap-2"><Input name="check_in" type="date" defaultValue={booking.check_in} /><Input name="check_out" type="date" defaultValue={booking.check_out} /></div>
        <div className="grid grid-cols-2 gap-2"><Input name="adults" type="number" min={1} max={100} defaultValue={booking.adults} placeholder="Người lớn" /><Input name="children" type="number" min={0} max={100} defaultValue={booking.children} placeholder="Trẻ em" /></div>
        <Select name="target_item_id" defaultValue=""><option value="">Dịch vụ cần đổi/thay</option>{activeReplaceableItems.map((item) => <option key={item.id} value={item.id}>{item.component_type} · {item.display_name}</option>)}</Select>
        <Input name="quantity" type="number" min={1} max={100} placeholder="Số lượng mới" />
        <Select name="replacement_component_type" defaultValue=""><option value="">Loại nguồn thay thế</option><option value="ROOM">Phòng</option><option value="MOTORBIKE">Xe máy</option></Select>
        <Select name="replacement_source_id" defaultValue=""><option value="">Nguồn thật thay thế</option><optgroup label="Phòng">{replacementOptions.rooms.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</optgroup><optgroup label="Xe máy">{replacementOptions.motorbikes.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</optgroup></Select>
        <Textarea name="customer_reason" maxLength={3000} placeholder="Lý do có thể hiển thị cho khách" />
        <Textarea name="internal_note" maxLength={5000} placeholder="Căn cứ riêng tư — bắt buộc nếu không có lý do khách" />
        <div className="sm:col-span-2"><SubmitButton label="Tạo yêu cầu thay đổi" confirmation="Tạo yêu cầu thay đổi theo revision hiện tại? Dữ liệu chưa được áp dụng cho đến khi Admin duyệt và xác nhận áp dụng." /></div>
      </form>
    </Card>

    {openRequests.length ? <div className="grid gap-3">{openRequests.map((request) => <Card key={request.id} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-pine">{request.change_code} · {request.change_type}</p><p className="mt-1 text-sm text-muted">Tạo {formatDateTime(request.created_at)} · revision {request.booking_revision_at_request}</p></div><Badge className="bg-amber-50 text-warning">{request.status}</Badge></div>
      <pre className="mt-4 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-mist p-3 text-xs leading-5">{JSON.stringify(request.request_payload, null, 2)}</pre>
      {request.customer_reason ? <p className="mt-3 text-sm"><strong>Lý do khách:</strong> {request.customer_reason}</p> : null}{request.internal_note ? <p className="mt-2 text-sm text-muted"><strong>Ghi chú nội bộ:</strong> {request.internal_note}</p> : null}
      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        {request.status !== "approved" ? <form action={reviewBookingChangeRequestAction} className="grid gap-2"><input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="change_request_id" value={request.id} /><input type="hidden" name="expected_revision" value={booking.operations_revision} /><Select name="status" defaultValue="reviewing"><option value="reviewing">Đưa vào review</option>{userRole === "admin" ? <><option value="approved">Duyệt thay đổi</option><option value="rejected">Từ chối</option><option value="cancelled">Hủy yêu cầu</option></> : null}</Select><Textarea name="internal_note" maxLength={5000} placeholder="Căn cứ bắt buộc khi duyệt/từ chối/hủy" /><SubmitButton label="Cập nhật review" confirmation="Cập nhật trạng thái review theo revision hiện tại?" /></form> : null}
        {request.status === "approved" && userRole === "admin" ? <form action={applyBookingChangeRequestAction} className="rounded-2xl border border-red-200 bg-red-50 p-4"><input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="change_request_id" value={request.id} /><input type="hidden" name="expected_revision" value={booking.operations_revision} /><p className="flex items-center gap-2 font-bold text-red-800"><AlertTriangle size={18} />Thao tác rủi ro cao</p><p className="mt-2 text-sm leading-6 text-red-800">Áp dụng nguyên tử, tạo snapshot mới và re-quote. Lịch sử cũ không bị xóa.</p><div className="mt-3"><SubmitButton label="Xác nhận áp dụng" confirmation="Xác nhận áp dụng thay đổi này? Quote/checkout hiện tại sẽ bị vô hiệu và dịch vụ liên quan có thể cần xác nhận lại." /></div></form> : null}
      </div>
    </Card>)}</div> : null}

    {bundle.confirmationEvents.length ? <Card className="p-5"><h3 className="flex items-center gap-2 text-lg font-bold text-pine"><RefreshCw size={18} />Lịch sử Supplier Confirmation</h3><div className="mt-4 grid gap-3">{bundle.confirmationEvents.map((event) => <div key={event.id} className="rounded-2xl border border-line p-3 text-sm"><p className="font-bold text-pine">{event.previous_status} → {event.next_status}</p><p className="mt-1 text-muted">{formatDateTime(event.created_at)} · {event.actor_type} · reminder #{event.reminder_count_snapshot}</p>{event.reason ? <p className="mt-2 whitespace-pre-line">{event.reason}</p> : null}</div>)}</div></Card> : null}
  </section>;
}
