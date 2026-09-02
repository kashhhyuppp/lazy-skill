import { createInterface } from "node:readline/promises";
import { readConfig, updateConfig } from "../lib/config.js";
import { THEMES, THEME_IDS, rgb, style } from "../ui/theme.js";
import { blank, box, muted, ok, welcome } from "../ui/layout.js";

/**
 * Theme picker. The choice is stored locally and travels with the next
 * pairing, so the phone ends up on the same colour.
 */
export async function themeCommand(requested?: string): Promise<number> {
  const current = readConfig().theme;
  const theme = THEMES[current];

  if (requested) {
    const match = THEME_IDS.find((id) => id === requested);
    if (!match) {
      blank();
      muted(`Unknown theme "${requested}".`);
      muted(THEME_IDS.join(", "));
      blank();
      return 1;
    }
    updateConfig({ theme: match });
    blank();
    ok(`Theme set to ${rgb(THEMES[match].accent, THEMES[match].label)}.`);
    muted("Connect again to carry it to your phone.");
    blank();
    return 0;
  }

  blank();
  welcome(theme, "Pick a colour");
  blank();

  box(
    theme,
    THEME_IDS.map((id, i) => {
      const t = THEMES[id];
      const marker = id === current ? style.green("●") : style.gray("○");
      return `${marker} ${style.gray(String(i + 1))}  ${rgb(t.accent, "████")}  ${t.label}`;
    })
  );

  blank();

  if (!process.stdin.isTTY) {
    muted("Not a terminal — pass an id, e.g. lazy-skill theme matrix-green");
    blank();
    return 0;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`  Number ${style.gray("(enter to keep)")} `)).trim();
    if (!answer) return 0;

    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= THEME_IDS.length) {
      blank();
      muted("Not one of those. Theme unchanged.");
      blank();
      return 1;
    }

    const chosen = THEME_IDS[index];
    updateConfig({ theme: chosen });
    blank();
    ok(`Theme set to ${rgb(THEMES[chosen].accent, THEMES[chosen].label)}.`);
    muted("Connect again to carry it to your phone.");
    blank();
    return 0;
  } finally {
    rl.close();
  }
}
