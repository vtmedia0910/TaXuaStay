import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink outline-none focus:border-pine focus:ring-3 focus:ring-pine/15 disabled:bg-mist",
        className,
      )}
      {...props}
    />
  );
}
