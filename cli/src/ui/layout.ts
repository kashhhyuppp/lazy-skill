import { rgb, style, visibleWidth, type Theme } from "./theme.js";

/**
 * The CLI's visual language.
 *
 * One box, around the thing the user is meant to act on — the QR, a prompt, a
 * result. Everything else is indented text. Framing every line was the
 * problem before: two border glyphs per row, a fixed width, and content
 * squeezed between them.
 */

export const PAD = "  ";

/** Box width, clamped so it stays readable in a narrow terminal. */
export function boxWidth(): number {
  const columns = process.stdout.columns ?? 80;
  return Math.max(44, Math.min(72, columns - 4));
}

export function blank(): void {
  console.log();
}

export function line(text = ""): void {
  console.log(text ? `${PAD}${text}` : "");
}

export function muted(text: string): void {
  console.log(`${PAD}${style.gray(text)}`);
}

/** The welcome line. The mark, then the product, then a greeting. */
export function welcome(theme: Theme, text: string): void {
  console.log(`${PAD}${rgb(theme.accent, "✻")} ${style.bold(text)}`);
}

/** An indented hint under the welcome. */
export function hint(text: string): void {
  console.log(`${PAD}  ${style.gray(text)}`);
}

export type StatusTone = "ok" | "pending" | "off" | "fail";

const DOT: Record<StatusTone, string> = {
  ok: style.green("●"),
  pending: style.yellow("●"),
  off: style.gray("○"),
  fail: style.red("●"),
};

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

export function ok(text: string): void {
  console.log(`${PAD}${style.green("✓")} ${text}`);
}

export function warn(text: string): void {
  console.log(`${PAD}${style.yellow("!")} ${text}`);
}

export function fail(text: string): void {
  console.log(`${PAD}${style.red("✗")} ${text}`);
}

/**
 * The one box.
 *
 * Rows are padded to a common width using their *visible* length, so colour
 * codes inside the content cannot push the right border out of alignment.
 */
export function box(theme: Theme, rows: string[], width = boxWidth()): void {
  const edge = (left: string, right: string) =>
    console.log(`${PAD}${rgb(theme.accent, left + "─".repeat(width - 2) + right)}`);

  const bar = rgb(theme.accent, "│");

  edge("╭", "╮");
  for (const row of rows) {
    const pad = Math.max(0, width - 4 - visibleWidth(row));
    console.log(`${PAD}${bar} ${row}${" ".repeat(pad)} ${bar}`);
  }
  edge("╰", "╯");
}

/** Centres a row inside the box. */
export function centre(text: string, width = boxWidth()): string {
  const inner = width - 4;
  const left = Math.max(0, Math.floor((inner - visibleWidth(text)) / 2));
  return " ".repeat(left) + text;
}

export { visibleWidth };
