"use client";

import { Check } from "lucide-react";
import { THEME_LIST } from "@/lib/themes";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

/**
 * A visible theme picker.
 *
 * The palette icon in the header is fine once you know it exists, which
 * nobody does. Themes are part of the product — the CLI has them too, and
 * pairing carries your terminal's choice across — so they get a real surface.
 */
export function ThemeGrid() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {THEME_LIST.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-accent/55 bg-accent/10"
                : "border-line bg-surface-2 hover:border-accent/35"
            )}
          >
            <span
              className="h-5 w-5 shrink-0 rounded-md border border-white/15"
              style={{ background: t.swatch, boxShadow: `0 0 12px -3px ${t.swatch}` }}
            />
            <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{t.label}</span>
            {active && <Check size={13} className="shrink-0 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}
