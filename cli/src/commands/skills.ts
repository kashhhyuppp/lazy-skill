import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homePath } from "../adapters/detect.js";
import { detectAgents } from "../adapters/index.js";
import { readConfig } from "../lib/config.js";
import { THEMES, style } from "../ui/theme.js";
import { bottom, centered, row, top, wordmark } from "../ui/box.js";

/**
 * Where each agent keeps installed skills. These are read-only lookups — the
 * CLI lists what is on disk and never infers a skill that is not there.
 */
const SKILL_DIRS: Record<string, string[]> = {
  claude: [homePath(".claude", "skills")],
  codex: [homePath(".codex", "skills")],
  cursor: [homePath(".cursor", "skills")],
};

function listSkillDirs(paths: string[]): string[] {
  const found = new Set<string>();
  for (const path of paths) {
    try {
      for (const entry of readdirSync(path)) {
        if (entry.startsWith(".")) continue;
        try {
          if (statSync(join(path, entry)).isDirectory()) found.add(entry);
        } catch {
          // Unreadable entry — skip rather than guess.
        }
      }
    } catch {
      // Directory absent: the agent simply has no skills installed here.
    }
  }
  return [...found].sort();
}

export async function skillsCommand(): Promise<number> {
  const theme = THEMES[readConfig().theme];
  const agents = await detectAgents();

  console.log();
  console.log(top(theme));
  console.log(row(theme));
  for (const line of wordmark(theme)) console.log(centered(theme, line));
  console.log(row(theme));
  console.log(row(theme, style.bold("Installed skills on this computer")));
  console.log(row(theme));

  let total = 0;

  for (const agent of agents) {
    if (!agent.detected) {
      console.log(row(theme, `${agent.label.padEnd(10)} ${style.gray("not detected")}`));
      continue;
    }

    const skills = listSkillDirs(SKILL_DIRS[agent.id] ?? []);
    total += skills.length;

    console.log(
      row(
        theme,
        `${style.bold(agent.label.padEnd(10))} ${
          skills.length ? style.green(`${skills.length}`) : style.gray("none found")
        }`
      )
    );
    for (const skill of skills.slice(0, 20)) {
      console.log(row(theme, style.gray(`  · ${skill}`)));
    }
    if (skills.length > 20) {
      console.log(row(theme, style.gray(`  … and ${skills.length - 20} more`)));
    }
  }

  console.log(row(theme));
  if (total === 0) {
    console.log(row(theme, style.gray("Nothing installed yet. You haven't been lazy enough.")));
    console.log(row(theme));
  }
  console.log(bottom(theme));
  console.log();
  return 0;
}
