import { readConfig, updateConfig } from "../lib/config.js";
import { THEMES, THEME_IDS, rgb, style } from "../ui/theme.js";
import { banner } from "../ui/banner.js";
import { pointer, select } from "../ui/select.js";
import { blank, muted, ok } from "../ui/layout.js";

/**
 * Theme picker. The choice is stored locally and travels with the next
 * pairing, so the phone ends up on the same colour.
 */
export async function themeCommand(requested: string | undefined, version: string): Promise<number> {
  const current = readConfig().theme;

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

  const chosen = await select<(typeof THEME_IDS)[number]>({
    choices: THEME_IDS.map((id) => ({ value: id, label: THEMES[id].label })),
    initial: THEME_IDS.indexOf(current),
    render: (index) => {
      const theme = THEMES[THEME_IDS[index]];
  
      const out: string[] = [""];
      out.push(...banner(theme, version));
      out.push("");

      THEME_IDS.forEach((themeId, i) => {
        const t = THEMES[themeId];
        const active = i === index;
        const mark = themeId === current ? style.green("●") : style.gray("○");
        // Pad before colouring: padEnd counts escape codes as characters, so
      // padding a coloured string leaves the column ragged.
      const padded = t.label.padEnd(14);
      const label = active ? style.bold(padded) : style.gray(padded);
          out.push(`  ${pointer(active)} ${mark} ${rgb(t.accent, "████")}  ${label}`);
      });

      out.push("");
      out.push(`  ${style.gray("↑ ↓ to move · enter to choose")}`);
      out.push("");
      return out;
    },
  });

  updateConfig({ theme: chosen });
  ok(`Theme set to ${rgb(THEMES[chosen].accent, THEMES[chosen].label)}.`);
  muted("Connect again to carry it to your phone.");
  blank();
  return 0;
}
