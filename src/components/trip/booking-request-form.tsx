"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarDays, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import { submitBookingRequestAction, type BookingRequestActionState } from "@/features/bookings/actions";
import type { BookingRequestReview } from "@/features/bookings/types";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Đang kiểm tra lại dữ liệu…" : "Gửi yêu cầu chuyến đi"}<Send size={18} aria-hidden="true" /></Button>;
}

export function BookingRequestForm({ review, requestToken, renderedAt, defaults }: {
  review: BookingRequestReview;
  requestToken: string;
  renderedAt: number;
  defaults: { checkIn?: string; checkOut?: string; adults: number; children: number; rooms: number };
}) {
  const [state, action] = useActionState<BookingRequestActionState, FormData>(submitBookingRequestAction, {});
  return <form action={action} className="grid gap-5">
    <input type="hidden" name="selections" value={JSON.stringify(review.selections)} />
    <input type="hidden" name="request_token" value={requestToken} />
    <input type="hidden" name="rendered_at" value={renderedAt} />
    <div className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <Card className="p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-copper-strong"><CalendarDays size={18} />Ngày đi & số khách</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Ngày bắt đầu" htmlFor="booking-check-in"><Input id="booking-check-in" name="check_in" type="date" defaultValue={defaults.checkIn} required /></Field>
        <Field label="Ngày kết thúc" htmlFor="booking-check-out"><Input id="booking-check-out" name="check_out" type="date" defaultValue={defaults.checkOut} required /></Field>
        <Field label="Người lớn" htmlFor="booking-adults"><Input id="booking-adults" name="adults" type="number" min={1} max={100} defaultValue={defaults.adults} required /></Field>
        <Field label="Trẻ em" htmlFor="booking-children"><Input id="booking-children" name="children" type="number" min={0} max={100} defaultValue={defaults.children} required /></Field>
        <Field label="Số phòng cần" htmlFor="booking-rooms"><Input id="booking-rooms" name="rooms" type="number" min={1} max={100} defaultValue={defaults.rooms} required /></Field>
      </div>
    </Card>
    <Card className="p-5 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em] text-copper-strong"><ShieldCheck size={18} />Thông tin liên hệ riêng tư</p>
      <p className="mt-2 text-sm leading-6 text-muted">Chỉ đội ngũ vận hành được xem để liên hệ xác nhận. Thông tin này không xuất hiện công khai.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Họ và tên" htmlFor="customer-name"><Input id="customer-name" name="customer_name" autoComplete="name" maxLength={160} required /></Field>
        <Field label="Số điện thoại" htmlFor="customer-phone"><Input id="customer-phone" name="customer_phone" type="tel" autoComplete="tel" maxLength={30} required /></Field>
        <Field label="Email (không bắt buộc)" htmlFor="customer-email"><Input id="customer-email" name="customer_email" type="email" autoComplete="email" maxLength={254} /></Field>
        <Field label="Zalo (không bắt buộc)" htmlFor="customer-zalo"><Input id="customer-zalo" name="customer_zalo" maxLength={160} /></Field>
        <div className="sm:col-span-2"><Field label="Điều cần đội ngũ biết" htmlFor="customer-note"><Textarea id="customer-note" name="customer_note" maxLength={3000} placeholder="Giờ đến dự kiến, nhu cầu đặc biệt hoặc điều bạn muốn hỏi…" /></Field></div>
      </div>
    </Card>
    {state.error ? <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-danger" role="alert">{state.error}</p> : null}
    <div className="rounded-3xl border border-line bg-pine-soft p-4 text-sm leading-6 text-pine"><p className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0" size={18} /><span><strong>Đây là yêu cầu xác nhận, chưa phải đặt chỗ.</strong> Website sẽ kiểm tra lại giá, tình trạng và bằng chứng từ nguồn hệ thống khi bạn gửi. Chưa có phòng, xe, dịch vụ hay khoản thanh toán nào được giữ.</span></p></div>
    <SubmitButton />
  </form>;
}
