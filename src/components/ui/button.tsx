import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-trip-sunrise/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-pine text-white hover:bg-pine-strong",
        accent: "bg-copper text-white hover:bg-copper-strong",
        secondary: "border border-line bg-surface text-pine hover:bg-mist",
        ghost: "text-pine hover:bg-pine-soft",
        danger: "bg-danger text-white hover:bg-danger-strong",
      },
      size: {
        default: "min-h-12",
        sm: "min-h-11 px-4",
        lg: "min-h-13 px-7 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
