import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const toneClass = {
  neutral: "bg-neutral-100 text-neutral-600",
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700"
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneClass }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-extrabold",
        toneClass[tone],
        className
      )}
      {...props}
    />
  );
}
