import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The base card. Near-black fill, hairline edge, and a soft accent wash that
 * strengthens on hover — the surface treatment the whole UI is built on.
 */
export function Panel({
  className,
  children,
  interactive = false,
  glow = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; glow?: boolean }) {
  return (
    <div
      className={cn(
        "card-edge relative border border-line bg-surface/80 backdrop-blur-sm",
        interactive &&
          "transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_0_28px_-10px_rgb(var(--ls-accent-rgb)/0.55)]",
        glow && "glow-accent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Small uppercase pixel label used as a section eyebrow. */
export function PanelLabel({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-pixel text-[10px] uppercase tracking-[0.14em] text-faint",
        className
      )}
    >
      {icon}
      {children}
    </div>
  );
}
