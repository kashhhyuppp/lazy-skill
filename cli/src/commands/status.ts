import { api, ApiError } from "../lib/api.js";
import { readConfig } from "../lib/config.js";
import { detectAgents } from "../adapters/index.js";
import { THEMES, style } from "../ui/theme.js";
import { blank, line, muted, status, welcome } from "../ui/layout.js";

interface StatusResponse {
  ok: boolean;
  device: { id: string; name: string; platform: string; theme: string; detectedAgents: string[] };
}

export async function statusCommand(): Promise<number> {
  const config = readConfig();
  const theme = THEMES[config.theme];
  const agents = await detectAgents();

  blank();
  welcome(theme, "Lazy Skill");
  blank();

  if (!config.deviceToken) {
    status("computer", "off", "not connected");
    blank();
    muted("Run lazy-skill to pair.");
    blank();
    return 1;
  }

  // Detection is local and always shown. The round trip only confirms the
  // credential still works, so a network failure downgrades the report rather
  // than hiding what we already know.
  let reachable = false;
  let remoteError: string | null = null;
  try {
    await api<StatusResponse>("/api/cli/status", {
      authed: true,
      body: { detectedAgents: agents.filter((a) => a.detected).map((a) => a.id) },
    });
    reachable = true;
  } catch (err) {
    remoteError = err instanceof ApiError ? err.message : "Could not reach the server.";
  }

  line(style.bold(config.deviceName ?? "This computer"));
  status(
    "connection",
    reachable ? "ok" : "pending",
    reachable ? "connected" : "stored, server unreachable"
  );
  blank();

  for (const agent of agents) {
    status(agent.label, agent.detected ? "ok" : "off");
  }

  blank();
  if (remoteError) {
    muted(remoteError);
    blank();
  }
  return 0;
}
