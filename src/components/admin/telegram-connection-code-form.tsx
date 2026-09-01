"use client";

import { useActionState } from "react";
import { generateTelegramConnectionCodeAction } from "@/features/telegram/actions";
import type { TelegramConnectionActionState } from "@/features/telegram/types";
import { SubmitButton } from "@/components/admin/submit-button";

const initialState: TelegramConnectionActionState = {};

export function TelegramConnectionCodeForm({ supplierId }: { supplierId: string }) {
  const [state, action] = useActionState(generateTelegramConnectionCodeAction, initialState);
  return <div className="grid gap-3">
    <form action={action}><input type="hidden" name="supplier_id" value={supplierId} /><SubmitButton label="Tạo mã kết nối một lần" /></form>
    {state.error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-danger">{state.error}</p> : null}
    {state.code ? <div className="rounded-2xl border border-sky/30 bg-sky/5 p-4" role="status">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-sky">Chỉ hiển thị lần này</p>
      <code className="mt-2 block break-all text-lg font-bold text-pine">/connect {state.code}</code>
      <p className="mt-2 text-xs leading-5 text-muted">Gửi lệnh này trong đúng nhóm riêng của {state.supplierName}. Mã hết hạn lúc {state.expiresAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(state.expiresAt)) : "sớm"}.</p>
    </div> : null}
  </div>;
}
