"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({ label = "Lưu thay đổi", icon, variant }: {
  label?: string;
  icon?: ReactNode;
  variant?: ButtonProps["variant"];
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" variant={variant} disabled={pending}>
      {pending ? null : icon}
      {pending ? "Đang lưu…" : label}
    </Button>
  );
}
