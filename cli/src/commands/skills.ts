import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homePath } from "../adapters/detect.js";
import { detectAgents } from "../adapters/index.js";
import { readConfig } from "../lib/config.js";
import { THEMES, style } from "../ui/theme.js";
import { blank, brand, line, muted, status } from "../ui/layout.js";

/**
 * Where each agent keeps installed skills. Read-only lookups — the CLI lists
 * what is on disk and never infers a skill that is not there.
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

  blank();
  brand(theme);
  blank();

  let total = 0;

  for (const agent of agents) {
    if (!agent.detected) {
      status(agent.label, "off");
      continue;
    }

    const skills = listSkillDirs(SKILL_DIRS[agent.id] ?? []);
    total += skills.length;

    status(agent.label, "ok", skills.length ? `${skills.length} installed` : "none installed");
    for (const skill of skills.slice(0, 12)) {
      line(style.gray(`     ${skill}`));
    }
    if (skills.length > 12) {
      line(style.gray(`     and ${skills.length - 12} more`));
    }
  }

  blank();
  if (total === 0) muted("Nothing installed yet. You haven't been lazy enough.");
  else muted(`${total} skill${total === 1 ? "" : "s"} across your tools.`);
  blank();
  return 0;
}
