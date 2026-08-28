import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function SafetyAlert({
  title = "Lưu ý",
  children,
  danger = false,
}: {
  title?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-3xl border p-4",
        danger
          ? "border-danger/35 bg-red-50 text-danger"
          : "border-copper/35 bg-surface text-ink shadow-sm",
      )}
    >
      <div className="flex gap-3">
        <TriangleAlert
          className={cn("mt-0.5 shrink-0", danger ? "text-danger" : "text-warning")}
          size={21}
          aria-hidden="true"
        />
        <div>
          <p className={cn("font-bold", danger ? "text-danger" : "text-pine")}>{title}</p>
          <div className="mt-1 text-sm leading-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
