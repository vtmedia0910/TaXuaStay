"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MessageCircleMore, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ASSISTANT_DISCOVERY_VERSION,
  ASSISTANT_TEASER_DELAY_MS,
  ASSISTANT_TEASER_SCROLL_RATIO,
  getAssistantPageContext,
  isAssistantDiscoveryRouteSuppressed,
  parseAssistantDiscoveryRecord,
  shouldShowAssistantTeaser,
  type AssistantPublicReadiness,
} from "@/features/ai/discovery";

const AssistantEmbeddedPanel = dynamic(() => import("@/components/trip/assistant-embedded-panel"), {
  ssr: false,
});

const RECORD_KEY = `tx-trip-assistant-discovery:${ASSISTANT_DISCOVERY_VERSION}`;
const SESSION_KEY = `tx-trip-assistant-discovery-session:${ASSISTANT_DISCOVERY_VERSION}`;

function readBrowserStorage(kind: "local" | "session", key: string) {
  try {
    return (kind === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeBrowserStorage(kind: "local" | "session", key: string, value: string) {
  try {
    (kind === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Discovery storage is optional; the Assistant must not break the public page when it is unavailable.
  }
}

function discoveryBlockedInDocument() {
  return Boolean(document.querySelector(
    '[data-assistant-discovery="disabled"], [role="alertdialog"], [role="dialog"][aria-modal="true"]',
  ));
}

export function AssistantLauncher({ readiness = "disabled" }: { readiness?: AssistantPublicReadiness }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const suppressed = isAssistantDiscoveryRouteSuppressed(pathname);
  const pageContext = useMemo(() => getAssistantPageContext(pathname), [pathname]);

  const markSeen = useCallback((dismissed = false) => {
    const now = Date.now();
    writeBrowserStorage("session", SESSION_KEY, "1");
    const current = parseAssistantDiscoveryRecord(readBrowserStorage("local", RECORD_KEY));
    writeBrowserStorage("local", RECORD_KEY, JSON.stringify({
      version: ASSISTANT_DISCOVERY_VERSION,
      lastShownAt: now,
      ...(dismissed ? { lastDismissedAt: now } : current?.lastDismissedAt ? { lastDismissedAt: current.lastDismissedAt } : {}),
    }));
  }, []);

  const showTeaser = useCallback(() => {
    if (discoveryBlockedInDocument()) return;
    const eligible = shouldShowAssistantTeaser({
      readiness,
      pathname,
      record: parseAssistantDiscoveryRecord(readBrowserStorage("local", RECORD_KEY)),
      seenThisSession: readBrowserStorage("session", SESSION_KEY) === "1",
    });
    if (!eligible) return;
    markSeen();
    setTeaserVisible(true);
  }, [markSeen, pathname, readiness]);

  useEffect(() => {
    if (suppressed) {
      const reset = window.setTimeout(() => {
        setOpen(false);
        setTeaserVisible(false);
      }, 0);
      return () => window.clearTimeout(reset);
    }
    const timer = window.setTimeout(showTeaser, ASSISTANT_TEASER_DELAY_MS);
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= ASSISTANT_TEASER_SCROLL_RATIO) showTeaser();
    };
    const observer = new MutationObserver(() => {
      if (discoveryBlockedInDocument()) setTeaserVisible(false);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "data-assistant-discovery"] });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [showTeaser, suppressed]);

  function openPanel(prompt = "") {
    markSeen();
    setInitialPrompt(prompt);
    setTeaserVisible(false);
    setHasOpened(true);
    setOpen(true);
  }

  function dismissTeaser() {
    markSeen(true);
    setTeaserVisible(false);
  }

  if (suppressed) return null;

  return (
    <>
      {!open && teaserVisible ? (
        <aside
          className="fixed right-4 z-[90] w-[min(20rem,calc(100vw-2rem))] rounded-[1.5rem] border border-line bg-white p-4 text-ink shadow-[0_1.25rem_3rem_rgb(3_31_63_/_24%)] motion-safe:animate-[fade-in_180ms_ease-out] sm:right-6"
          style={{ bottom: "max(5.75rem, calc(4.75rem + env(safe-area-inset-bottom, 0px)))" }}
          aria-label="Gợi ý từ Trợ lý AI"
        >
          <button type="button" onClick={dismissTeaser} className="absolute right-2 top-2 grid size-11 place-items-center rounded-full text-muted hover:bg-cream" aria-label="Ẩn lời chào Trợ lý AI"><X size={18} aria-hidden="true" /></button>
          <div className="flex items-center gap-2 pr-10 text-sm font-extrabold text-pine"><Sparkles size={18} className="text-trip-teal" aria-hidden="true" />Trợ lý AI Tà Xùa Trip</div>
          <p className="mt-2 pr-3 text-sm leading-6 text-muted">Bạn muốn mình gợi ý phòng phù hợp và nói rõ điều gì còn chưa xác nhận không?</p>
          <button type="button" onClick={() => openPanel("Gợi ý phòng hợp 2 người")} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-pine px-4 text-sm font-bold text-white hover:bg-pine-strong">Hỏi thử một câu</button>
        </aside>
      ) : null}

      <button
        type="button"
        onClick={() => openPanel()}
        className={`fixed right-4 z-[90] inline-flex min-h-14 items-center gap-2 rounded-full border border-white/30 bg-pine px-4 font-bold text-white shadow-[0_1rem_2.5rem_rgb(3_31_63_/_28%)] transition hover:bg-pine-strong motion-reduce:transition-none sm:right-6 ${open ? "pointer-events-none invisible" : ""}`}
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
        aria-label="Mở Trợ lý AI Tà Xùa Trip"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-assistant-launcher
      >
        <MessageCircleMore size={22} aria-hidden="true" />
        <span>✨ Trợ lý AI</span>
      </button>

      {hasOpened ? (
        <AssistantEmbeddedPanel
          open={open}
          readiness={readiness}
          pageContext={pageContext}
          initialPrompt={initialPrompt}
          onMinimize={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
