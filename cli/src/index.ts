#!/usr/bin/env node
import { readConfig } from "./lib/config.js";
import { THEMES, rgb, style } from "./ui/theme.js";
import { connectCommand } from "./commands/connect.js";
import { disconnectCommand } from "./commands/disconnect.js";
import { statusCommand } from "./commands/status.js";
import { skillsCommand } from "./commands/skills.js";
import { installCommand } from "./commands/install.js";
import { themeCommand } from "./commands/theme.js";
import { listenCommand } from "./commands/listen.js";

const VERSION = "0.1.0";

function help(): void {
  const theme = THEMES[readConfig().theme];
  const cmd = (name: string) => rgb(theme.accent, name.padEnd(24));

  console.log(`
  ${style.bold("LAZY")} ${rgb(theme.accent, style.bold("SKILL"))}${rgb(theme.support, " Zz")}   ${style.gray("See it. Search it. Install it.")}

  ${style.bold("Usage")}
    ${cmd("lazy-skill connect")}Pair this computer with the app
    ${cmd("lazy-skill listen")}Wait for installs sent from your phone
    ${cmd("lazy-skill status")}Show connection and detected tools
    ${cmd("lazy-skill skills")}List skills installed on this computer
    ${cmd("lazy-skill disconnect")}Revoke this computer
    ${cmd("lazy-skill theme [id]")}Pick a colour theme
    ${cmd("lazy-skill install <ref>")}Install a skill locally

  ${style.bold("Options")}
    ${cmd("--agent=<ids>")}Comma-separated agents to install to
    ${cmd("--listen")}After connecting, keep waiting for installs
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
  if (!command || flags.has("-h") || flags.has("--help") || command === "help") {
    help();
    return 0;
  }

  const verbose = flags.has("-v") || flags.has("--verbose");

  switch (command) {
    case "connect":
      return connectCommand({ verbose, listen: flags.has("--listen") });
    case "disconnect":
      return disconnectCommand();
    case "status":
      return statusCommand();
    case "listen":
      return listenCommand({ once: flags.has("--once") });
    case "skills":
      return skillsCommand();
    case "theme":
      return themeCommand(positional[1]);
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
