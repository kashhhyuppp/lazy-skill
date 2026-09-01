"use client";

import * as React from "react";
import { Check, Palette } from "lucide-react";
import { THEME_LIST } from "@/lib/themes";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change theme"
        className="rounded-lg flex h-9 w-9 items-center justify-center border border-line bg-surface-2 text-dim transition-colors hover:border-accent/55 hover:text-accent-hi"
      >
        <Palette size={15} />
      </button>

      {open && (
        <div
          role="listbox"
          className="rounded-xl card-edge anim-pop absolute right-0 z-50 mt-2 w-52 border border-line bg-surface p-1.5 shadow-2xl shadow-black/60"
        >
          <p className="px-2 py-1.5 font-pixel text-[9px] uppercase tracking-[0.14em] text-faint">
            Theme
          </p>
          {THEME_LIST.map((t) => (
            <button
              key={t.id}
              role="option"
              aria-selected={theme === t.id}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-2 py-1.5 text-left text-[13px] transition-colors",
                theme === t.id ? "bg-surface-3 text-ink" : "text-dim hover:bg-surface-2 hover:text-ink"
              )}
            >
              <span
                className="h-3.5 w-3.5 shrink-0 border border-white/15"
                style={{ background: t.swatch, boxShadow: `0 0 10px -2px ${t.swatch}` }}
              />
              <span className="flex-1">{t.label}</span>
              {theme === t.id && <Check size={13} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
