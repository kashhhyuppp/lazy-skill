/**
 * CLI themes. Ids match the web app's exactly, so the theme chosen here can
 * ride along in the pairing payload and the phone adopts the same look
 * (§7/§53). The id is cosmetic and carries no authority.
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

export interface Theme {
  id: ThemeId;
  label: string;
  /** [r, g, b] for truecolor terminals. */
  accent: [number, number, number];
  support: [number, number, number];
}

export const THEMES: Record<ThemeId, Theme> = {
  "cyber-purple": { id: "cyber-purple", label: "Purple Night", accent: [168, 85, 247], support: [94, 234, 212] },
  "cyber-blue": { id: "cyber-blue", label: "Cyber Blue", accent: [56, 189, 248], support: [167, 139, 250] },
  "matrix-green": { id: "matrix-green", label: "Matrix Green", accent: [56, 224, 123], support: [103, 232, 249] },
  "sakura-pink": { id: "sakura-pink", label: "Rose Pink", accent: [244, 114, 182], support: [196, 181, 253] },
  "sunset-orange": { id: "sunset-orange", label: "Sunset Orange", accent: [251, 146, 60], support: [251, 191, 36] },
  "teal-mint": { id: "teal-mint", label: "Teal Mint", accent: [45, 212, 191], support: [167, 139, 250] },
  monochrome: { id: "monochrome", label: "Monochrome", accent: [228, 228, 236], support: [161, 161, 170] },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/**
 * Colour support. NO_COLOR is honoured unconditionally, and a non-TTY (a pipe,
 * a CI log) gets plain text — escape codes in a log file help nobody.
 */
function colorLevel(): 0 | 1 | 2 {
  if (process.env.NO_COLOR) return 0;
  if (process.env.FORCE_COLOR === "0") return 0;
  if (process.env.FORCE_COLOR) return 2;
  if (!process.stdout.isTTY) return 0;
  if (process.env.COLORTERM === "truecolor" || process.env.COLORTERM === "24bit") return 2;
  if (process.env.TERM === "dumb") return 0;
  return 1;
}

const LEVEL = colorLevel();

/** Nearest xterm-256 index, for terminals without truecolor. */
function to256([r, g, b]: [number, number, number]): number {
  const q = (v: number) => Math.round((v / 255) * 5);
  return 16 + 36 * q(r) + 6 * q(g) + q(b);
}

export function rgb(color: [number, number, number], text: string): string {
  if (LEVEL === 0) return text;
  if (LEVEL === 1) return `\x1b[38;5;${to256(color)}m${text}\x1b[0m`;
  return `\x1b[38;2;${color[0]};${color[1]};${color[2]}m${text}\x1b[0m`;
}

export const style = {
  dim: (t: string) => (LEVEL === 0 ? t : `\x1b[2m${t}\x1b[0m`),
  bold: (t: string) => (LEVEL === 0 ? t : `\x1b[1m${t}\x1b[0m`),
  green: (t: string) => (LEVEL === 0 ? t : `\x1b[32m${t}\x1b[0m`),
  yellow: (t: string) => (LEVEL === 0 ? t : `\x1b[33m${t}\x1b[0m`),
  red: (t: string) => (LEVEL === 0 ? t : `\x1b[31m${t}\x1b[0m`),
  gray: (t: string) => (LEVEL === 0 ? t : `\x1b[90m${t}\x1b[0m`),
};

export const hasColor = LEVEL > 0;

/** Visible width, ignoring escape codes, so box borders line up. */
export function visibleWidth(text: string): number {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}
