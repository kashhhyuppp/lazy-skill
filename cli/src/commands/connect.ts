import { hostname, platform, release } from "node:os";
import { api, ApiError } from "../lib/api.js";
import { readConfig, updateConfig } from "../lib/config.js";
import { detectAgents, type AgentStatus } from "../adapters/index.js";
import { THEMES, style, type Theme } from "../ui/theme.js";
import { boxWidth, visibleWidth } from "../ui/layout.js";
import { renderQr } from "../ui/qr.js";
import { blank, box, centre, fail, hint, line, muted, ok, status, welcome } from "../ui/layout.js";
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

function printAgents(agents: AgentStatus[]): void {
  for (const agent of agents) {
    status(agent.label, agent.detected ? "ok" : "off");
  }
}

export async function connectCommand(options: {
  verbose: boolean;
  listen?: boolean;
}): Promise<number> {
  const config = readConfig();
  const theme: Theme = THEMES[config.theme];

  blank();
  welcome(theme, "Welcome to Lazy Skill!");
  blank();
  hint("See it. Search it. Install it.");
  blank();

  // Detection runs before anything is drawn: a spinner writes to the current
  // line, and anything transient printed mid-layout tears it.
  const spinner = new Spinner(theme, "looking for your AI tools").start();
  const agents = await detectAgents();
  const detectedIds = agents.filter((a) => a.detected).map((a) => a.id);
  spinner.stop();

  printAgents(agents);

  if (options.verbose) {
    blank();
    for (const agent of agents) {
      if (agent.evidence) muted(`  ${agent.label}: ${agent.evidence}`);
    }
  }

  blank();

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
    fail(err instanceof ApiError ? err.message : messages.failed());
    muted("Set LAZY_SKILL_API_URL to point at a different server.");
    blank();
    return 1;
  }

  hint("Open Lazy Skill on your phone and scan this.");
  blank();

  // The QR is the one thing to act on, so it gets the box. Its own quiet zone
  // sits inside the border, untouched.
  const plate = await renderQr(session.pairUrl);
  const width = plate.length ? visibleWidth(plate[0]) + 4 : boxWidth();
  box(theme, plate.map((row) => centre(row, width)), width);

  blank();
  muted(session.pairUrl);
  blank();

  const deadline = Date.now() + session.expiresInMs;
  const waiting = new Spinner(theme, "waiting for scan").start();

  let nudgedAt = Date.now();
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

    if (Date.now() - nudgedAt > 15_000) {
      waiting.update(messages.waiting());
      nudgedAt = Date.now();
    }
  }

  waiting.stop();

  if (result.status === "paired" && result.deviceToken) {
    updateConfig({
      deviceToken: result.deviceToken,
      deviceId: result.device?.id,
      deviceName: result.device?.name ?? deviceName(),
      connectedAt: new Date().toISOString(),
    });

    ok(style.bold("Connected"));
    line(style.gray(result.device?.name ?? deviceName()));
    blank();

    if (options.listen === false) {
      muted("Run lazy-skill when you want to install from your phone.");
      blank();
      return 0;
    }

    const { listenCommand } = await import("./listen.js");
    return listenCommand();
  }

  if (result.status === "consumed") {
    fail("That code was already used.");
  } else {
    fail(messages.expired());
  }
  muted("Run lazy-skill for a fresh one.");
  blank();
  return 1;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
