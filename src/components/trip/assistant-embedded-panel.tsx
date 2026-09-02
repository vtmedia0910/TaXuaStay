"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Bot, Expand, Minus, X } from "lucide-react";
import { AssistantConversation } from "@/components/trip/assistant-conversation";
import type { AssistantPageContext, AssistantPublicReadiness } from "@/features/ai/discovery";

const FOCUSABLE = [
  "button:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function AssistantEmbeddedPanel({
  open,
  readiness,
  pageContext,
  initialPrompt,
  onMinimize,
  onClose,
}: {
  open: boolean;
  readiness: AssistantPublicReadiness;
  pageContext: AssistantPageContext | null;
  initialPrompt?: string;
  onMinimize: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const shell = document.querySelector<HTMLElement>(".trip-public-shell");
    const launcher = document.querySelector<HTMLElement>("[data-assistant-launcher]");
    const previousOverflow = document.body.style.overflow;
    const previousHidden = shell?.getAttribute("aria-hidden");
    const wasInert = shell?.hasAttribute("inert") ?? false;

    document.body.style.overflow = "hidden";
    shell?.setAttribute("inert", "");
    shell?.setAttribute("aria-hidden", "true");
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter((element) => element.tabIndex !== -1 && !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!wasInert) shell?.removeAttribute("inert");
      if (previousHidden == null) shell?.removeAttribute("aria-hidden");
      else shell?.setAttribute("aria-hidden", previousHidden);
      launcher?.focus();
    };
  }, [close, open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      hidden={!open}
      className={open ? "fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/45 sm:items-end sm:justify-end sm:bg-slate-950/25 sm:p-6" : "hidden"}
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Trợ lý AI Tà Xùa Trip"
        className="flex h-[90dvh] max-h-[92dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-[2rem] bg-[#f8fafc] shadow-2xl sm:h-[min(40rem,calc(100dvh-3rem))] sm:max-h-[40rem] sm:w-[25rem] sm:rounded-[1.75rem]"
      >
        <div className="mx-auto mt-2 h-1.5 w-11 rounded-full bg-white/35 sm:hidden" aria-hidden="true" />
        <header className="flex min-h-16 items-center justify-between gap-3 bg-pine px-4 py-3 text-white sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/12"><Bot size={21} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/65">ĐI THẬT. BIẾT TRƯỚC.</p>
              <h2 id={titleId} className="truncate text-base font-bold">Cố vấn chuyến đi<span className="sr-only"> Tà Xùa Trip</span></h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link href="/assistant" onClick={close} className="grid size-11 place-items-center rounded-full text-white/85 hover:bg-white/12" aria-label="Mở Trợ lý AI toàn màn hình"><Expand size={19} aria-hidden="true" /></Link>
            <button type="button" onClick={onMinimize} className="grid size-11 place-items-center rounded-full text-white/85 hover:bg-white/12" aria-label="Thu nhỏ Trợ lý AI"><Minus size={21} aria-hidden="true" /></button>
            <button ref={closeRef} type="button" onClick={close} className="grid size-11 place-items-center rounded-full text-white/85 hover:bg-white/12" aria-label="Đóng Trợ lý AI"><X size={20} aria-hidden="true" /></button>
          </div>
        </header>
        <div className="border-b border-line bg-white px-4 py-2 text-xs leading-5 text-muted sm:px-5">
          Chỉ dùng dữ liệu công khai được phép. Thông tin chưa xác nhận sẽ được nói rõ.
        </div>
        <AssistantConversation variant="embedded" initialPrompt={initialPrompt} readiness={readiness} pageContext={pageContext} />
      </div>
    </div>,
    document.body,
  );
}
