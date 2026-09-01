"use client";

import * as React from "react";
import { DEFAULT_THEME, isThemeId, THEME_IDS, type ThemeId } from "@/lib/themes";

const STORAGE_KEY = "lazyskill.theme";

/**
 * The active theme lives on <html data-theme>, written before first paint by
 * the bootstrap script below. React subscribes to that DOM state rather than
 * mirroring it into component state, so there is no second render pass and no
 * flash on load.
 */
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ThemeId {
  const applied = document.documentElement.dataset.theme;
  return isThemeId(applied) ? applied : DEFAULT_THEME;
}

function getServerSnapshot(): ThemeId {
  return DEFAULT_THEME;
}

function applyTheme(next: ThemeId) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage — the theme still applies this session.
  }
  emit();
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = React.useMemo(() => ({ theme, setTheme: applyTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/**
 * Runs before first paint. Kept as a raw string so it ships inline in <head>
 * rather than waiting on hydration.
 */
export const themeBootstrapScript = `
(function(){
  try {
    var t = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var ok = ${JSON.stringify([...THEME_IDS])};
    document.documentElement.dataset.theme = ok.indexOf(t) > -1 ? t : ${JSON.stringify(DEFAULT_THEME)};
  } catch (e) {
    document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
  }
})();
`.trim();
