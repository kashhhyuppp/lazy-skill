import { hostname, platform, release } from "node:os";
import { api, ApiError } from "../lib/api.js";
import { readConfig, updateConfig } from "../lib/config.js";
import { detectAgents, type AgentStatus } from "../adapters/index.js";
import { THEMES, rgb, style, type Theme } from "../ui/theme.js";
import { bottom, centered, mascot, row, statusLine, top, wordmark } from "../ui/box.js";
import { renderQr } from "../ui/qr.js";
import { messages } from "../ui/messages.js";
import { Spinner } from "../ui/spinner.js";

interface StartResponse {
  code: string;
  expiresAt: string;
  expiresInMs: number;
  pairUrl: string;
}

interface PollResponse {
  status: "waiting" | "paired" | "expired" | "consumed";
  deviceToken?: string;
  device?: { id: string; name: string; detected_agents?: string[] } | null;
}

function friendlyPlatform(): "darwin" | "win32" | "linux" | "unknown" {
  const p = platform();
  return p === "darwin" || p === "win32" || p === "linux" ? p : "unknown";
}

function deviceName(): string {
  return hostname().replace(/\.local$/, "").slice(0, 80) || "This computer";
}

function printHeader(theme: Theme): void {
  console.log();
  console.log(top(theme));
  console.log(row(theme));
  for (const line of wordmark(theme)) console.log(centered(theme, line));
  console.log(centered(theme, style.dim("Too lazy to install manually? Same.")));
  console.log(row(theme));
}

function printAgents(theme: Theme, agents: AgentStatus[]): void {
  console.log(row(theme, style.bold("Detected AI tools")));
  console.log(row(theme));
  for (const agent of agents) {
    console.log(row(theme, statusLine(agent.label, agent.detected ? true : null)));
  }
}

export async function connectCommand(options: {
  verbose: boolean;
  listen?: boolean;
}): Promise<number> {
  const config = readConfig();
  const theme = THEMES[config.theme];

  // Detection runs before the card is drawn. A spinner writes to the current
  // line, so anything transient printed between two card rows tears the frame.
  const detectSpinner = new Spinner(theme, messages.booting()[0]).start();
  const agents = await detectAgents();
  const detectedIds = agents.filter((a) => a.detected).map((a) => a.id);
  detectSpinner.stop();

  printHeader(theme);
  console.log(row(theme, `${style.gray(">")} ${messages.humanFound()} ${style.green("✓")}`));
  console.log(row(theme, `${style.gray(">")} ${messages.generating()}`));
  console.log(row(theme));

  if (options.verbose) {
    for (const agent of agents) {
      if (agent.evidence) console.log(row(theme, style.gray(`  ${agent.label}: ${agent.evidence}`)));
    }
    console.log(row(theme));
  }

  // --- open a pairing session -----------------------------------------
  let session: StartResponse;
  try {
    session = await api<StartResponse>("/api/pairing/start", {
      body: {
        deviceName: deviceName(),
        platform: friendlyPlatform(),
        osVersion: release(),
        detectedAgents: detectedIds,
        theme: theme.id,
      },
    });
  } catch (err) {
    console.log(bottom(theme));
    console.log();
    const message = err instanceof ApiError ? err.message : messages.failed();
    console.error(`  ${style.red("✗")} ${message}`);
    console.error(`  ${style.gray("Set LAZY_SKILL_API_URL if you are pointing at a local server.")}`);
    console.log();
    return 1;
  }

  console.log(bottom(theme));
  console.log();

  const qrLines = await renderQr(session.pairUrl);
  for (const line of qrLines) console.log(line);

  console.log(`  ${style.bold("Scan with the Lazy Skill app")}`);
  console.log(`  ${style.gray(session.pairUrl)}`);
  console.log();

  // --- wait for the phone ---------------------------------------------
  const deadline = Date.now() + session.expiresInMs;
  const waitSpinner = new Spinner(theme, messages.waiting()).start();

  let lastNudge = Date.now();
  let result: PollResponse = { status: "waiting" };

  while (Date.now() < deadline) {
    await sleep(1500);

    try {
      result = await api<PollResponse>("/api/pairing/poll", { body: { code: session.code } });
    } catch {
      // A dropped poll is not a failed pairing; keep trying until the code
      // actually expires.
      continue;
    }

    if (result.status !== "waiting") break;

    // Rotate the waiting line occasionally so a long wait stays alive.
    if (Date.now() - lastNudge > 12_000) {
      waitSpinner.update(messages.waiting());
      lastNudge = Date.now();
    }
  }

  waitSpinner.stop();

  if (result.status === "paired" && result.deviceToken) {
    updateConfig({
      deviceToken: result.deviceToken,
      deviceId: result.device?.id,
      deviceName: result.device?.name ?? deviceName(),
      connectedAt: new Date().toISOString(),
    });

    console.log(`  ${style.gray(">")} ${messages.scanned()} ${rgb(theme.support, "📱")}`);
    console.log(`  ${style.gray(">")} ${messages.authenticating()} ${style.green("✓")}`);
    console.log();

    console.log(top(theme));
    console.log(row(theme));
    for (const line of mascot(theme, true)) console.log(centered(theme, line));
    console.log(row(theme));
    console.log(centered(theme, rgb(theme.accent, style.bold(messages.connected()))));
    console.log(row(theme));
    printAgents(theme, agents);
    console.log(row(theme));
    console.log(centered(theme, style.dim(messages.signOff())));
    console.log(row(theme));
    console.log(bottom(theme));
    console.log();
    console.log(`  ${style.gray("Credential stored in ~/.lazyskill/config.json (0600).")}`);

    if (options.listen) {
      const { listenCommand } = await import("./listen.js");
      return listenCommand();
    }

    console.log(
      `  ${style.gray("Run")} ${rgb(theme.accent, "lazy-skill listen")} ${style.gray("to install from your phone.")}`
    );
    console.log();
    return 0;
  }

  const reason =
    result.status === "consumed"
      ? "That code was already used."
      : messages.expired();

  console.log(`  ${style.yellow("!")} ${reason}`);
  console.log(`  ${style.gray("Run")} ${rgb(theme.accent, "npx lazy-skill connect")} ${style.gray("for a fresh one.")}`);
  console.log();
  return 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
