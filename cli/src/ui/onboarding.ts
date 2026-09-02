import { THEMES, THEME_IDS, rgb, style, type ThemeId } from "./theme.js";
import { banner, mascot } from "./banner.js";
import { pointer, select } from "./select.js";

/**
 * First-run theme choice, with live preview.
 *
 * The whole screen — wordmark, mascot, pointer — repaints in whichever theme
 * is under the cursor, so the choice is made by looking rather than by
 * imagining. It is asked once because it applies to both halves of the
 * product: the terminal colours itself, and the phone adopts the same theme
 * the moment it pairs.
 */
export async function chooseTheme(version: string): Promise<ThemeId> {
  const rows = (index: number): string[] => {
    const id = THEME_IDS[index];
    const theme = THEMES[id];
    const bit = mascot(theme, true);

    const out: string[] = [""];
    out.push(...banner(theme, version));
    out.push("");
    out.push(`  ${style.gray("Pick a colour. Your phone will match it when you connect.")}`);
    out.push("");

    THEME_IDS.forEach((themeId, i) => {
      const t = THEMES[themeId];
      const active = i === index;
      const swatch = rgb(t.accent, "████");
      // Pad before colouring: padEnd counts escape codes as characters, so
      // padding a coloured string leaves the column ragged.
      const padded = t.label.padEnd(14);
      const label = active ? style.bold(padded) : style.gray(padded);
      // The mascot sits beside the list, aligned to its middle rows.
      const beside = i >= 1 && i <= 6 ? "  " + bit[i - 1] : "";
      out.push(`  ${pointer(active)} ${swatch}  ${label}${beside}`);
    });

    out.push("");
    out.push(`  ${style.gray("↑ ↓ to move · enter to choose")}`);
    out.push("");
    return out;
  };

  return select<ThemeId>({
    choices: THEME_IDS.map((id) => ({ value: id, label: THEMES[id].label })),
    render: rows,
  });
}
