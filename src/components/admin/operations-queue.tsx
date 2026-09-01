import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BOOKING_CONFIRMATION_LABELS, BOOKING_LIFECYCLE_LABELS } from "@/features/bookings/policy";
import {
  ATTENTION_REASON_LABELS,
  NEXT_ACTION_LABELS,
  PRIORITY_LABELS,
} from "@/features/operations/policy";
import type { BookingOperationsDecision } from "@/features/operations/types";

function dateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Chưa có hạn";
}
const priorityClass = {
  urgent: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-900",
  normal: "border-sky-200 bg-sky-50 text-sky-900",
  low: "border-line bg-mist text-pine",
} as const;

export function OperationsQueue({ items, emptyMessage = "Không có Booking phù hợp với bộ lọc." }: { items: BookingOperationsDecision[]; emptyMessage?: string }) {
  if (!items.length) return <Card className="p-7 text-center text-sm leading-6 text-muted">{emptyMessage}</Card>;
  return <div className="grid gap-3">{items.map((decision) => {
    const booking = decision.booking;
    return <Link key={booking.id} href={`/admin/bookings/${booking.id}`} className="group block min-w-0">
      <Card className="min-w-0 p-4 transition group-hover:border-copper sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              <Badge className={priorityClass[decision.priority_bucket]}>{PRIORITY_LABELS[decision.priority_bucket]}</Badge>
              <Badge>{BOOKING_LIFECYCLE_LABELS[booking.lifecycle_status]}</Badge>
              <Badge className="bg-mist text-pine">{BOOKING_CONFIRMATION_LABELS[booking.confirmation_status]}</Badge>
            </div>
            <h3 className="mt-3 break-words text-xl font-bold text-pine">{booking.booking_code}</h3>
            <p className="mt-1 break-words text-sm font-bold text-ink">{booking.customer_name} · {booking.customer_phone}</p>
            <div className="mt-3 grid gap-1 text-sm text-muted sm:grid-cols-2">
              <p className="flex items-center gap-2"><CalendarDays size={16} />{booking.check_in} → {booking.check_out}</p>
              <p className="flex items-center gap-2"><Clock3 size={16} />Hạn gần nhất: {dateTime(decision.deadline_at)}</p>
            </div>
            <p className="mt-3 text-sm font-bold text-pine">Tiếp theo: {NEXT_ACTION_LABELS[decision.next_action]}</p>
            {decision.attention_reasons.length ? <ul className="mt-3 flex flex-wrap gap-2" aria-label="Lý do cần chú ý">
              {decision.attention_reasons.slice(0, 4).map((reason) => <li key={reason}><Badge className="bg-amber-50 text-warning">{ATTENTION_REASON_LABELS[reason]}</Badge></li>)}
              {decision.attention_reasons.length > 4 ? <li><Badge>+{decision.attention_reasons.length - 4}</Badge></li> : null}
            </ul> : <p className="mt-3 text-sm text-success">Không có blocker vận hành đang mở.</p>}
          </div>
          <ChevronRight className="mt-1 shrink-0 text-copper" aria-hidden="true" />
        </div>
      </Card>
    </Link>;
  })}</div>;
}
