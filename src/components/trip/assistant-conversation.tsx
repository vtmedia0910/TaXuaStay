"use client";

import Link from "next/link";
import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Bot, LoaderCircle, RotateCcw, Send, ShieldCheck, UserRound } from "lucide-react";
import { createDefaultAdvisorState, assistantAdvisorResponseSchema, type AdvisorSessionState, type AssistantAdvisorResponse } from "@/features/ai/advisor/types";
import { getAssistantSuggestions, type AssistantPageContext, type AssistantPublicReadiness } from "@/features/ai/discovery";
import type { AIConversationMessage, AIPublicSource } from "@/features/ai/types";

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
  advisor?: AssistantAdvisorResponse;
}

const ADVISOR_STATE_KEY = "tx-trip-advisor-state-phase13e-v1";

function initialAdvisorState() {
  if (typeof window === "undefined") return createDefaultAdvisorState();
  const stored = window.sessionStorage.getItem(ADVISOR_STATE_KEY);
  if (!stored) return createDefaultAdvisorState();
  try {
    const parsed = assistantAdvisorResponseSchema.shape.statePatch.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : createDefaultAdvisorState();
  } catch {
    return createDefaultAdvisorState();
  }
}

const DEFAULT_FALLBACKS = [
  { label: "Tìm chuyến đi", href: "/trip-finder" },
  { label: "Xem Lưu trú", href: "/stay" },
  { label: "Mở My Trip", href: "/assistant#my-trip-help" },
] as const;

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readinessCopy(readiness: AssistantPublicReadiness) {
  if (readiness === "disabled") return "Trợ lý AI đang tạm dừng. Các công cụ tìm chuyến đi và xem lưu trú vẫn hoạt động bình thường.";
  if (readiness === "not_configured") return "Trợ lý AI chưa sẵn sàng để trả lời. Bạn vẫn có thể dùng các công cụ công khai bên dưới.";
  if (readiness === "temporarily_unavailable") return "Kết nối trợ lý đang tạm gián đoạn. Bạn có thể thử lại hoặc dùng các công cụ công khai.";
  return null;
}

export function AssistantConversation({
  initialPrompt = "",
  readiness,
  pageContext,
  variant = "page",
}: {
  initialPrompt?: string;
  readiness: AssistantPublicReadiness;
  pageContext: AssistantPageContext | null;
  variant?: "page" | "embedded";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt.slice(0, 1_200));
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const [fallbacks, setFallbacks] = useState<ReadonlyArray<{ label: string; href: string }>>([]);
  const [runtimeFailure, setRuntimeFailure] = useState<AssistantPublicReadiness | null>(null);
  const [advisorState, setAdvisorState] = useState<AdvisorSessionState>(initialAdvisorState);
  const [advisorReplies, setAdvisorReplies] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  const embedded = variant === "embedded";
  const entryPoint = embedded ? (pageContext?.pageKind === "home" ? "homepage_launcher" : "floating_assistant") : "assistant_page";
  const effectiveReadiness = runtimeFailure ?? readiness;
  const suggestions = getAssistantSuggestions(pageContext);
  const hardUnavailable = effectiveReadiness === "disabled" || effectiveReadiness === "not_configured";
  const unavailableCopy = readinessCopy(effectiveReadiness);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  function getSessionId() {
    const stored = window.sessionStorage.getItem("tx-trip-assistant-session");
    const next = stored && /^[A-Za-z0-9_-]{16,80}$/.test(stored) ? stored : makeId().replace(/-/g, "");
    window.sessionStorage.setItem("tx-trip-assistant-session", next);
    return next;
  }

  function prepareSuggestion(suggestion: string) {
    setInput(suggestion.slice(0, 1_200));
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function ask(question: string) {
    const content = question.trim().slice(0, 1_200);
    if (!content || loading || hardUnavailable) return;
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
        headers: { "content-type": "application/json", "x-assistant-session": sessionId },
        body: JSON.stringify({ message: content, history, sessionId, entryPoint, advisorState, ...(pageContext ? { pageContext } : {}) }),
        signal: controller.signal,
      });
      const payload = await response.json() as AssistantApiResponse;
      const answer = response.ok && payload.answer
        ? payload.answer
        : payload.error?.message ?? "Mình chưa xác nhận được thông tin này từ hệ thống lúc này.";
      if (payload.error?.code === "AI_DISABLED") setRuntimeFailure("disabled");
      else if (payload.error?.code === "AI_NOT_CONFIGURED") setRuntimeFailure("not_configured");
      else if (["AI_PROVIDER_UNAVAILABLE", "AI_PROVIDER_ERROR", "AI_TIMEOUT"].includes(payload.error?.code ?? "")) {
        setRuntimeFailure("temporarily_unavailable");
      }
      setFallbacks(payload.fallbacks ?? []);
      const advisor = assistantAdvisorResponseSchema.safeParse(payload.advisor);
      if (advisor.success) {
        setAdvisorState(advisor.data.statePatch);
        setAdvisorReplies(advisor.data.suggestedReplies);
        window.sessionStorage.setItem(ADVISOR_STATE_KEY, JSON.stringify(advisor.data.statePatch));
      }
      setMessages((current) => [...current, {
        id: makeId(),
        role: "assistant",
        content: answer,
        sources: payload.sources,
        error: !response.ok,
      }]);
    } catch {
      const message = typeof navigator !== "undefined" && !navigator.onLine
        ? "Thiết bị đang ngoại tuyến. Hãy kết nối mạng rồi thử lại."
        : "Mình chưa kết nối được với hệ thống lúc này. Vui lòng thử lại.";
      setRuntimeFailure("temporarily_unavailable");
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

  function resetConversation() {
    setMessages([]);
    setInput("");
    setLastQuestion("");
    setFallbacks([]);
    setAdvisorReplies([]);
    setAdvisorState(createDefaultAdvisorState());
    window.sessionStorage.removeItem(ADVISOR_STATE_KEY);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  const displayedFallbacks = fallbacks.length ? fallbacks : hardUnavailable ? DEFAULT_FALLBACKS : [];

  return (
    <div className={embedded ? "flex min-h-0 flex-1 flex-col" : "flex min-h-[calc(100dvh-16rem)] flex-col"}>
      <div
        ref={listRef}
        className={embedded ? "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5" : "flex-1 space-y-4 py-5"}
        aria-live="polite"
        aria-busy={loading}
      >
        {messages.length ? (
          <div className="flex justify-end">
            <button type="button" onClick={resetConversation} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-xs font-bold text-pine hover:border-trip-teal" aria-label="Bắt đầu lại cuộc tư vấn">
              <RotateCcw size={15} aria-hidden="true" />Bắt đầu lại
            </button>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <div className={`border border-line bg-white shadow-sm ${embedded ? "rounded-3xl p-4" : "rounded-[1.75rem] p-5"}`}>
            <div className="flex items-center gap-2 font-bold text-pine">
              <ShieldCheck size={19} aria-hidden="true" />
              {hardUnavailable ? "Trợ lý chưa sẵn sàng" : "Bạn đang hình dung chuyến đi thế nào?"}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              {unavailableCopy ?? "Mình có thể hỏi từng câu cần thiết, ghi nhớ ưu tiên trong tab này và giúp bạn chọn hoặc so sánh 2–3 phương án từ dữ liệu được phép dùng."}
            </p>
            {!hardUnavailable ? (
              <div className={`mt-4 grid gap-2 ${embedded ? "" : "sm:grid-cols-2"}`}>
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => prepareSuggestion(suggestion)} className="min-h-12 rounded-2xl border border-line bg-cream px-4 text-left text-sm font-semibold text-pine hover:border-trip-teal hover:bg-pine-soft">
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : messages.map((message) => (
          <article key={message.id} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-pine text-white"><Bot size={18} aria-hidden="true" /></span>}
            <div className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "bg-trip-navy text-white" : message.error ? "border border-warning/30 bg-[#fff8e8] text-ink" : "border border-line bg-white text-ink"}`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.sources?.length ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line/70 pt-3">
                  {message.sources.map((item) => item.href ? (
                    <Link key={`${item.label}-${item.href}`} href={item.href} className="inline-flex min-h-8 items-center rounded-full bg-pine-soft px-3 text-xs font-bold text-pine">{item.label}</Link>
                  ) : (
                    <span key={item.label} className="inline-flex min-h-8 items-center rounded-full bg-pine-soft px-3 text-xs font-bold text-pine">{item.label}</span>
                  ))}
                </div>
              ) : null}
            </div>
            {message.role === "user" && <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-trip-teal text-white"><UserRound size={18} aria-hidden="true" /></span>}
          </article>
        ))}
        {loading && <div className="flex items-center gap-3 text-sm font-semibold text-muted" role="status"><LoaderCircle className="animate-spin motion-reduce:animate-none" size={20} aria-hidden="true" />Đang kiểm tra dữ liệu được phép dùng…</div>}
        {!loading && messages.at(-1)?.role === "assistant" && advisorReplies.length && !hardUnavailable ? (
          <div className="flex flex-wrap gap-2" aria-label="Gợi ý trả lời tiếp">
            {advisorReplies.map((reply) => (
              <button key={reply} type="button" onClick={() => prepareSuggestion(reply)} className="min-h-11 rounded-full border border-line bg-white px-4 text-left text-xs font-bold text-pine hover:border-trip-teal hover:bg-pine-soft">
                {reply}
              </button>
            ))}
          </div>
        ) : null}
        {displayedFallbacks.length ? (
          <div className={`grid gap-2 rounded-3xl border border-line bg-white p-4 ${embedded ? "" : "sm:grid-cols-3"}`}>
            {displayedFallbacks.map((item) => (
              <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center justify-between rounded-2xl bg-cream px-3 text-sm font-bold text-pine">
                {item.label}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : null}
        {!loading && messages.at(-1)?.error && lastQuestion && !hardUnavailable ? (
          <button type="button" onClick={() => void ask(lastQuestion)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-bold text-pine"><RotateCcw size={17} aria-hidden="true" />Thử lại</button>
        ) : null}
      </div>

      <div className={`${embedded ? "border-t border-line bg-white px-4 pt-3 sm:px-5" : "sticky bottom-0 z-10 -mx-4 border-t border-line bg-white/95 px-4 pt-3 backdrop-blur sm:-mx-6 sm:px-6"} pb-[max(0.9rem,env(safe-area-inset-bottom,0px))]`}>
        <form onSubmit={submit} className="mx-auto flex max-w-3xl items-end gap-2">
          <label className="sr-only" htmlFor={inputId}>Câu hỏi cho Trợ lý Tà Xùa Trip</label>
          <textarea ref={inputRef} id={inputId} value={input} onChange={(event) => setInput(event.target.value.slice(0, 1_200))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} maxLength={1_200} placeholder={hardUnavailable ? "Trợ lý đang tạm dừng" : "Ví dụ: 2 người, ưu tiên săn mây…"} className="min-h-12 max-h-32 flex-1 resize-y rounded-2xl border border-line bg-white px-4 py-3 text-base text-ink shadow-sm disabled:cursor-not-allowed disabled:bg-slate-50" disabled={loading || hardUnavailable} />
          <button type="submit" disabled={loading || hardUnavailable || !input.trim()} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pine text-white disabled:cursor-not-allowed disabled:opacity-45" aria-label="Gửi câu hỏi"><Send size={20} aria-hidden="true" /></button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[0.68rem] leading-5 text-muted">Cuộc trò chuyện có thể được lưu trong thời gian giới hạn để cải thiện chất lượng hỗ trợ. Không gửi mật khẩu hoặc thông tin thanh toán.</p>
        <p id={embedded ? undefined : "my-trip-help"} className="mx-auto mt-2 max-w-3xl text-center text-[0.68rem] leading-5 text-muted">My Trip chỉ hiển thị khi bạn mở đúng liên kết Booking có mã và quyền truy cập đã nhận.</p>
      </div>
    </div>
  );
}
