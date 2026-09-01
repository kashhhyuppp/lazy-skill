import { api, ApiError } from "../lib/api.js";
import { readConfig } from "../lib/config.js";
import {
  adapterFor,
  createInstallPlan,
  detectAgents,
  InvalidPlanError,
  type InstallProgress,
} from "../adapters/index.js";
import { isJobCommand, parseInstallPayload, UnsafeJobError } from "../lib/job-contract.js";
import { THEMES, rgb, style, type Theme } from "../ui/theme.js";
import { messages } from "../ui/messages.js";

interface Job {
  id: string;
  command: string;
  payload: unknown;
}

const IDLE_POLL_MS = 3000;
const ERROR_BACKOFF_MS = 15_000;

function log(theme: Theme, line: string): void {
  const time = new Date().toLocaleTimeString();
  console.log(`  ${style.gray(time)} ${line}`);
  void theme;
}

async function report(
  jobId: string,
  body: { status: string; stage?: string; error?: string; agents?: string[] }
): Promise<void> {
  try {
    await api("/api/cli/jobs/progress", { authed: true, body: { jobId, ...body } });
  } catch {
    // Progress is advisory. Losing a status update must not abort an install
    // that is otherwise going fine.
  }
}

/**
 * Executes one job.
 *
 * Everything the server sent is re-validated here before anything runs. The
 * server queues intent; this decides whether that intent is safe, and refuses
 * it outright if not (§56).
 */
async function runJob(theme: Theme, job: Job): Promise<void> {
  if (!isJobCommand(job.command)) {
    log(theme, `${style.red("✗")} refused unknown command "${String(job.command)}"`);
    await report(job.id, { status: "failed", error: "Unknown command." });
    return;
  }

  if (job.command !== "INSTALL_SKILL") {
    // The other verbs are answered by the heartbeat rather than as jobs.
    await report(job.id, { status: "succeeded", stage: "done" });
    return;
  }

  let payload;
  try {
    payload = parseInstallPayload(job.payload);
  } catch (err) {
    const message = err instanceof UnsafeJobError ? err.message : "Malformed job.";
    log(theme, `${style.red("✗")} ${message}`);
    await report(job.id, { status: "failed", error: message });
    return;
  }

  // Only install to agents this machine actually has. The server checks too,
  // but the device is the only party that really knows (§13).
  const detected = (await detectAgents()).filter((a) => a.detected).map((a) => a.id);
  const targets = payload.agents.filter((agent) => detected.includes(agent));

  if (targets.length === 0) {
    const message = "None of the requested tools are installed on this computer.";
    log(theme, `${style.yellow("!")} ${message}`);
    await report(job.id, { status: "failed", error: message, agents: payload.agents });
    return;
  }

  log(theme, `${rgb(theme.accent, "▸")} installing ${style.bold(payload.skillName)}`);
  await report(job.id, { status: "running", stage: "starting" });

  const failures: string[] = [];

  for (const agentId of targets) {
    const adapter = adapterFor(agentId);
    if (!adapter) continue;

    let plan;
    try {
      plan = createInstallPlan({
        skillRef: payload.skillRef,
        agents: [adapter.upstreamId],
        scope: payload.scope,
      });
    } catch (err) {
      const message = err instanceof InvalidPlanError ? err.message : "Invalid plan.";
      failures.push(`${adapter.label}: ${message}`);
      await report(job.id, { status: "running", error: message, agents: [agentId] });
      continue;
    }

    const onProgress = (progress: InstallProgress) => {
      if (progress.stage === "done" || progress.stage === "failed") return;
      void report(job.id, { status: "running", stage: progress.stage, agents: [agentId] });
    };

    const outcome = await adapter.install(plan, onProgress);

    if (outcome.ok) {
      log(theme, `  ${style.green("✓")} ${adapter.label}`);
      await report(job.id, { status: "running", stage: "done", agents: [agentId] });
    } else {
      const message = outcome.error ?? "Install failed.";
      log(theme, `  ${style.red("✗")} ${adapter.label}: ${message}`);
      failures.push(`${adapter.label}: ${message}`);
      await report(job.id, { status: "running", stage: "failed", error: message, agents: [agentId] });
    }
  }

  if (failures.length === targets.length) {
    await report(job.id, { status: "failed", stage: "failed", error: failures.join("; ") });
    log(theme, `${style.red("✗")} ${messages.failed()}`);
  } else {
    await report(job.id, {
      status: "succeeded",
      stage: "done",
      error: failures.length ? failures.join("; ") : undefined,
    });
    log(theme, `${style.green("✓")} done`);
  }
}

/**
 * Waits for work from the app.
 *
 * Polling rather than a socket: it survives sleep, captive portals and
 * proxies, and there is nothing to reconnect. The device authenticates every
 * request, so no long-lived connection is holding a credential open.
 */
export async function listenCommand(options: { once?: boolean } = {}): Promise<number> {
  const config = readConfig();
  const theme = THEMES[config.theme];

  if (!config.deviceToken) {
    console.error(`\n  ${style.red("✗")} Not connected. Run ${style.bold("lazy-skill connect")} first.\n`);
    return 1;
  }

  console.log();
  console.log(`  ${rgb(theme.accent, "●")} ${style.bold("Listening")} for installs from your phone.`);
  console.log(`  ${style.gray("Leave this running. Ctrl-C to stop.")}`);
  console.log();

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    console.log(`\n  ${style.gray(messages.signOff())}\n`);
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  let backoff = IDLE_POLL_MS;

  while (!stopped) {
    try {
      const { job } = await api<{ job: Job | null }>("/api/cli/jobs/claim", { authed: true });
      backoff = IDLE_POLL_MS;
      if (job) await runJob(theme, job);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        console.error(`\n  ${style.red("✗")} This computer was disconnected from the app.`);
        console.error(`  ${style.gray("Run")} lazy-skill connect ${style.gray("to pair again.")}\n`);
        return 1;
      }
      // Network blips are expected on a laptop. Back off rather than spinning.
      backoff = Math.min(backoff * 2, ERROR_BACKOFF_MS);
    }

    if (options.once) return 0;
    await new Promise((resolve) => setTimeout(resolve, backoff));
  }

  return 0;
}
