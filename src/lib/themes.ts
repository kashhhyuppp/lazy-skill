/**
 * Theme registry. The id is the wire format shared with the CLI during
 * pairing (§7/§53) — it is cosmetic only and never a credential.
 */
export const THEME_IDS = [
  "cyber-purple",
  "cyber-blue",
  "matrix-green",
  "sakura-pink",
  "sunset-orange",
  "teal-mint",
  "monochrome",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "cyber-purple";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** Swatch shown in pickers. Mirrors --ls-accent in globals.css. */
  swatch: string;
  /** 256-colour approximation for the CLI renderer. */
  ansi: number;
  hex: string;
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  "cyber-purple": { id: "cyber-purple", label: "Cyber Purple", swatch: "#a855f7", ansi: 141, hex: "#a855f7" },
  "cyber-blue": { id: "cyber-blue", label: "Cyber Blue", swatch: "#38bdf8", ansi: 75, hex: "#38bdf8" },
  "matrix-green": { id: "matrix-green", label: "Matrix Green", swatch: "#38e07b", ansi: 84, hex: "#38e07b" },
  "sakura-pink": { id: "sakura-pink", label: "Sakura Pink", swatch: "#f472b6", ansi: 212, hex: "#f472b6" },
  "sunset-orange": { id: "sunset-orange", label: "Sunset Orange", swatch: "#fb923c", ansi: 215, hex: "#fb923c" },
  "teal-mint": { id: "teal-mint", label: "Teal Mint", swatch: "#2dd4bf", ansi: 80, hex: "#2dd4bf" },
  monochrome: { id: "monochrome", label: "Monochrome", swatch: "#e4e4ec", ansi: 253, hex: "#e4e4ec" },
};

export const THEME_LIST: ThemeDef[] = THEME_IDS.map((id) => THEMES[id]);

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
