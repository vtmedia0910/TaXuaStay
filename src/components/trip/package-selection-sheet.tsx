"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Search, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PublicPackageComponent } from "@/features/packages/types";

const FOCUSABLE = ["button:not([disabled])", "input:not([disabled])", "a[href]", '[tabindex]:not([tabindex="-1"])'].join(",");

export function PackageSelectionSheet({
  action,
  optionalComponents = [],
  defaults,
  label = "Chọn ngày & số khách",
}: {
  action: string;
  optionalComponents?: PublicPackageComponent[];
  defaults?: { checkIn?: string; checkOut?: string; adults?: number; children?: number; rooms?: number; optional?: string[] };
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const shell = document.querySelector<HTMLElement>(".trip-public-shell");
    const previousOverflow = document.body.style.overflow;
    const priorHidden = shell?.getAttribute("aria-hidden");
    const wasInert = shell?.hasAttribute("inert") ?? false;
    document.body.style.overflow = "hidden";
    shell?.setAttribute("inert", "");
    shell?.setAttribute("aria-hidden", "true");
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.tabIndex !== -1);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!wasInert) shell?.removeAttribute("inert");
      if (priorHidden == null) shell?.removeAttribute("aria-hidden"); else shell?.setAttribute("aria-hidden", priorHidden);
      trigger?.focus();
    };
  }, [close, open]);

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-pine px-5 font-bold text-white shadow-sm hover:bg-pine/90 sm:w-auto"><CalendarDays size={18} aria-hidden="true" />{label}</button>
    {open ? createPortal(<div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:max-w-2xl sm:rounded-[2rem] sm:p-6">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-copper-strong">GÓI DỊCH VỤ TÀ XÙA</p><h2 id={titleId} className="mt-1 text-2xl font-bold text-pine">Kiểm tra cấu hình phù hợp</h2></div><button type="button" onClick={close} className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-pine" aria-label="Đóng"><X size={20} /></button></div>
        <form action={action} method="get" className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-ink"><span className="flex items-center gap-2"><CalendarDays size={16} />Ngày nhận phòng</span><Input name="check_in" type="date" defaultValue={defaults?.checkIn} required /></label><label className="grid gap-2 text-sm font-bold text-ink"><span className="flex items-center gap-2"><CalendarDays size={16} />Ngày trả phòng</span><Input name="check_out" type="date" defaultValue={defaults?.checkOut} required /></label></div>
          <div className="grid gap-4 sm:grid-cols-3"><label className="grid gap-2 text-sm font-bold text-ink"><span className="flex items-center gap-2"><Users size={16} />Người lớn</span><Input name="adults" type="number" min={1} max={100} defaultValue={defaults?.adults ?? 2} required /></label><label className="grid gap-2 text-sm font-bold text-ink"><span>Trẻ em</span><Input name="children" type="number" min={0} max={100} defaultValue={defaults?.children ?? 0} required /></label><label className="grid gap-2 text-sm font-bold text-ink"><span>Số phòng</span><Input name="rooms" type="number" min={1} max={100} defaultValue={defaults?.rooms ?? 1} required /></label></div>
          {optionalComponents.length ? <fieldset className="grid gap-2 rounded-3xl bg-mist/70 p-4"><legend className="px-1 text-sm font-bold text-pine">Lựa chọn thêm</legend>{optionalComponents.map((component) => <label key={component.component_key} className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-4 text-sm"><input type="checkbox" name="optional" value={component.component_key} defaultChecked={defaults?.optional?.includes(component.component_key)} /><span><strong className="block text-pine">{component.source_name}</strong><span className="text-muted">Cần xác nhận riêng</span></span></label>)}</fieldset> : null}
          <p className="text-xs leading-5 text-muted">Kiểm tra này không giữ phòng, giữ xe, tạo đặt chỗ hay xác nhận thanh toán.</p>
          <button type="submit" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-pine px-5 font-bold text-white"><Search size={19} />Kiểm tra gói</button>
        </form>
      </div>
    </div>, document.body) : null}
  </>;
}
