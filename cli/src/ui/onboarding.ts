import { createInterface } from "node:readline/promises";
import { THEMES, THEME_IDS, rgb, style, type ThemeId } from "./theme.js";
import { blank, box, centre, hint, line, muted, welcome } from "./layout.js";

/**
 * First-run theme choice.
 *
 * Asked once, before anything else, because the answer applies to both halves
 * of the product: the terminal colours itself, and the phone adopts the same
 * theme the moment it pairs. Choosing later in two places would be two
 * chances to end up mismatched.
 */
export async function chooseTheme(): Promise<ThemeId> {
  const fallback: ThemeId = "cyber-purple";
  const theme = THEMES[fallback];

  blank();
  welcome(theme, "Welcome to Lazy Skill!");
  blank();
  hint("Pick a colour. Your phone will match it when you connect.");
  blank();

  box(
    theme,
    THEME_IDS.map((id, i) => {
      const t = THEMES[id];
      return `${style.gray(String(i + 1))}  ${rgb(t.accent, "████")}  ${t.label}`;
    })
  );

  blank();

  // A pipe or a CI job has nobody to ask.
  if (!process.stdin.isTTY) {
    muted("Not a terminal — using Purple Night. Change it with: lazy-skill theme");
    blank();
    return fallback;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`  Number ${style.gray("(enter for 1)")} `)).trim();
    if (!answer) return fallback;

    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= THEME_IDS.length) {
      // Not worth a re-prompt: the choice is cosmetic and changeable.
      line(style.gray("  Not one of those — using Purple Night."));
      return fallback;
    }
    return THEME_IDS[index];
  } finally {
    rl.close();
  }
}
