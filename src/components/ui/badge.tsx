import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-[11px] font-medium leading-5",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-dim",
        accent: "border-accent/40 bg-accent/12 text-accent-hi",
        ok: "border-ok/35 bg-ok/10 text-ok",
        warn: "border-warn/35 bg-warn/10 text-warn",
        fail: "border-fail/35 bg-fail/10 text-fail",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
