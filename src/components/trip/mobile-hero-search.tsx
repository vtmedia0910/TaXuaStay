"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import {
  HeroSearchFields,
  HeroSearchPreferences,
  HeroServiceTabs,
} from "@/components/trip/hero-search-controls";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function MobileHeroSearch() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const closeSheet = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const page = document.querySelector<HTMLElement>(".trip-public-shell");
    const previousOverflow = document.body.style.overflow;
    const previousAriaHidden = page?.getAttribute("aria-hidden");
    const wasInert = page?.hasAttribute("inert") ?? false;
    const focusTarget = triggerRef.current;

    document.body.style.overflow = "hidden";
    page?.setAttribute("inert", "");
    page?.setAttribute("aria-hidden", "true");

    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSheet();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!wasInert) page?.removeAttribute("inert");
      if (previousAriaHidden == null) page?.removeAttribute("aria-hidden");
      else page?.setAttribute("aria-hidden", previousAriaHidden);
      focusTarget?.focus();
    };
  }, [closeSheet, open]);

  const openSheet = () => {
    document.querySelectorAll<HTMLDetailsElement>(".trip-mobile-menu[open]")
      .forEach((menu) => { menu.open = false; });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="trip-mobile-hero-cta"
        onClick={openSheet}
        data-event="hero_search_open"
        aria-haspopup="dialog"
      >
        TÌM PHÒNG PHÙ HỢP
        <Search size={20} aria-hidden="true" />
      </button>

      {open ? createPortal(
        <div
          className="trip-mobile-search-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeSheet(); }}
        >
          <div
            ref={dialogRef}
            className="trip-mobile-search-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="trip-mobile-search-handle" aria-hidden="true" />
            <div className="trip-mobile-search-heading">
              <div>
                <p className="trip-mobile-search-eyebrow">LƯU TRÚ TÀ XÙA</p>
                <h2 id={titleId}>Tìm phòng phù hợp</h2>
              </div>
              <button type="button" className="trip-mobile-search-close" onClick={closeSheet} aria-label="Đóng tìm kiếm">
                <X size={21} aria-hidden="true" />
              </button>
            </div>

            <HeroServiceTabs mobile />

            <form action="/stay" method="get" className="trip-hero-search-form trip-mobile-search-form">
              <input type="hidden" name="children" value="0" />
              <HeroSearchFields idPrefix="mobile-hero" submitLabel="XEM PHÒNG PHÙ HỢP" />
              <HeroSearchPreferences />
            </form>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
