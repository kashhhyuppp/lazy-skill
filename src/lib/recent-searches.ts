const KEY = "lazyskill.recent";
const LIMIT = 6;

export const POPULAR_SEARCHES = [
  "browser automation",
  "research assistant",
  "code reviewer",
  "react",
  "youtube",
  "seo",
];

/**
 * Recent searches live on the device only — no account needed to browse.
 * Exposed as an external store so components can read them during render
 * without an effect writing back into state.
 */
const EMPTY: string[] = [];
let cache: string[] | null = null;
const listeners = new Set<() => void>();

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function subscribeRecent(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Must return a stable reference between calls or React will loop. */
export function getRecentSnapshot(): string[] {
  if (cache === null) cache = load();
  return cache;
}

export function getRecentServerSnapshot(): string[] {
  return EMPTY;
}

export function pushRecent(term: string): void {
  const clean = term.trim();
  if (clean.length < 2) return;

  const current = getRecentSnapshot();
  cache = [clean, ...current.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, LIMIT);

  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked — recents are a convenience, not a requirement.
  }
  for (const l of listeners) l();
}
