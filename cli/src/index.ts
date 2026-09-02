#!/usr/bin/env node
import { isFirstRun, readConfig, updateConfig } from "./lib/config.js";
import { chooseTheme } from "./ui/onboarding.js";
import { THEMES, rgb, style } from "./ui/theme.js";
import { connectCommand } from "./commands/connect.js";
import { disconnectCommand } from "./commands/disconnect.js";
import { statusCommand } from "./commands/status.js";
import { skillsCommand } from "./commands/skills.js";
import { installCommand } from "./commands/install.js";
import { themeCommand } from "./commands/theme.js";
import { listenCommand } from "./commands/listen.js";
import { warnIfOutdated } from "./lib/version-check.js";

const VERSION = "0.7.0";

function help(): void {
  const theme = THEMES[readConfig().theme];
  const cmd = (name: string) => rgb(theme.accent, name.padEnd(26));

  console.log(`
  ${style.bold("LAZY")} ${rgb(theme.accent, style.bold("SKILL"))}${rgb(theme.support, " Zz")}   ${style.gray("See it. Search it. Install it.")}

  ${style.bold("Usage")}
    ${cmd("lazy-skill")}Connect, or listen if already paired
    ${cmd("lazy-skill connect")}Pair again, then wait for installs
    ${cmd("lazy-skill listen")}Wait for installs sent from your phone
    ${cmd("lazy-skill status")}Show connection and detected tools
    ${cmd("lazy-skill skills")}List skills installed on this computer
    ${cmd("lazy-skill disconnect")}Revoke this computer
    ${cmd("lazy-skill theme [id]")}Pick a colour theme
    ${cmd("lazy-skill install <ref>")}Install a skill locally

  ${style.bold("Options")}
    ${cmd("--agent=<ids>")}Comma-separated agents to install to
    ${cmd("--no-listen")}Pair only; do not wait for installs
    ${cmd("-p, --project")}Install into this project, not globally
    ${cmd("-y, --yes")}Skip the confirmation prompt
    ${cmd("-v, --verbose")}Show how each tool was detected
    ${cmd("-h, --help")}This
    ${cmd("--version")}Print the version

  ${style.gray("Config:")} ~/.lazyskill/config.json
  ${style.gray("Server:")} set LAZY_SKILL_API_URL to point at a different host
`);
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith("-")));
  const positional = argv.filter((a) => !a.startsWith("-"));
  const command = positional[0];

  if (flags.has("--version")) {
    console.log(VERSION);
    return 0;
  }
  if (flags.has("-h") || flags.has("--help") || command === "help") {
    help();
    return 0;
  }

  const verbose = flags.has("-v") || flags.has("--verbose");

  // Bare `npx lazy-skill` does the thing rather than printing a menu. The
  // product is one command, a QR, and you are done — making people discover a
  // subcommand first is the friction it exists to remove. An already-paired
  // computer skips straight to listening instead of pairing again.
  // Only for the long-running commands: a stale copy matters most when the
  // user is about to sit and wait for something that will never work.
  const longRunning = !command || command === "connect" || command === "listen";

  // Ask for a colour before anything is drawn, so the first thing the user
  // sees is already in their theme — and so the phone has something to adopt
  // when it pairs a moment later. Only on a genuinely first run, and never
  // for `theme`, which asks on its own.
  if (isFirstRun() && command !== "theme") {
    updateConfig({ theme: await chooseTheme(VERSION) });
  }

  if (longRunning) await warnIfOutdated(VERSION, THEMES[readConfig().theme]);

  if (!command) {
    if (readConfig().deviceToken) return listenCommand({ once: flags.has("--once") });
    return connectCommand({ verbose, listen: !flags.has("--no-listen") });
  }

  switch (command) {
    case "connect":
      return connectCommand({
        verbose,
        // Listening is the default; --no-listen opts out.
        listen: flags.has("--no-listen") ? false : true,
      });
    case "disconnect":
      return disconnectCommand();
    case "status":
      return statusCommand();
    case "listen":
      return listenCommand({ once: flags.has("--once") });
    case "skills":
      return skillsCommand();
    case "theme":
      return themeCommand(positional[1], VERSION);
    case "install": {
      const agentFlag = argv.find((a) => a.startsWith("--agent="))?.split("=")[1];
      const yes = flags.has("-y") || flags.has("--yes");
      const project = flags.has("-p") || flags.has("--project");
      return installCommand(positional[1], { agents: agentFlag, yes, project });
    }
    default:
      console.error(`\n  ${style.red("✗")} Unknown command "${command}".\n`);
      help();
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    // Never dump a stack at a user who just wanted to install something.
    console.error(`\n  ${style.red("✗")} ${(err as Error)?.message ?? "Something went wrong."}\n`);
    process.exit(1);
  });
