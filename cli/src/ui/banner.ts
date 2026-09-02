import { rgb, style, type Theme } from "./theme.js";

/**
 * The wordmark, drawn as blocks.
 *
 * Only the seven letters in LAZY SKILL are defined — a full alphabet would be
 * dead weight for a name that never changes. Five rows tall, which reads as a
 * logo without eating half the terminal.
 */
const GLYPHS: Record<string, string[]> = {
  L: ["█   ", "█   ", "█   ", "█   ", "████"],
  A: [" ██ ", "█  █", "████", "█  █", "█  █"],
  Z: ["████", "   █", " ██ ", "█   ", "████"],
  Y: ["█  █", "█  █", " ██ ", " █  ", " █  "],
  S: [" ███", "█   ", " ██ ", "   █", "███ "],
  K: ["█  █", "█ █ ", "██  ", "█ █ ", "█  █"],
  I: ["███", " █ ", " █ ", " █ ", "███"],
  " ": ["  ", "  ", "  ", "  ", "  "],
};

const ROWS = 5;

function render(word: string): string[] {
  const lines = Array.from({ length: ROWS }, () => "");
  for (const char of word.toUpperCase()) {
    const glyph = GLYPHS[char];
    if (!glyph) continue;
    for (let r = 0; r < ROWS; r++) lines[r] += glyph[r] + " ";
  }
  return lines;
}

/**
 * `LAZY` in the terminal's own ink and `SKILL` in the theme accent, matching
 * the two-tone split the web app uses.
 */
export function banner(theme: Theme, version: string): string[] {
  const left = render("LAZY");
  const right = render("SKILL");

  const lines = left.map(
    (row, i) => `  ${style.bold(row)} ${rgb(theme.accent, style.bold(right[i]))}`
  );

  // The version sits on the last row, trailing the mark like a signature.
  lines[ROWS - 1] += `  ${style.gray("v" + version)}`;
  return lines;
}

/**
 * Bit, in blocks, for sitting beside things.
 *
 * A deliberately small silhouette — the hood, the closed eyes, the muzzle.
 * Anything more detailed turns to mush at terminal resolution.
 */
export function mascot(theme: Theme, awake = false): string[] {
  const hood = (t: string) => rgb(theme.accent, t);
  // Every row is exactly ten cells wide. Ragged rows shear the silhouette,
  // and the colour codes make it impossible to eyeball.
  const eyes = awake ? `${style.bold("o")}  ${style.bold("o")}` : "-  -";
  return [
    hood("  ▄████▄  "),
    hood(" ██") + style.gray("‾‾‾‾") + hood("██ "),
    hood(" █ ") + eyes + hood(" █ "),
    hood(" █  ") + style.gray("‿‿") + hood("  █ "),
    hood("  ▀████▀  "),
  ];
}
