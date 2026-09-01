/**
 * Turning a request into a command, safely.
 *
 * This module is the entire trust boundary for installation. A skill
 * reference may originate from a phone, a server, or a shell argument, so it
 * is validated against a strict pattern here and only ever emitted as a
 * distinct element of an argv array — never interpolated into a string.
 *
 * Nothing in this file executes anything. Building a plan and running one are
 * deliberately separate, so the dangerous part stays pure and testable.
 */

export type UpstreamAgentId =
  | "claude-code"
  | "codex"
  | "cursor"
  | "copilot"
  | "windsurf"
  | "gemini";

/** Agents the upstream installer accepts. Verified against skills@1.5.23. */
export const UPSTREAM_AGENTS: readonly UpstreamAgentId[] = [
  "claude-code",
  "codex",
  "cursor",
  "copilot",
  "windsurf",
  "gemini",
];

/**
 * The installer this CLI delegates to, pinned.
 *
 * Deliberately not a floating tag: an unpinned `npx` fetches and executes
 * whatever the registry serves at that moment. Bump this on purpose, after
 * looking at what changed.
 */
export const UPSTREAM_PACKAGE = "skills@1.5.23";

/**
 * A skill reference: `owner/repo`, optionally `owner/repo/skill`.
 *
 * Anchored, no dots, no leading dashes. That last part matters most: a
 * reference beginning with `-` would be read by the installer as a flag
 * rather than a package.
 */
const REF_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_-]*(?:\/[A-Za-z0-9_][A-Za-z0-9_.-]*){1,2}$/;

const MAX_REF_LENGTH = 200;

export class InvalidPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlanError";
  }
}

export function isValidSkillRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_REF_LENGTH &&
    REF_PATTERN.test(value) &&
    // Path traversal would escape the skills directory entirely.
    !value.includes("..")
  );
}

export function isUpstreamAgent(value: unknown): value is UpstreamAgentId {
  return typeof value === "string" && (UPSTREAM_AGENTS as readonly string[]).includes(value);
}

export interface InstallPlan {
  skillRef: string;
  agents: UpstreamAgentId[];
  /** Global installs land in ~/.agents/skills and symlink into each agent. */
  scope: "global" | "project";
}

/**
 * Validates a request into a plan. Throws rather than sanitising: a reference
 * we had to repair is a reference we do not understand, and quietly installing
 * something adjacent to what was asked for is worse than refusing.
 */
export function createInstallPlan(input: {
  skillRef: unknown;
  agents: unknown;
  scope?: unknown;
}): InstallPlan {
  if (!isValidSkillRef(input.skillRef)) {
    throw new InvalidPlanError(
      "That skill reference is not valid. Expected something like owner/repo."
    );
  }

  if (!Array.isArray(input.agents) || input.agents.length === 0) {
    throw new InvalidPlanError("No target agent was given.");
  }

  const agents: UpstreamAgentId[] = [];
  for (const agent of input.agents) {
    if (!isUpstreamAgent(agent)) {
      throw new InvalidPlanError(`Unknown agent "${String(agent)}".`);
    }
    if (!agents.includes(agent)) agents.push(agent);
  }

  const scope = input.scope === "project" ? "project" : "global";
  return { skillRef: input.skillRef, agents, scope };
}

/**
 * Splits a registry id into the package and skill the installer expects.
 *
 * A registry id is `{source}/{slug}`, and for GitHub sources the source is
 * itself `owner/repo` — so `skills-101/superpowers/ai-video-generation` means
 * the repo `skills-101/superpowers` and the single skill
 * `ai-video-generation`. Passing the whole id as the package makes the
 * installer look for a repository that does not exist, and it reports
 * "No valid skills found" rather than failing loudly.
 *
 * A two-segment id is a whole repository, so every skill in it is installed.
 */
export function splitSkillRef(skillRef: string): { pkg: string; skill: string } {
  const parts = skillRef.split("/");
  if (parts.length >= 3) {
    return { pkg: parts.slice(0, 2).join("/"), skill: parts.slice(2).join("/") };
  }
  return { pkg: skillRef, skill: "*" };
}

/**
 * The exact argv passed to the installer.
 *
 * Every element is either a fixed literal or a value already validated above,
 * and the runner spawns with `shell: false`, so no element is ever parsed by a
 * shell. `--` terminates option parsing so the reference cannot be read as a
 * flag even if the pattern above is ever loosened.
 */
export function buildInstallArgs(plan: InstallPlan): string[] {
  const { pkg, skill } = splitSkillRef(plan.skillRef);

  const args = [
    "--yes",
    UPSTREAM_PACKAGE,
    "add",
    "--agent",
    plan.agents.join(","),
    "--skill",
    skill,
    "--yes",
  ];

  if (plan.scope === "global") args.push("--global");

  args.push("--", pkg);
  return args;
}

/** What the user is shown before anything runs (§23). */
export function describePlan(plan: InstallPlan): string {
  return `npx ${buildInstallArgs(plan).join(" ")}`;
}
