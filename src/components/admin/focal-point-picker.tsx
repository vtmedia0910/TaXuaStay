"use client";

import { useState, type MouseEvent } from "react";
import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

export function FocalPointPicker({ src, alt, defaultX = 50, defaultY = 50, className, id = "focal-point" }: {
  src: string;
  alt: string;
  defaultX?: number;
  defaultY?: number;
  className?: string;
  id?: string;
}) {
  const [x, setX] = useState(defaultX);
  const [y, setY] = useState(defaultY);
  const setFromPointer = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setX(Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 100));
    setY(Math.round(Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * 100));
  };

  return (
    <div className={cn("grid gap-4", className)}>
      <input type="hidden" name="focal_x" value={x} />
      <input type="hidden" name="focal_y" value={y} />
      <button
        id={id}
        type="button"
        onClick={setFromPointer}
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-mist focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-trip-sunrise/50"
        aria-label="Chọn điểm lấy nét trên ảnh"
      >
        {/* Admin previews may include an editor-approved external HTTPS source. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="size-full object-cover" />
        <span
          className="pointer-events-none absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-pine/85 text-white shadow-lg"
          style={{ left: `${x}%`, top: `${y}%` }}
          aria-hidden="true"
        >
          <Crosshair size={19} />
        </span>
      </button>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-pine">
          Ngang: {x}%
          <input aria-label="Vị trí lấy nét theo chiều ngang" type="range" min={0} max={100} value={x} onChange={(event) => setX(Number(event.target.value))} className="accent-pine" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-pine">
          Dọc: {y}%
          <input aria-label="Vị trí lấy nét theo chiều dọc" type="range" min={0} max={100} value={y} onChange={(event) => setY(Number(event.target.value))} className="accent-pine" />
        </label>
      </div>
      <p className="text-sm text-muted">Điểm lấy nét: {x}% × {y}%. Có thể nhấp ảnh hoặc dùng hai thanh trượt bằng bàn phím.</p>
    </div>
  );
}
