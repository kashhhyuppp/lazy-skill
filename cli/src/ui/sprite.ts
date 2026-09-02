import { hasColor, type Theme } from "./theme.js";
import { PX, SPRITE_SIZE, spriteRows, type Expression } from "./sprite-data.js";

/**
 * Renders the mascot in the terminal.
 *
 * Half-block characters give two pixels per character cell, so a 32x32 sprite
 * fits in 16 lines and stays square — a full block per pixel would be twice as
 * tall as it is wide, which is what made the hand-drawn version look like a
 * blob. Foreground paints the upper pixel, background the lower.
 *
 * This is the same grid the web app draws, generated from one source, so the
 * sloth in your terminal is the sloth on your phone.
 */

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Palette key -> literal colour, with the hood taking the active theme. */
function colourFor(key: string, theme: Theme): Rgb | null {
  if (key === "." || key === undefined) return null;
  // The hood is the only themed part. Its highlight and shadow are derived
  // from the accent rather than reusing the support hue — teal highlights on
  // a purple hood read as a different material, not a lit edge.
  if (key === "H") return theme.accent;
  if (key === "L") {
    const [r, g, b] = theme.accent;
    const lift = (c: number) => Math.round(c + (255 - c) * 0.42);
    return [lift(r), lift(g), lift(b)];
  }
  if (key === "h") {
    const [r, g, b] = theme.accent;
    return [Math.round(r * 0.52), Math.round(g * 0.52), Math.round(b * 0.52)];
  }
  const value = PX[key];
  return typeof value === "string" ? parseHex(value) : null;
}

const fg = ([r, g, b]: Rgb) => `\x1b[38;2;${r};${g};${b}m`;
const bg = ([r, g, b]: Rgb) => `\x1b[48;2;${r};${g};${b}m`;
const RESET = "\x1b[0m";

export interface SpriteOptions {
  /** Draw every other pixel, halving both dimensions. */
  small?: boolean;
}

export function sprite(
  theme: Theme,
  expression: Expression = "idle",
  { small = false }: SpriteOptions = {}
): string[] {
  const grid = spriteRows(expression);
  const step = small ? 2 : 1;
  const size = SPRITE_SIZE;

  // Without colour there is nothing to draw with — two block characters would
  // be an unreadable smear, so the sprite is simply omitted.
  if (!hasColor) return [];

  const lines: string[] = [];

  // Two pixel rows per output line.
  for (let y = 0; y < size; y += step * 2) {
    let out = "";
    let openBg = false;

    for (let x = 0; x < size; x += step) {
      const top = colourFor(grid[y]?.[x], theme);
      const bottom = colourFor(grid[y + step]?.[x], theme);

      if (!top && !bottom) {
        if (openBg) {
          out += RESET;
          openBg = false;
        }
        out += " ";
        continue;
      }

      if (top && bottom) {
        out += `${bg(bottom)}${fg(top)}▀${RESET}`;
        openBg = false;
      } else if (top) {
        out += `${fg(top)}▀${RESET}`;
      } else if (bottom) {
        out += `${fg(bottom)}▄${RESET}`;
      }
    }

    if (openBg) out += RESET;
    lines.push(out);
  }

  return lines;
}
