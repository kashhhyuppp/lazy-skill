import { spawn } from "node:child_process";
import { buildInstallArgs, describePlan, type InstallPlan } from "./install-plan.js";

/**
 * Runs an install plan.
 *
 * The command is fixed (`npx`) and every argument comes from
 * `buildInstallArgs`, which only emits literals and validated values. It
 * spawns with `shell: false`, so no argument is ever parsed by a shell — this
 * is a specific, supported operation, not a remote shell (§23/§56).
 */

export type InstallStage =
  | "starting"
  | "downloading"
  | "installing"
  | "verifying"
  | "done"
  | "failed";

export interface InstallProgress {
  stage: InstallStage;
  /** A line from the installer, stripped of control sequences. */
  detail?: string;
}

export interface InstallOutcome {
  ok: boolean;
  exitCode: number | null;
  /** The last few output lines, kept for diagnostics on failure. */
  output: string[];
  error?: string;
}

/** Upstream prints spinners and colour; neither belongs in our progress. */
// eslint-disable-next-line no-control-regex
const CONTROL = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|[\r\x00-\x08\x0b\x0c\x0e-\x1f]/g;

function clean(chunk: string): string[] {
  return chunk
    .replace(CONTROL, "")
    .split("\n")
    .map((line) => line.replace(/^[│◇◆●○◒◐◓◑✓✔✗✘|\s]+/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Maps observed output to a stage, matched against the installer's real
 * markers rather than loose keywords.
 *
 * The specificity matters: the very first line upstream prints is
 * "Agent detected — installing non-interactively", which a bare "installing"
 * test reads as the install stage before anything has been downloaded.
 *
 * Deliberately conservative — an unrecognised line advances nothing rather
 * than inventing progress the installer never reported (§18).
 */
export function stageFor(line: string): InstallStage | null {
  const text = line.toLowerCase();

  // The startup banner is not a stage.
  if (text.includes("non-interactively")) return null;

  if (text.includes("source:") || text.includes("fetching") || text.includes("cloning")) {
    return "downloading";
  }
  if (/installing (all |\d)/.test(text) || text.includes("copy →") || text.includes("link →")) {
    return "installing";
  }
  if (
    text.includes("installation summary") ||
    text.includes("installed") ||
    text.includes("added")
  ) {
    return "verifying";
  }
  return null;
}

/** Stage ordering, used to keep reported progress monotonic. */
const STAGE_RANK: Record<InstallStage, number> = {
  starting: 0,
  downloading: 1,
  installing: 2,
  verifying: 3,
  done: 4,
  failed: 5,
};

export const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;

export async function runInstall(
  plan: InstallPlan,
  onProgress: (progress: InstallProgress) => void,
  options: { timeoutMs?: number; cwd?: string } = {}
): Promise<InstallOutcome> {
  const args = buildInstallArgs(plan);
  const output: string[] = [];

  onProgress({ stage: "starting", detail: describePlan(plan) });

  return new Promise<InstallOutcome>((resolve) => {
    const child = spawn("npx", args, {
      // No shell. The single most important line in this file.
      shell: false,
      cwd: options.cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        // Keep the child non-interactive and machine-readable. FORCE_COLOR is
        // removed rather than overridden: it wins over NO_COLOR downstream, so
        // inheriting a developer's FORCE_COLOR would put escape sequences back
        // into the output this parser reads.
        FORCE_COLOR: undefined,
        CI: "1",
        NO_COLOR: "1",
        npm_config_yes: "true",
      },
    });

    let settled = false;
    let lastStage: InstallStage = "starting";

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      // A wedged installer must not hold the device forever.
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
      onProgress({ stage: "failed", detail: "Timed out." });
      resolve({
        ok: false,
        exitCode: null,
        output,
        error: "The installer took too long and was stopped.",
      });
    }, options.timeoutMs ?? INSTALL_TIMEOUT_MS);

    const consume = (chunk: Buffer) => {
      for (const line of clean(chunk.toString())) {
        // Bounded: a chatty installer must not grow memory without limit.
        output.push(line);
        if (output.length > 200) output.shift();

        // Only ever move forward. The installer interleaves its own phases
        // (it prints an "installing" banner before it starts fetching), and a
        // progress bar that slides backwards reads as a fault.
        const next = stageFor(line);
        if (next && STAGE_RANK[next] > STAGE_RANK[lastStage]) {
          lastStage = next;
          onProgress({ stage: next, detail: line });
        }
      }
    };

    child.stdout?.on("data", consume);
    child.stderr?.on("data", consume);

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      onProgress({ stage: "failed", detail: err.message });
      resolve({
        ok: false,
        exitCode: null,
        output,
        error:
          (err as NodeJS.ErrnoException).code === "ENOENT"
            ? "npx was not found on this computer. Node.js is required."
            : err.message,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const ok = code === 0;
      onProgress({ stage: ok ? "done" : "failed" });
      resolve({
        ok,
        exitCode: code,
        output,
        error: ok ? undefined : output.at(-1) ?? `Installer exited with code ${code}.`,
      });
    });
  });
}
