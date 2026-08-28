import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold text-pine">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
