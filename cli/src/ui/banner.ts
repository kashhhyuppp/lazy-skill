import { rgb, style, type Theme } from "./theme.js";

/**
 * The wordmark.
 *
 * Two forms. The big one is cream letterforms with a themed outline and a drop
 * shadow, matching the brand art — used where there is room and the moment
 * deserves it. The compact one is a plain two-tone block, for screens that
 * sit above other content and for terminals too narrow for the big one.
 *
 * Only the seven letters in LAZY SKILL are defined; a full alphabet would be
 * dead weight for a name that never changes.
 */

const BIG: Record<string, string[]> = {
  L: ["█    ", "█    ", "█    ", "█    ", "█    ", "█    ", "█████"],
  A: [" ███ ", "█   █", "█   █", "█████", "█   █", "█   █", "█   █"],
  Z: ["█████", "    █", "   █ ", "  █  ", " █   ", "█    ", "█████"],
  Y: ["█   █", "█   █", " █ █ ", "  █  ", "  █  ", "  █  ", "  █  "],
  S: [" ████", "█    ", "█    ", " ███ ", "    █", "    █", "████ "],
  // The arms are two cells thick. A one-cell diagonal gets swallowed by the
  // outline pass — the stroke closes over the gaps and the letter turns into
  // a blob with a hole in it.
  K: ["█  ██", "█ ██ ", "███  ", "██   ", "███  ", "█ ██ ", "█  ██"],
  I: ["█████", "  █  ", "  █  ", "  █  ", "  █  ", "  █  ", "█████"],
};

const SMALL: Record<string, string[]> = {
  L: ["█   ", "█   ", "█   ", "█   ", "████"],
  A: [" ██ ", "█  █", "████", "█  █", "█  █"],
  Z: ["████", "   █", " ██ ", "█   ", "████"],
  Y: ["█  █", "█  █", " ██ ", " █  ", " █  "],
  S: [" ███", "█   ", " ██ ", "   █", "███ "],
  K: ["█  █", "█ █ ", "██  ", "█ █ ", "█  █"],
  I: ["███", " █ ", " █ ", " █ ", "███"],
  " ": ["  ", "  ", "  ", "  ", "  "],
};

const CREAM: [number, number, number] = [240, 234, 214];

/**
 * Three cells between letters, not one.
 *
 * The outline grows each letter by a cell on every side, so a single space
 * leaves neighbouring strokes touching and the whole word reads as one purple
 * slab. Three is the first gap where every letter stands alone.
 */
const LETTER_GAP = 3;

function layout(word: string, glyphs: Record<string, string[]>, rows: number, gap: number) {
  const out = Array.from({ length: rows }, () => "");
  const chars = [...word.toUpperCase()];

  chars.forEach((ch, i) => {
    if (ch === " ") {
      for (let r = 0; r < rows; r++) out[r] += " ".repeat(gap + 2);
      return;
    }
    const glyph = glyphs[ch];
    if (!glyph) return;
    const trailing = i === chars.length - 1 ? 0 : gap;
    for (let r = 0; r < rows; r++) out[r] += glyph[r] + " ".repeat(trailing);
  });

  return out.map((row) => [...row]);
}

/** Surrounds every filled cell with a stroke, following the letterforms. */
function outline(cells: string[][]): string[][] {
  const h = cells.length;
  const w = Math.max(...cells.map((r) => r.length));
  const padded = cells.map((row) => {
    const copy = [...row];
    while (copy.length < w) copy.push(" ");
    return copy;
  });

  // One extra ring all round, so the stroke has somewhere to live.
  const out: string[][] = Array.from({ length: h + 2 }, () => Array(w + 2).fill(" "));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (padded[y][x] === "█") out[y + 1][x + 1] = "F";
  }

  const NEIGHBOURS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  for (let y = 0; y < h + 2; y++) {
    for (let x = 0; x < w + 2; x++) {
      if (out[y][x] !== " ") continue;
      if (NEIGHBOURS.some(([dx, dy]) => out[y + dy]?.[x + dx] === "F")) out[y][x] = "O";
    }
  }
  return out;
}

/** The width the big wordmark needs, including its stroke and indent. */
export const BIG_BANNER_COLUMNS =
  outline(layout("LAZY SKILL", BIG, 7, LETTER_GAP))[0].length + 4;

/** The compact two-tone wordmark. */
export function compactBanner(theme: Theme, version: string): string[] {
  const left = layout("LAZY", SMALL, 5, 1).map((r) => r.join(""));
  const right = layout("SKILL", SMALL, 5, 1).map((r) => r.join(""));

  const lines = left.map(
    (row, i) => `  ${style.bold(row)} ${rgb(theme.accent, style.bold(right[i]))}`
  );
  lines[lines.length - 1] += `  ${style.gray("v" + version)}`;
  return lines;
}

/**
 * The full wordmark: cream fill, themed outline, offset shadow, and the Zz.
 * Falls back to the compact form when the terminal is too narrow, rather than
 * wrapping into nonsense.
 */
export function banner(theme: Theme, version: string): string[] {
  const columns = process.stdout.columns ?? 80;
  if (columns < BIG_BANNER_COLUMNS) return compactBanner(theme, version);

  const cells = outline(layout("LAZY SKILL", BIG, 7, LETTER_GAP));
  const [r, g, b] = theme.accent;
  const shadow: [number, number, number] = [
    Math.round(r * 0.42),
    Math.round(g * 0.42),
    Math.round(b * 0.42),
  ];

  const lines = cells.map((row, y) => {
    let out = "  ";
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell === "F") out += rgb(CREAM, "█");
      else if (cell === "O") out += rgb(theme.accent, "█");
      else {
        // Offset one cell up-left, which is where the brand art puts it.
        const above = cells[y - 1]?.[x - 1];
        out += above === "F" || above === "O" ? rgb(shadow, "█") : " ";
      }
    }
    return out;
  });

  lines.push(
    `  ${" ".repeat(Math.max(0, cells[0].length - 8))}${rgb(theme.support, "Z z")}   ${style.gray("v" + version)}`
  );
  return lines;
}
