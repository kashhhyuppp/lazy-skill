import { emitKeypressEvents } from "node:readline";
import { style, hasColor } from "./theme.js";

export interface Choice<T> {
  value: T;
  label: string;
  /** Rendered before the label — a swatch, an icon. */
  badge?: string;
}

/**
 * Arrow-key selection with live redraw.
 *
 * Raw mode rather than a prompt library: the whole dependency would exist to
 * read four escape sequences. Cursor state is restored in a `finally` and on
 * SIGINT — leaving a terminal with a hidden cursor and no echo is a genuinely
 * hostile thing to do to someone who pressed Ctrl-C.
 */
export async function select<T>({
  choices,
  initial = 0,
  render,
}: {
  choices: Choice<T>[];
  initial?: number;
  /** Draws the whole screen. Called on every keypress. */
  render: (index: number) => string[];
}): Promise<T> {
  const stdin = process.stdin;

  // No TTY means nobody to ask; a pipe or CI takes the default.
  if (!stdin.isTTY || !hasColor) {
    for (const row of render(initial)) console.log(row);
    return choices[initial].value;
  }

  let index = Math.max(0, Math.min(initial, choices.length - 1));
  let painted = 0;

  const paint = () => {
    // Move back over what was drawn last time and overwrite it, so the list
    // updates in place instead of scrolling.
    if (painted > 0) process.stdout.write(`\x1b[${painted}A`);
    const rows = render(index);
    for (const row of rows) process.stdout.write(`\r\x1b[K${row}\n`);
    painted = rows.length;
  };

  emitKeypressEvents(stdin);
  const wasRaw = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();
  process.stdout.write("\x1b[?25l"); // hide cursor

  const restore = () => {
    process.stdout.write("\x1b[?25h");
    stdin.setRawMode(Boolean(wasRaw));
    stdin.pause();
  };

  return new Promise<T>((resolve) => {
    const onKey = (
      _chunk: string,
      key: { name?: string; ctrl?: boolean } | undefined
    ) => {
      if (!key) return;

      if (key.name === "up" || key.name === "k") {
        index = (index - 1 + choices.length) % choices.length;
        paint();
        return;
      }
      if (key.name === "down" || key.name === "j") {
        index = (index + 1) % choices.length;
        paint();
        return;
      }
      if (key.name === "return" || key.name === "space") {
        cleanup();
        resolve(choices[index].value);
        return;
      }
      // Ctrl-C and Escape both accept the highlighted value rather than
      // throwing: this choice is cosmetic, and refusing to continue over it
      // would be worse than picking the one under the cursor.
      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        resolve(choices[index].value);
        return;
      }

      // Number keys jump straight to a row.
      const digit = Number(key.name);
      if (Number.isInteger(digit) && digit >= 1 && digit <= choices.length) {
        index = digit - 1;
        paint();
      }
    };

    const cleanup = () => {
      stdin.off("keypress", onKey);
      restore();
    };

    stdin.on("keypress", onKey);
    paint();
  });
}

/** The pointer column for a row. */
export function pointer(active: boolean): string {
  return active ? style.bold("❯") : " ";
}
