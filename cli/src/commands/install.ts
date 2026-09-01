import { createInterface } from "node:readline/promises";
import { readConfig } from "../lib/config.js";
import {
  adapterFor,
  createInstallPlan,
  describePlan,
  detectAgents,
  InvalidPlanError,
  type AgentAdapter,
  type InstallProgress,
} from "../adapters/index.js";
import { THEMES, rgb, style, type Theme } from "../ui/theme.js";
import { bottom, centered, mascot, row, top } from "../ui/box.js";
import { messages } from "../ui/messages.js";

const STAGE_LABEL: Record<string, string> = {
  starting: "Preparing",
  downloading: "Downloading",
  installing: "Installing",
  verifying: "Verifying",
  done: "Done",
  failed: "Failed",
};

const ORDER = ["downloading", "installing", "verifying"] as const;

function progressBar(theme: Theme, stage: string): string {
  const reached = ORDER.indexOf(stage as (typeof ORDER)[number]);
  return ORDER.map((step, i) => {
    const filled = reached >= i;
    const bar = filled ? "████" : "░░░░";
    return `${filled ? rgb(theme.accent, bar) : style.gray(bar)}`;
  }).join(" ");
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`  ${question} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

/**
 * Installs a skill locally through the one supported pathway.
 *
 * The user is shown the exact command before anything runs (§23), and only
 * agents actually detected on this machine are offered — installing "for
 * Cursor" on a computer without Cursor would be a lie.
 */
export async function installCommand(
  ref: string | undefined,
  options: { agents?: string; yes: boolean; project?: boolean } = { yes: false }
): Promise<number> {
  const theme = THEMES[readConfig().theme];

  if (!ref) {
    console.error(`\n  ${style.red("✗")} Usage: lazy-skill install <owner/repo> [--agent claude]\n`);
    return 1;
  }

  const detected = await detectAgents();
  const available = detected.filter((agent) => agent.detected);

  if (available.length === 0) {
    console.error(`\n  ${style.yellow("!")} No supported AI tools were detected on this computer.`);
    console.error(`  ${style.gray("Install Claude Code, Codex or Cursor first.")}\n`);
    return 1;
  }

  const requested = options.agents
    ? options.agents.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean)
    : available.map((a) => a.id);

  const targets: AgentAdapter[] = [];
  for (const id of requested) {
    const adapter = adapterFor(id);
    if (!adapter) {
      console.error(`\n  ${style.red("✗")} Unknown agent "${id}".`);
      console.error(`  ${style.gray("Known:")} ${detected.map((a) => a.id).join(", ")}\n`);
      return 1;
    }
    // Refuse to claim an install for something that is not here (§13).
    if (!available.some((a) => a.id === adapter.id)) {
      console.error(`\n  ${style.red("✗")} ${adapter.label} was not detected on this computer.\n`);
      return 1;
    }
    if (!targets.includes(adapter)) targets.push(adapter);
  }

  let plan;
  try {
    plan = createInstallPlan({
      skillRef: ref,
      agents: targets.map((t) => t.upstreamId),
      scope: options.project ? "project" : "global",
    });
  } catch (err) {
    const message = err instanceof InvalidPlanError ? err.message : "That request is not valid.";
    console.error(`\n  ${style.red("✗")} ${message}\n`);
    return 1;
  }

  // Show exactly what will run, before it runs.
  console.log();
  console.log(top(theme));
  console.log(row(theme));
  console.log(row(theme, style.bold(`Install ${ref}`)));
  console.log(row(theme, `for ${targets.map((t) => t.label).join(", ")}`));
  console.log(row(theme, style.gray(options.project ? "scope: this project" : "scope: global")));
  console.log(row(theme));
  console.log(row(theme, style.gray("This will run:")));
  console.log(row(theme, rgb(theme.accent, describePlan(plan).slice(0, 48))));
  console.log(row(theme));
  console.log(bottom(theme));
  console.log();

  if (!options.yes && !(await confirm("Continue?"))) {
    console.log(`  ${style.gray("Cancelled. Nothing was installed.")}\n`);
    return 1;
  }

  console.log();
  let lastStage = "starting";
  const onProgress = (progress: InstallProgress) => {
    if (progress.stage === lastStage) return;
    lastStage = progress.stage;
    if (progress.stage === "done" || progress.stage === "failed") return;
    const label = STAGE_LABEL[progress.stage] ?? progress.stage;
    console.log(`  ${label.padEnd(12)} ${progressBar(theme, progress.stage)}`);
  };

  // One adapter at a time, so a failure names the agent it belongs to.
  const failures: string[] = [];
  for (const adapter of targets) {
    const outcome = await adapter.install(plan, onProgress);
    if (!outcome.ok) {
      failures.push(`${adapter.label}: ${outcome.error ?? "install failed"}`);
    }
    lastStage = "starting";
  }

  console.log();

  if (failures.length > 0) {
    console.log(`  ${style.red("✗")} ${messages.failed()}`);
    for (const failure of failures) console.log(`  ${style.gray(failure)}`);
    console.log(`  ${style.gray("We haven't blamed you yet.")}\n`);
    return 1;
  }

  console.log(top(theme));
  console.log(row(theme));
  for (const line of mascot(theme, true)) console.log(centered(theme, line));
  console.log(row(theme));
  console.log(centered(theme, rgb(theme.accent, style.bold("INSTALLED!"))));
  console.log(row(theme));
  console.log(row(theme, `${ref}`));
  for (const target of targets) {
    console.log(row(theme, `${target.label.padEnd(12)} ${style.green("✓")}`));
  }
  console.log(row(theme));
  console.log(row(theme, `${style.gray("You contributed")}   ${style.bold("0% effort")}`));
  console.log(row(theme, `${style.gray("Lazy Skill")}        ${rgb(theme.accent, "100% effort")}`));
  console.log(row(theme));
  console.log(bottom(theme));
  console.log();
  return 0;
}
