/**
 * The device's own copy of the command vocabulary.
 *
 * Duplicated from the server on purpose. A device must not depend on the
 * server for its definition of what is safe to run: if the server is
 * compromised, the only thing standing between it and the user's machine is
 * this file. A test asserts the two copies stay identical.
 */

export const JOB_COMMANDS = [
  "INSTALL_SKILL",
  "CHECK_STATUS",
  "LIST_SKILLS",
  "DISCONNECT",
] as const;

export type JobCommand = (typeof JOB_COMMANDS)[number];

export const JOB_STAGES = [
  "starting",
  "downloading",
  "installing",
  "verifying",
  "done",
  "failed",
] as const;

export type JobStage = (typeof JOB_STAGES)[number];

export const JOB_AGENTS = ["claude", "codex", "cursor"] as const;
export type JobAgent = (typeof JOB_AGENTS)[number];

export interface InstallSkillPayload {
  skillRef: string;
  skillName: string;
  agents: JobAgent[];
  scope: "global" | "project";
}

export const SKILL_REF_PATTERN =
  /^[A-Za-z0-9_][A-Za-z0-9_-]*(?:\/[A-Za-z0-9_][A-Za-z0-9_.-]*){1,2}$/;

export const MAX_SKILL_REF_LENGTH = 200;

export class UnsafeJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeJobError";
  }
}

export function isJobCommand(value: unknown): value is JobCommand {
  return typeof value === "string" && (JOB_COMMANDS as readonly string[]).includes(value);
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
 * Validates a payload the server sent. Everything the server says is treated
 * as a suggestion until it passes this.
 */
export function parseInstallPayload(input: unknown): InstallSkillPayload {
  const raw = (input ?? {}) as Record<string, unknown>;

  if (!isValidSkillRef(raw.skillRef)) {
    throw new UnsafeJobError("The server sent an invalid skill reference.");
  }

  if (!Array.isArray(raw.agents) || raw.agents.length === 0 || raw.agents.length > 6) {
    throw new UnsafeJobError("The server sent no usable target agents.");
  }

  const agents: JobAgent[] = [];
  for (const agent of raw.agents) {
    if (!isJobAgent(agent)) {
      throw new UnsafeJobError(`The server sent an unknown agent "${String(agent)}".`);
    }
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
