import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** True when `name` resolves on PATH. */
export async function onPath(name: string): Promise<boolean> {
  // A fixed lookup tool with the name passed as an argument — never a shell
  // string, so a crafted name cannot become a command.
  const finder = process.platform === "win32" ? "where" : "which";
  try {
    const { stdout } = await run(finder, [name], { timeout: 3000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

export function homePath(...segments: string[]): string {
  return join(homedir(), ...segments);
}

export function anyExists(paths: string[]): string | null {
  for (const path of paths) {
    try {
      if (existsSync(path)) return path;
    } catch {
      // Unreadable path is not a detection.
    }
  }
  return null;
}
