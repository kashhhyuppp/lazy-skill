import { api, ApiError } from "../lib/api.js";
import { readConfig } from "../lib/config.js";
import { detectAgents } from "../adapters/index.js";
import { THEMES, style } from "../ui/theme.js";
import { bottom, centered, row, statusLine, top, wordmark } from "../ui/box.js";

interface StatusResponse {
  ok: boolean;
  device: { id: string; name: string; platform: string; theme: string; detectedAgents: string[] };
}

export async function statusCommand(): Promise<number> {
  const config = readConfig();
  const theme = THEMES[config.theme];
  const agents = await detectAgents();

  console.log();
  console.log(top(theme));
  console.log(row(theme));
  for (const line of wordmark(theme)) console.log(centered(theme, line));
  console.log(row(theme));

  if (!config.deviceToken) {
    console.log(row(theme, style.gray("Not connected.")));
    console.log(row(theme));
    console.log(row(theme, `Run ${style.bold("npx lazy-skill connect")}`));
    console.log(row(theme));
    console.log(bottom(theme));
    console.log();
    return 1;
  }

  // Detection is local and always shown. The server round trip only confirms
  // the credential is still good, so a network failure downgrades the report
  // rather than hiding what we do know.
  let remote: StatusResponse | null = null;
  let remoteError: string | null = null;
  try {
    remote = await api<StatusResponse>("/api/cli/status", {
      authed: true,
      body: { detectedAgents: agents.filter((a) => a.detected).map((a) => a.id) },
    });
  } catch (err) {
    remoteError = err instanceof ApiError ? err.message : "Could not reach the server.";
  }

  console.log(row(theme, `${style.bold(config.deviceName ?? "This computer")}`));
  console.log(
    row(
      theme,
      remote
        ? `${style.green("●")} Connected`
        : `${style.yellow("●")} Credential stored, server unreachable`
    )
  );
  console.log(row(theme));

  for (const agent of agents) {
    console.log(row(theme, statusLine(agent.label, agent.detected ? true : null)));
  }

  console.log(row(theme));
  console.log(bottom(theme));

  if (remoteError) {
    console.log();
    console.log(`  ${style.gray(remoteError)}`);
  }
  console.log();
  return 0;
}
