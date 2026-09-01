import {
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Headphones,
  Hotel,
  PackageCheck,
  Route,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckoutReadinessCard } from "@/components/trip/checkout-readiness-card";
import type { CustomerTripAction, CustomerTripDashboardDto, CustomerTripItemDto, CustomerTripTone } from "@/features/my-trip/types";

const TONE_CLASSES: Record<CustomerTripTone, string> = {
  info: "border-sky-200 bg-sky-50 text-pine",
  progress: "border-amber-200 bg-amber-50 text-warning",
  success: "border-emerald-200 bg-emerald-50 text-success",
  warning: "border-amber-200 bg-amber-50 text-warning",
  danger: "border-rose-200 bg-rose-50 text-danger",
  neutral: "border-line bg-mist text-muted",
};

function actionProps(action: CustomerTripAction) {
  return action.href.startsWith("https://") ? { target: "_blank", rel: "noreferrer" } : {};
}

function ItemIcon({ type }: { type: CustomerTripItemDto["type"] }) {
  if (type === "ROOM") return <Hotel aria-hidden size={21} />;
  if (type === "MOTORBIKE") return <Bike aria-hidden size={21} />;
  if (type === "PACKAGE") return <PackageCheck aria-hidden size={21} />;
  return <Sparkles aria-hidden size={21} />;
}

function formatEventTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Thời gian chưa xác định" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function MyTripDashboard({ trip }: { trip: CustomerTripDashboardDto }) {
  return (
    <main className="min-w-0 bg-cream pb-16">
      <section className="border-b border-line bg-white px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-copper">Tà Xùa Trip · My Trip</p>
            <Badge>MÃ {trip.bookingCode}</Badge>
          </div>
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="min-w-0">
              <h1 className="text-balance text-2xl font-extrabold tracking-tight text-pine sm:text-4xl">Chuyến đi của bạn</h1>
              <div className="mt-3 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-sm text-ink">
                <span className="inline-flex min-w-0 items-center gap-2"><CalendarDays aria-hidden size={18} className="shrink-0 text-copper" /><span className="break-words font-semibold">{trip.dateRangeLabel}</span></span>
                <span className="inline-flex items-center gap-2"><Clock3 aria-hidden size={18} className="text-copper" />{trip.durationLabel}</span>
                <span className="inline-flex items-center gap-2"><UsersRound aria-hidden size={18} className="text-copper" />{trip.guestSummary}</span>
              </div>
            </div>
            <Button asChild size="lg" className="w-full md:w-auto">
              <a href={trip.primaryAction.href} {...actionProps(trip.primaryAction)}>{trip.primaryAction.label}</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid min-w-0 max-w-5xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <Card role="status" aria-label="Trạng thái tổng thể của chuyến đi" className={`min-w-0 border p-5 sm:p-6 ${TONE_CLASSES[trip.status.tone]}`}>
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/85"><Route aria-hidden size={22} /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em]">Trạng thái hiện tại</p>
              <h2 className="mt-1 text-balance text-xl font-extrabold sm:text-2xl">{trip.status.label}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/75">{trip.status.description}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 border-t border-current/15 pt-4 text-sm sm:grid-cols-2">
            <p><span className="text-ink/60">Yêu cầu:</span> <strong className="text-ink">{trip.lifecycleLabel}</strong></p>
            <p><span className="text-ink/60">Xác nhận:</span> <strong className="text-ink">{trip.confirmationLabel}</strong></p>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/60">Trạng thái theo dõi không đồng nghĩa với đã giữ chỗ, đã xác nhận toàn bộ hoặc đã thanh toán.</p>
        </Card>

        <section id="trip-components" aria-labelledby="trip-components-title" className="scroll-mt-24">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-copper">Bạn đã chọn</p>
          <h2 id="trip-components-title" className="mt-1 text-2xl font-extrabold text-pine sm:text-3xl">Dịch vụ trong chuyến đi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Thông tin dưới đây được lưu tại lúc gửi yêu cầu; không bị thay âm thầm bằng dữ liệu nguồn mới.</p>
          <div className="mt-4 grid min-w-0 gap-4">
            {trip.items.map((item) => (
              <Card key={item.key} className="min-w-0 overflow-hidden p-5 sm:p-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pine-soft text-pine"><ItemIcon type={item.type} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-copper">{item.typeLabel}</p>
                        <h3 className="mt-1 break-words text-lg font-extrabold text-pine sm:text-xl">{item.quantity} × {item.title}</h3>
                        {item.parentName ? <p className="mt-1 break-words text-sm text-muted">{item.parentName}</p> : null}
                      </div>
                      <Badge className={`border ${TONE_CLASSES[item.confirmationTone]}`}>{item.confirmationLabel}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Thời gian</p><p className="mt-1 font-semibold text-ink">{item.servicePeriodLabel}</p></div>
                      <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Giá lúc gửi yêu cầu</p><p className="mt-1 font-semibold text-pine">{item.priceLabel}</p></div>
                      <div><p className="text-xs font-bold uppercase tracking-wide text-muted">Tình trạng</p><p className="mt-1 font-semibold text-ink">{item.availabilityLabel}</p></div>
                    </div>
                    {item.verificationLabels.length ? <div aria-label="Xác minh tại lúc gửi yêu cầu" className="mt-4 flex flex-wrap gap-2">{item.verificationLabels.map((label) => <Badge key={label} className="border border-emerald-200 bg-emerald-50 text-success">{label}</Badge>)}</div> : null}
                    <details className="group mt-4 rounded-2xl border border-line bg-mist/55 open:bg-mist">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-bold text-pine focus-visible:outline-none">
                        Thông tin cần lưu ý <ChevronDown aria-hidden size={18} className="shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-line px-4 py-3 text-sm leading-6 text-muted">
                        {item.description ? <p className="whitespace-pre-line text-ink">{item.description}</p> : null}
                        <p className={item.description ? "mt-2" : ""}>{item.caveat}</p>
                      </div>
                    </details>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section id="trip-quote" aria-labelledby="trip-quote-title" className="scroll-mt-24">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-copper">Báo giá & điều kiện</p>
          <h2 id="trip-quote-title" className="mt-1 text-2xl font-extrabold text-pine sm:text-3xl">Giá và bước tiếp theo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Giá thiếu hoặc hết hiệu lực luôn được ghi rõ; số tiền chưa xác định không bao giờ hiển thị thành 0₫.</p>
          <div id="trip-payment-readiness" className="mt-4 scroll-mt-24"><CheckoutReadinessCard checkout={trip.checkout} /></div>
        </section>

        <section id="trip-timeline" aria-labelledby="trip-timeline-title" className="scroll-mt-24">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-copper">Cập nhật</p>
          <h2 id="trip-timeline-title" className="mt-1 text-2xl font-extrabold text-pine sm:text-3xl">Dòng thời gian chuyến đi</h2>
          <ol className="mt-4 grid gap-3">
            {trip.timeline.map((event, index) => (
              <li key={event.key} className="relative flex min-w-0 gap-3 rounded-2xl border border-line bg-white p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pine-soft text-pine">{index === 0 ? <CheckCircle2 aria-hidden size={20} /> : <Clock3 aria-hidden size={19} />}</span>
                <div className="min-w-0"><p className="break-words font-bold leading-6 text-pine">{event.message}</p><time dateTime={event.createdAt} className="mt-1 block text-xs text-muted">{formatEventTime(event.createdAt)}</time></div>
              </li>
            ))}
            {!trip.timeline.length ? <li className="rounded-2xl bg-mist p-4 text-sm text-muted"><CircleHelp aria-hidden className="mb-2" />Chưa có cập nhật công khai.</li> : null}
          </ol>
        </section>

        <section id="trip-support" aria-labelledby="trip-support-title" className="scroll-mt-24">
          <Card className="min-w-0 bg-pine p-5 text-white sm:p-6">
            <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10"><Headphones aria-hidden size={22} /></span><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Hỗ trợ</p><h2 id="trip-support-title" className="mt-1 text-xl font-extrabold sm:text-2xl">Cần đội ngũ kiểm tra thêm?</h2><p className="mt-2 text-sm leading-6 text-white/75">Hãy dùng một kênh công khai đã được cấu hình. Không gửi access token hoặc thông tin nhạy cảm qua tin nhắn.</p></div></div>
            {trip.supportActions.length ? <div className="mt-5 flex flex-col gap-2 sm:flex-row">{trip.supportActions.map((action) => <Button key={action.href} asChild variant="secondary" className="w-full sm:w-auto"><a href={action.href} {...actionProps(action)}>{action.label}</a></Button>)}</div> : <p className="mt-5 rounded-2xl border border-white/20 p-4 text-sm text-white/75">Chưa có kênh hỗ trợ công khai được cấu hình. Vui lòng quay lại sau.</p>}
          </Card>
        </section>
      </div>
    </main>
  );
}
