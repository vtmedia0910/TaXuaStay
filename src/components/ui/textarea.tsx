import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-muted focus:border-pine focus:ring-3 focus:ring-pine/15",
        className,
      )}
      {...props}
    />
  );
}
