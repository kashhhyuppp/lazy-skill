import { rgb, hasColor, type Theme } from "./theme.js";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * A single-line spinner that cleans up after itself.
 *
 * Falls back to a plain printed line when stdout is not a TTY, so piping the
 * CLI into a log does not produce thousands of redraw sequences.
 */
export class Spinner {
  private timer: NodeJS.Timeout | null = null;
  private frame = 0;

  constructor(private readonly theme: Theme, private text: string) {}

  start(): this {
    if (!process.stdout.isTTY || !hasColor) {
      process.stdout.write(`  ${this.text}\n`);
      return this;
    }
    process.stdout.write("\x1b[?25l"); // hide cursor
    this.timer = setInterval(() => {
      const glyph = rgb(this.theme.accent, FRAMES[this.frame++ % FRAMES.length]);
      process.stdout.write(`\r  ${glyph} ${this.text}\x1b[K`);
    }, 80);
    return this;
  }

  update(text: string): void {
    this.text = text;
  }

  stop(final?: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      process.stdout.write("\r\x1b[K\x1b[?25h"); // clear line, show cursor
    }
    if (final) process.stdout.write(`  ${final}\n`);
  }
}
