import { rgb, style, visibleWidth, type Theme } from "./theme.js";

/**
 * The CLI's visual language.
 *
 * No frames. The old design wrapped everything in a box, which meant every
 * line carried two border glyphs and a fixed width, and the content had to
 * fight for the space between them. Indentation and blank lines do the same
 * grouping work without the noise, and they reflow on any terminal size.
 */

const PAD = "  ";

export function blank(): void {
  console.log();
}

/** The wordmark. Two-tone, matching the web app. */
export function brand(theme: Theme): void {
  console.log(
    `${PAD}${style.bold("LAZY")} ${rgb(theme.accent, style.bold("SKILL"))}${rgb(theme.support, " Zz")}`
  );
}

/** A quiet line of supporting text. */
export function muted(text: string): void {
  console.log(`${PAD}${style.gray(text)}`);
}

/** A normal line. */
export function line(text = ""): void {
  console.log(text ? `${PAD}${text}` : "");
}

/** A heading, used sparingly — one per screen at most. */
export function heading(theme: Theme, text: string): void {
  console.log(`${PAD}${rgb(theme.accent, style.bold(text))}`);
}

export type StatusTone = "ok" | "pending" | "off" | "fail";

const DOT: Record<StatusTone, string> = {
  ok: style.green("●"),
  pending: style.yellow("●"),
  off: style.gray("○"),
  fail: style.red("●"),
};

/** `● Claude    ready` — the dot carries the state, the word confirms it. */
export function status(label: string, tone: StatusTone, detail = ""): void {
  const width = 10;
  const name = label.length >= width ? label : label + " ".repeat(width - label.length);
  const text =
    tone === "ok"
      ? style.green(detail || "ready")
      : tone === "fail"
        ? style.red(detail || "failed")
        : style.gray(detail || "not found");
  console.log(`${PAD}${DOT[tone]} ${name} ${text}`);
}

/** A step in a sequence, numbered so the order is obvious. */
export function step(theme: Theme, n: number, text: string): void {
  console.log(`${PAD}${rgb(theme.accent, String(n))}  ${text}`);
}

/** Something the user is meant to type or scan. */
export function emphasis(theme: Theme, text: string): void {
  console.log(`${PAD}${rgb(theme.accent, text)}`);
}

/** A short rule, only where a real break is needed. */
export function divider(width = 34): void {
  console.log(`${PAD}${style.gray("─".repeat(width))}`);
}

export function ok(text: string): void {
  console.log(`${PAD}${style.green("✓")} ${text}`);
}

export function warn(text: string): void {
  console.log(`${PAD}${style.yellow("!")} ${text}`);
}

export function fail(text: string): void {
  console.log(`${PAD}${style.red("✗")} ${text}`);
}

export { PAD, visibleWidth };
