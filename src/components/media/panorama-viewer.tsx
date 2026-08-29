"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";

function isHttpsUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
export function PanoramaViewer({
  mediaType,
  url,
  thumbnailUrl,
  alt,
  positionLabel,
}: {
  mediaType: string;
  url?: string | null;
  thumbnailUrl?: string | null;
  alt: string;
  positionLabel: string;
}) {
  const [active, setActive] = useState(false);
  const [pan, setPan] = useState(50);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; pan: number } | null>(null);
  const validPanorama = mediaType === "panorama_360" && isHttpsUrl(url);

  if (!validPanorama) {
    return (
      <div className="rounded-3xl border border-line bg-mist p-5 text-sm text-muted" role="status">
        Ảnh toàn cảnh chưa thể mở tương tác.
        {isHttpsUrl(url) ? <a href={url ?? undefined} target="_blank" rel="noreferrer" className="ml-2 font-bold text-copper-strong">Mở ảnh gốc</a> : null}
      </div>
    );
  }

  const move = (amount: number) => setPan((current) => Math.min(100, Math.max(0, current + amount)));

  if (!active) {
    return (
      <figure className="overflow-hidden rounded-3xl border border-line bg-pine text-white">
        <div className="relative grid aspect-[2/1] place-items-center overflow-hidden bg-pine">
          {isHttpsUrl(thumbnailUrl) ? (
            // Thumbnail is approved public media; the full panorama is not requested until activation.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl ?? undefined} alt={alt} loading="lazy" className="absolute inset-0 size-full object-cover opacity-75" />
          ) : null}
          <Button type="button" variant="accent" className="relative z-10" onClick={() => setActive(true)}>
            <Expand size={18} aria-hidden="true" />Mở ảnh 360°
          </Button>
        </div>
        <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span><strong>{positionLabel}</strong> · kéo để xoay sau khi mở</span><a href={url ?? undefined} target="_blank" rel="noreferrer" className="font-bold text-copper">Ảnh gốc</a></figcaption>
        <noscript><a href={url ?? undefined}>Mở ảnh toàn cảnh: {alt}</a></noscript>
      </figure>
    );
  }

  if (failed) {
    return <div className="rounded-3xl border border-line bg-mist p-5 text-sm text-muted" role="status">Không tải được chế độ tương tác. <a href={url ?? undefined} target="_blank" rel="noreferrer" className="font-bold text-copper-strong">Mở ảnh gốc</a></div>;
  }

  return (
    <figure className="overflow-hidden rounded-3xl border border-line bg-pine text-white">
      <div
        className="relative aspect-[4/3] touch-none overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-copper sm:aspect-[16/9]"
        role="img"
        aria-label={`Ảnh toàn cảnh 360°: ${alt}. Dùng phím mũi tên trái và phải để xoay.`}
        tabIndex={0}
        data-pan={Math.round(pan)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); move(-5); }
          if (event.key === "ArrowRight") { event.preventDefault(); move(5); }
          if (event.key === "Home") { event.preventDefault(); setPan(50); }
        }}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, pan };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const width = Math.max(1, event.currentTarget.getBoundingClientRect().width);
          setPan(Math.min(100, Math.max(0, drag.current.pan - ((event.clientX - drag.current.x) / width) * 100)));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url ?? undefined} alt="" aria-hidden="true" draggable={false} loading="lazy" onError={() => setFailed(true)} className="absolute inset-y-0 h-full w-auto max-w-none select-none" style={{ left: `${pan}%`, transform: `translateX(-${pan}%)` }} />
        <div className="absolute inset-x-3 bottom-3 flex justify-between">
          <button type="button" onClick={() => move(-8)} className="grid size-11 place-items-center rounded-full bg-pine/85" aria-label="Xoay ảnh sang trái"><ChevronLeft aria-hidden="true" /></button>
          <button type="button" onClick={() => move(8)} className="grid size-11 place-items-center rounded-full bg-pine/85" aria-label="Xoay ảnh sang phải"><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>
      <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span><strong>{positionLabel}</strong> · kéo, chạm hoặc dùng phím mũi tên</span><a href={url ?? undefined} target="_blank" rel="noreferrer" className="font-bold text-copper">Ảnh gốc</a></figcaption>
    </figure>
  );
}
