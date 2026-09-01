import { createInterface } from "node:readline/promises";
import { readConfig, updateConfig } from "../lib/config.js";
import { THEMES, THEME_IDS, rgb, style } from "../ui/theme.js";

/**
 * Theme picker. The choice is stored locally and travels with the next
 * pairing so the phone adopts the same look.
 */
export async function themeCommand(requested?: string): Promise<number> {
  const current = readConfig().theme;

  if (requested) {
    const match = THEME_IDS.find((id) => id === requested);
    if (!match) {
      console.error(`\n  ${style.red("✗")} Unknown theme "${requested}".`);
      console.error(`  ${style.gray("Options:")} ${THEME_IDS.join(", ")}\n`);
      return 1;
    }
    updateConfig({ theme: match });
    console.log(`\n  ${style.green("✓")} Theme set to ${rgb(THEMES[match].accent, THEMES[match].label)}.\n`);
    return 0;
  }

  console.log(`\n  ${style.bold("Pick a theme")}\n`);
  THEME_IDS.forEach((id, i) => {
    const t = THEMES[id];
    const marker = id === current ? style.green("●") : style.gray("○");
    console.log(`  ${marker} ${i + 1}. ${rgb(t.accent, "████")} ${t.label}`);
  });
  console.log();

  if (!process.stdin.isTTY) {
    console.log(`  ${style.gray("Not a terminal — pass a theme id instead, e.g. lazy-skill theme matrix-green")}\n`);
    return 0;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question("  Number (enter to keep current): ")).trim();
    if (!answer) return 0;

    const index = Number(answer) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= THEME_IDS.length) {
      console.log(`\n  ${style.yellow("!")} Not one of the options. Theme unchanged.\n`);
      return 1;
    }

    const chosen = THEME_IDS[index];
    updateConfig({ theme: chosen });
    console.log(`\n  ${style.green("✓")} Theme set to ${rgb(THEMES[chosen].accent, THEMES[chosen].label)}.\n`);
    return 0;
  } finally {
    rl.close();
  }
}
