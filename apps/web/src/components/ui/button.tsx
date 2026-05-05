import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Button({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-bold text-foreground shadow-sm transition hover:bg-neutral-50",
        className
      )}
      type={type}
      {...props}
    />
  );
}
