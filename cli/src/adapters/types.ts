export type AgentId = "claude" | "codex" | "cursor";

export interface DetectionResult {
  detected: boolean;
  /** How it was found, shown under -v so detection is auditable. */
  evidence?: string;
}

/**
 * One adapter per agent (§22). Detection, compatibility, installation and
 * status live together and stay isolated, so adding an agent later means
 * adding a file rather than editing a switch statement.
 *
 * Phase 5 implements detection only. Installation arrives in Phase 7.
 */
export interface AgentAdapter {
  readonly id: AgentId;
  readonly label: string;
  detect(): Promise<DetectionResult>;
}
