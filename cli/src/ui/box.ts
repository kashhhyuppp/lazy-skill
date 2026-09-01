import { rgb, style, visibleWidth, type Theme } from "./theme.js";

/**
 * The framed card the CLI draws. Rounded corners and a themed border, to match
 * the cards on the brand board.
 */
const B = {
  tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│",
} as const;

export const CARD_WIDTH = 56;

export function rule(theme: Theme, width = CARD_WIDTH): string {
  return rgb(theme.accent, B.h.repeat(width - 2));
}

export function top(theme: Theme, width = CARD_WIDTH): string {
  return rgb(theme.accent, B.tl + B.h.repeat(width - 2) + B.tr);
}

export function bottom(theme: Theme, width = CARD_WIDTH): string {
  return rgb(theme.accent, B.bl + B.h.repeat(width - 2) + B.br);
}

/** A content row, padded to the card width using visible (not raw) length. */
export function row(theme: Theme, content = "", width = CARD_WIDTH): string {
  const inner = width - 4;
  const pad = Math.max(0, inner - visibleWidth(content));
  const edge = rgb(theme.accent, B.v);
  return `${edge} ${content}${" ".repeat(pad)} ${edge}`;
}

export function centered(theme: Theme, content: string, width = CARD_WIDTH): string {
  const inner = width - 4;
  const len = visibleWidth(content);
  const left = Math.max(0, Math.floor((inner - len) / 2));
  return row(theme, " ".repeat(left) + content, width);
}

/**
 * The wordmark, in the same two-tone split the web app uses: LAZY in the
 * terminal's default ink, SKILL in the theme accent.
 */
export function wordmark(theme: Theme): string[] {
  return [
    `${style.bold("LAZY")} ${rgb(theme.accent, style.bold("SKILL"))}${rgb(theme.support, " Zz")}`,
  ];
}

/** Bit, small enough to sit inside a card. */
export function mascot(theme: Theme, awake = false): string[] {
  const hood = (t: string) => rgb(theme.accent, t);
  const eyes = awake ? "o o" : "- -";
  return [
    hood("  ▄███▄  "),
    hood(" █") + `\x1b[0m${eyes}` + hood("█ "),
    hood(" █ ") + "‿" + hood(" █ "),
    hood("  ▀███▀  "),
  ];
}

export function statusLine(label: string, ok: boolean | null): string {
  const mark = ok === null ? style.gray("○") : ok ? style.green("✓") : style.gray("○");
  const text = ok === null ? style.gray("Not detected") : ok ? style.green("Ready") : style.gray("Not detected");
  return `${label.padEnd(12)} ${mark} ${text}`;
}
