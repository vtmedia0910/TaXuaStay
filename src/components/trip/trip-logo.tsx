import { MountainSnow, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function TripLogo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span className={cn(
        "relative grid size-10 shrink-0 place-items-center rounded-2xl",
        inverse ? "bg-white text-pine" : "bg-pine text-white",
      )} aria-hidden="true">
        <MountainSnow size={22} strokeWidth={1.9} />
        <Sun className="absolute -right-1 -top-1 text-trip-sunrise" size={14} fill="currentColor" />
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-sm font-bold tracking-[0.1em] sm:text-base", inverse ? "text-white" : "text-pine")}>TÀ XÙA TRIP</span>
        {!compact ? <span className={cn("mt-0.5 hidden text-[0.65rem] font-semibold tracking-[0.08em] sm:block", inverse ? "text-white/70" : "text-muted")}>Đi thật. Biết trước.</span> : null}
      </span>
    </span>
  );
}
