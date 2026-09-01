import { api, ApiError } from "../lib/api.js";
import { clearCredentials, readConfig } from "../lib/config.js";
import { THEMES, style } from "../ui/theme.js";

export async function disconnectCommand(): Promise<number> {
  const config = readConfig();
  const theme = THEMES[config.theme];

  if (!config.deviceToken) {
    console.log(`\n  ${style.gray("Not connected. Nothing to disconnect.")}\n`);
    return 0;
  }

  let serverMessage = "";
  try {
    await api("/api/cli/disconnect", { authed: true });
  } catch (err) {
    // The local credential is cleared regardless. Leaving a token on disk
    // because the network was down would be the worse failure.
    serverMessage =
      err instanceof ApiError
        ? `Server not notified (${err.code}). Revoke the device from the app if needed.`
        : "Server not notified.";
  }

  clearCredentials();

  console.log(`\n  ${style.green("✓")} Disconnected. Theme kept.`);
  if (serverMessage) console.log(`  ${style.yellow("!")} ${serverMessage}`);
  console.log(`  ${style.gray("Run")} npx lazy-skill connect ${style.gray("to pair again.")}\n`);
  void theme;
  return 0;
}
