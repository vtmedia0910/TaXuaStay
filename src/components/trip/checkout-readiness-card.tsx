import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatBookingVnd } from "@/features/bookings/policy";
import { CHECKOUT_BLOCKER_LABELS, CHECKOUT_READINESS_LABELS, DEPOSIT_POLICY_LABELS } from "@/features/checkout/policy";
import type { CheckoutReadinessDto, QuotePriceStatus } from "@/features/checkout/types";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function money(value: number | null) {
  return value === null ? "Chưa xác định" : formatBookingVnd(value);
}
function quotePriceStatus(value: QuotePriceStatus) {
  if (value === "authoritative") return "Giá hiện tại có nguồn rõ ràng";
  if (value === "missing") return "Còn thiếu giá";
  if (value === "stale") return "Giá cần cập nhật";
  return "Nguồn giá đang xung đột";
}
function depositDetail(policy: NonNullable<CheckoutReadinessDto["deposit_policy"]>) {
  if (policy.policy_type === "fixed_amount") return money(policy.fixed_amount_vnd);
  if (policy.policy_type === "percentage" && policy.percentage_bps !== null) return `${policy.percentage_bps / 100}% tổng giá trị`;
  if (policy.policy_type === "manual" && policy.manual_policy) return policy.manual_policy;
  return null;
}

export function CheckoutReadinessCard({ checkout }: { checkout: CheckoutReadinessDto }) {
  const ready = checkout.readiness_state === "ready";
  return <Card className="overflow-hidden">
    <div className={ready ? "bg-emerald-50 p-5 sm:p-6" : "bg-amber-50 p-5 sm:p-6"}>
      <div className="flex items-start gap-3">
        <div className={ready ? "rounded-full bg-white p-2 text-success" : "rounded-full bg-white p-2 text-warning"}>{ready ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}</div>
        <div><Badge className={ready ? "text-success" : "bg-white text-warning"}>{CHECKOUT_READINESS_LABELS[checkout.readiness_state]}</Badge><h2 className="mt-3 text-2xl font-bold text-pine">{ready ? "Chuyến đi đã sẵn sàng cho bước thanh toán" : "Điều kiện trước bước thanh toán"}</h2><p className="mt-2 text-sm leading-6 text-muted">Hệ thống mới chỉ kiểm tra điều kiện. Chưa có giao dịch hoặc xác nhận đã thanh toán.</p></div>
      </div>
    </div>
    <div className="grid gap-5 p-5 sm:p-6">
      {checkout.blockers.length ? <section aria-labelledby="checkout-blockers"><h3 id="checkout-blockers" className="font-bold text-pine">Thông tin cần xử lý</h3><ul className="mt-3 grid gap-2">{checkout.blockers.map((blocker) => <li key={blocker} className="flex gap-2 text-sm leading-6 text-ink"><ShieldCheck size={17} className="mt-1 shrink-0 text-copper" /><span>{CHECKOUT_BLOCKER_LABELS[blocker] ?? "Cần đội ngũ kiểm tra thêm."}</span></li>)}</ul></section> : null}
      {checkout.quote ? <section className="rounded-2xl border border-line p-4"><p className="flex items-center gap-2 font-bold text-pine"><CalendarClock size={18} />Báo giá phiên bản {checkout.quote.quote_version}</p><p className="mt-2 text-sm text-muted">Trạng thái: {checkout.quote.quote_status === "valid" ? "Còn hiệu lực" : checkout.quote.quote_status === "expired" ? "Đã hết hiệu lực" : checkout.quote.quote_status === "superseded" ? "Đã được thay thế" : "Cần cập nhật"}</p><p className="mt-1 text-sm text-muted">{quotePriceStatus(checkout.quote.price_status)}</p><p className="mt-1 text-sm text-muted">Tạo lúc {dateTime(checkout.quote.quoted_at)}</p>{checkout.quote.quote_expires_at ? <p className="mt-1 text-sm text-muted">Hiệu lực đến {dateTime(checkout.quote.quote_expires_at)}</p> : null}</section> : null}
      <section aria-label="Số tiền dự kiến" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-mist p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Tổng giá trị</p><p className="mt-2 text-xl font-bold text-pine">{money(checkout.amounts.booking_total_vnd)}</p></div>
        <div className="rounded-2xl bg-mist p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Cần thanh toán trước</p><p className="mt-2 text-xl font-bold text-pine">{money(checkout.amounts.deposit_due_vnd)}</p></div>
        <div className="rounded-2xl bg-mist p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted">Còn lại dự kiến</p><p className="mt-2 text-xl font-bold text-pine">{money(checkout.amounts.planned_remaining_balance_vnd)}</p></div>
      </section>
      {checkout.deposit_policy ? <section className="rounded-2xl border border-line p-4"><p className="flex items-center gap-2 font-bold text-pine"><CircleDollarSign size={18} />{DEPOSIT_POLICY_LABELS[checkout.deposit_policy.policy_type]}</p>{depositDetail(checkout.deposit_policy) ? <p className="mt-2 text-sm font-semibold text-ink">{depositDetail(checkout.deposit_policy)}</p> : null}{checkout.deposit_policy.cancellation_terms ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink">{checkout.deposit_policy.cancellation_terms}</p> : <p className="mt-3 text-sm leading-6 text-muted">Chưa có điều khoản hủy được ghi nhận cho báo giá này.</p>}{checkout.deposit_policy.free_cancel_until ? <p className="mt-2 text-sm text-muted">Hủy miễn phí đến {dateTime(checkout.deposit_policy.free_cancel_until)}</p> : null}{checkout.deposit_policy.non_refundable_after ? <p className="mt-1 text-sm text-muted">Không hoàn lại sau {dateTime(checkout.deposit_policy.non_refundable_after)}</p> : null}</section> : null}
      <div className="rounded-2xl border border-dashed border-line p-4 text-sm leading-6 text-muted"><strong className="text-pine">Thanh toán trực tuyến hiện chưa khả dụng.</strong> Tà Xùa Trip chưa kết nối nhà cung cấp thanh toán trong giai đoạn này; không có mã QR, đường dẫn thanh toán hoặc nút thanh toán giả.</div>
    </div>
  </Card>;
}
