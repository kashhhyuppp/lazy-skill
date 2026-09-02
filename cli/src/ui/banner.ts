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
 * Bit, hand-drawn.
 *
 * The generated 32x32 sprite is right for the phone, where there is
 * resolution to spare. In a terminal it turned to mush: ellipses at that
 * scale produce a cream blob with dark smears, and no amount of nudging the
 * shapes fixed it. This is drawn character by character instead — a hood, a
 * face, two closed eyes, a nose and a smile — which is far fewer pixels but
 * reads instantly, which is the only thing that matters here.
 *
 * Every row is exactly 13 cells wide. Ragged rows shear the silhouette, and
 * the colour codes make that impossible to spot by eye.
 */
const FACE: [number, number, number] = [227, 201, 164];
const FEATURE: [number, number, number] = [70, 48, 35];

export function mascot(theme: Theme, awake = false): string[] {
  const hood = (t: string) => rgb(theme.accent, t);
  const face = (t: string) => rgb(FACE, t);
  const mark = (t: string) => rgb(FEATURE, t);
  const zzz = (t: string) => rgb(theme.support, t);

  // Open eyes are dots; closed eyes are the lower half of a block, which
  // reads as a lid rather than a gap.
  const eyes = awake ? mark("●●") : mark("▄▄");

  return [
    hood("   ▄▄▄▄▄▄▄   "),
    hood("  █") + face("███████") + hood("█  "),
    hood("  █") + face("█") + eyes + face("█") + eyes + face("█") + hood("█  ") + (awake ? "" : zzz("z")),
    hood("  █") + face("███") + mark("▾") + face("███") + hood("█  ") + (awake ? "" : zzz("z")),
    hood("  █") + face("██") + mark("‿‿‿") + face("██") + hood("█  "),
    hood("   ▀▀▀▀▀▀▀   "),
  ];
}
