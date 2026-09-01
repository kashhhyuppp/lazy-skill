/**
 * The device command vocabulary.
 *
 * This is the whole surface the server can ask a device to do. It is a fixed
 * list of named operations with structured parameters — never a command line,
 * never a path, never a flag. A compromised server can queue a different
 * INSTALL_SKILL, but it cannot express anything outside this file (§56).
 *
 * The CLI carries its own copy and validates independently. A test asserts the
 * two stay identical; they are duplicated rather than shared because the CLI
 * ships as a separate package, and a device must not depend on the server for
 * its definition of what is safe.
 */

export const JOB_COMMANDS = [
  "INSTALL_SKILL",
  "CHECK_STATUS",
  "LIST_SKILLS",
  "DISCONNECT",
] as const;

export type JobCommand = (typeof JOB_COMMANDS)[number];

export const JOB_STATUSES = [
  "queued",
  "claimed",
  "running",
  "succeeded",
  "failed",
  "expired",
  "cancelled",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STAGES = [
  "starting",
  "downloading",
  "installing",
  "verifying",
  "done",
  "failed",
] as const;

export type JobStage = (typeof JOB_STAGES)[number];

/** Agent ids as the CLI's adapters know them. */
export const JOB_AGENTS = ["claude", "codex", "cursor"] as const;
export type JobAgent = (typeof JOB_AGENTS)[number];

/**
 * Payload for INSTALL_SKILL. Note what is absent: no path, no destination, no
 * flags, no version. Scope is a two-value enum, not a directory.
 */
export interface InstallSkillPayload {
  skillRef: string;
  skillName: string;
  agents: JobAgent[];
  scope: "global" | "project";
}

/** Mirrors cli/src/adapters/install-plan.ts. Both must agree. */
export const SKILL_REF_PATTERN =
  /^[A-Za-z0-9_][A-Za-z0-9_-]*(?:\/[A-Za-z0-9_][A-Za-z0-9_.-]*){1,2}$/;

export const MAX_SKILL_REF_LENGTH = 200;

export function isJobCommand(value: unknown): value is JobCommand {
  return typeof value === "string" && (JOB_COMMANDS as readonly string[]).includes(value);
}

export function isJobStage(value: unknown): value is JobStage {
  return typeof value === "string" && (JOB_STAGES as readonly string[]).includes(value);
}

export function isJobAgent(value: unknown): value is JobAgent {
  return typeof value === "string" && (JOB_AGENTS as readonly string[]).includes(value);
}

export function isValidSkillRef(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_SKILL_REF_LENGTH &&
    SKILL_REF_PATTERN.test(value) &&
    !value.includes("..")
  );
}

/**
 * Validates an INSTALL_SKILL payload. Throws rather than repairing — a payload
 * we had to fix is a payload we did not understand.
 */
export function parseInstallPayload(input: unknown): InstallSkillPayload {
  const raw = (input ?? {}) as Record<string, unknown>;

  if (!isValidSkillRef(raw.skillRef)) {
    throw new Error("Invalid skill reference.");
  }

  if (!Array.isArray(raw.agents) || raw.agents.length === 0 || raw.agents.length > 6) {
    throw new Error("No target agents.");
  }

  const agents: JobAgent[] = [];
  for (const agent of raw.agents) {
    if (!isJobAgent(agent)) throw new Error(`Unknown agent "${String(agent)}".`);
    if (!agents.includes(agent)) agents.push(agent);
  }

  const skillName =
    typeof raw.skillName === "string" && raw.skillName.trim()
      ? raw.skillName.trim().slice(0, 200)
      : raw.skillRef;

  return {
    skillRef: raw.skillRef,
    skillName,
    agents,
    scope: raw.scope === "project" ? "project" : "global",
  };
}
