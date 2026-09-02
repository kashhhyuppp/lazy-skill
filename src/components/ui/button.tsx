"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
    "transition-[transform,box-shadow,background-color,color] duration-150 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
    "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        // Solid accent with a soft bloom underneath, the way the brand board
        // renders its primary actions.
        primary:
          "bg-accent text-accent-ink shadow-[0_0_20px_-6px_rgb(var(--ls-accent-rgb)/0.85)] hover:bg-accent-hi hover:shadow-[0_0_26px_-4px_rgb(var(--ls-accent-rgb)/0.95)]",
        support:
          "bg-support text-accent-ink shadow-[0_0_20px_-6px_rgb(var(--ls-support-rgb)/0.85)] hover:brightness-110",
        secondary:
          "bg-surface-2 text-ink border border-line hover:border-accent/60 hover:bg-surface-3 hover:text-accent-hi",
        ghost: "text-dim hover:bg-surface-2 hover:text-ink",
        outline:
          "border border-accent/50 text-accent-hi bg-accent/[0.06] hover:bg-accent/15 hover:border-accent",
        danger:
          "bg-surface-2 text-fail border border-fail/40 hover:bg-fail/12 hover:border-fail",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
      pixel: {
        true: "font-pixel tracking-tight",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", pixel: false },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  notched?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pixel, notched = true, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size, pixel }), notched && "rounded-lg", className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

/**
 * A link that looks like a button.
 *
 * Wrapping a <Button> in a <Link> produces <a><button></button></a>, which is
 * invalid: nested interactive elements. Browsers disagree about which one
 * receives the click, so some of those buttons navigated and some did nothing
 * at all — and screen readers announce two controls where there is one.
 */
export const ButtonLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<typeof Link> & VariantProps<typeof button> & { notched?: boolean }
>(({ className, variant, size, pixel, notched = true, ...props }, ref) => (
  <Link
    ref={ref}
    className={cn(button({ variant, size, pixel }), notched && "rounded-lg", className)}
    {...props}
  />
));
ButtonLink.displayName = "ButtonLink";

export { button as buttonVariants };
