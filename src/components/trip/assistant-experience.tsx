"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, LoaderCircle, RotateCcw, Send, ShieldCheck, UserRound } from "lucide-react";
import type { AIConversationMessage, AIPublicSource } from "@/features/ai/types";

const SUGGESTIONS = [
  "Phòng nào hợp 2 người?",
  "Phòng nào có view mây đã xác minh?",
  "Đường vào chỗ ở được xác minh thế nào?",
  "Xem giá và tình trạng phòng",
  "Booking của tôi đang ở đâu?",
] as const;

interface ChatMessage extends AIConversationMessage {
  id: string;
  sources?: AIPublicSource[];
  error?: boolean;
}

interface AssistantApiResponse {
  answer?: string;
  sources?: AIPublicSource[];
  error?: { code: string; message: string };
  fallbacks?: Array<{ label: string; href: string }>;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AssistantExperience({ initialPrompt = "" }: { initialPrompt?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt.slice(0, 1_200));
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [fallbacks, setFallbacks] = useState<Array<{ label: string; href: string }>>([]);
  const listRef = useRef<HTMLDivElement>(null);

  function getSessionId() {
    const stored = window.sessionStorage.getItem("tx-trip-assistant-session");
    const next = stored && /^[A-Za-z0-9_-]{16,80}$/.test(stored) ? stored : makeId().replace(/-/g, "");
    window.sessionStorage.setItem("tx-trip-assistant-session", next);
    return next;
  }

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function ask(question: string) {
    const content = question.trim().slice(0, 1_200);
    if (!content || loading) return;
    const history = messages.slice(-6).map(({ role, content: text }) => ({ role, content: text }));
    setMessages((current) => [...current, { id: makeId(), role: "user", content }]);
    setInput("");
    setLastQuestion(content);
    setFallbacks([]);
    setLoading(true);
    const sessionId = getSessionId();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json", ...(sessionId ? { "x-assistant-session": sessionId } : {}) },
        body: JSON.stringify({ message: content, history, sessionId }),
        signal: controller.signal,
      });
      const payload = await response.json() as AssistantApiResponse;
      const answer = response.ok && payload.answer
        ? payload.answer
        : payload.error?.message ?? "Mình chưa xác nhận được thông tin này từ hệ thống lúc này.";
      setFallbacks(payload.fallbacks ?? []);
      setMessages((current) => [...current, { id: makeId(), role: "assistant", content: answer, sources: payload.sources, error: !response.ok }]);
    } catch {
      const message = typeof navigator !== "undefined" && !navigator.onLine
        ? "Thiết bị đang ngoại tuyến. Hãy kết nối mạng rồi thử lại."
        : "Mình chưa kết nối được với hệ thống lúc này. Vui lòng thử lại.";
      setMessages((current) => [...current, { id: makeId(), role: "assistant", content: message, error: true }]);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  return (
    <main className="min-h-[calc(100dvh-4.5rem)] bg-[linear-gradient(180deg,#e8f6fb_0%,#f8fafc_32%)]">
      <section className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-3xl flex-col px-4 pb-0 pt-5 sm:px-6 sm:pt-8">
        <header className="rounded-[1.75rem] bg-pine p-5 text-white shadow-lg sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/12"><Bot size={25} aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">TRỢ LÝ TÀ XÙA TRIP</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] sm:text-3xl">Hỏi rõ trước khi lên đường</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/82">Trợ lý AI trả lời từ dữ liệu hiện có của Tà Xùa Trip. Thông tin chưa được xác minh sẽ được nói rõ là chưa xác minh.</p>
            </div>
          </div>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 py-5" aria-live="polite" aria-busy={loading}>
          {messages.length === 0 ? (
            <div className="rounded-[1.75rem] border border-line bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-pine"><ShieldCheck size={19} aria-hidden="true" />Bạn muốn biết điều gì?</div>
              <p className="mt-2 text-sm leading-6 text-muted">Mình có thể hỗ trợ chọn phòng, đọc dữ kiện đã xác minh, giá, tình trạng phòng, gói dịch vụ, chính sách công khai và My Trip khi phiên này đã được cấp quyền.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)} className="min-h-12 rounded-2xl border border-line bg-cream px-4 text-left text-sm font-semibold text-pine hover:border-trip-teal hover:bg-pine-soft">{suggestion}</button>)}
              </div>
            </div>
          ) : messages.map((message) => (
            <article key={message.id} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-pine text-white"><Bot size={18} aria-hidden="true" /></span>}
              <div className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "bg-trip-navy text-white" : message.error ? "border border-warning/30 bg-[#fff8e8] text-ink" : "border border-line bg-white text-ink"}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.sources?.length ? <div className="mt-3 flex flex-wrap gap-2 border-t border-line/70 pt-3">{message.sources.map((item) => item.href ? <Link key={`${item.label}-${item.href}`} href={item.href} className="inline-flex min-h-8 items-center rounded-full bg-pine-soft px-3 text-xs font-bold text-pine">{item.label}</Link> : <span key={item.label} className="inline-flex min-h-8 items-center rounded-full bg-pine-soft px-3 text-xs font-bold text-pine">{item.label}</span>)}</div> : null}
              </div>
              {message.role === "user" && <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-trip-teal text-white"><UserRound size={18} aria-hidden="true" /></span>}
            </article>
          ))}
          {loading && <div className="flex items-center gap-3 text-sm font-semibold text-muted" role="status"><LoaderCircle className="animate-spin motion-reduce:animate-none" size={20} aria-hidden="true" />Đang kiểm tra dữ liệu được phép dùng…</div>}
          {fallbacks.length ? <div className="grid gap-2 rounded-3xl border border-line bg-white p-4 sm:grid-cols-3">{fallbacks.map((item) => <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center justify-between rounded-2xl bg-cream px-3 text-sm font-bold text-pine">{item.label}<ArrowRight size={16} aria-hidden="true" /></Link>)}</div> : null}
          {!loading && messages.at(-1)?.error && lastQuestion ? <button type="button" onClick={() => void ask(lastQuestion)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-bold text-pine"><RotateCcw size={17} aria-hidden="true" />Thử lại</button> : null}
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur sm:-mx-6 sm:px-6">
          <form onSubmit={submit} className="mx-auto flex max-w-3xl items-end gap-2">
            <label className="sr-only" htmlFor="assistant-question">Câu hỏi cho Trợ lý Tà Xùa Trip</label>
            <textarea id="assistant-question" value={input} onChange={(event) => setInput(event.target.value.slice(0, 1_200))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} maxLength={1_200} placeholder="Hỏi về phòng, giá, đường đi, My Trip…" className="min-h-12 max-h-32 flex-1 resize-y rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink shadow-sm" disabled={loading} />
            <button type="submit" disabled={loading || !input.trim()} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pine text-white disabled:cursor-not-allowed disabled:opacity-45" aria-label="Gửi câu hỏi"><Send size={20} aria-hidden="true" /></button>
          </form>
          <p id="my-trip-help" className="mx-auto mt-2 max-w-3xl text-center text-[0.68rem] leading-5 text-muted">My Trip chỉ hiển thị khi bạn mở đúng liên kết Booking có mã và quyền truy cập đã nhận.</p>
        </div>
      </section>
    </main>
  );
}
