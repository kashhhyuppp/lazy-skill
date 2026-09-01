import type { InstallPlan, UpstreamAgentId } from "./install-plan.js";
import type { InstallOutcome, InstallProgress } from "./runner.js";

export type AgentId = "claude" | "codex" | "cursor";

export interface DetectionResult {
  detected: boolean;
  /** How it was found, shown under -v so detection is auditable. */
  evidence?: string;
}

/**
 * One adapter per agent (§22): detection, compatibility, installation and
 * status live together and stay isolated, so adding an agent later means
 * adding a file rather than editing a switch statement.
 */
export interface AgentAdapter {
  readonly id: AgentId;
  readonly label: string;
  /** The identifier the upstream installer expects, which differs from ours. */
  readonly upstreamId: UpstreamAgentId;
  /** Where this agent reads its installed skills from. */
  skillsDir(): string;

  detect(): Promise<DetectionResult>;
  install(
    plan: InstallPlan,
    onProgress: (progress: InstallProgress) => void
  ): Promise<InstallOutcome>;
}

export type { InstallPlan, UpstreamAgentId } from "./install-plan.js";
export type { InstallOutcome, InstallProgress } from "./runner.js";
